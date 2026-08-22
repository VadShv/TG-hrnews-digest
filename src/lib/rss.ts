import Parser from 'rss-parser'
import crypto from 'crypto'
import { db } from './db'
import { guessCategory, estimateReadingTime } from './hr'
import { embedArticle } from './llm'

const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'HR-Pulse/1.0' } })

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

export interface FetchResult {
  feedId: string
  feedName: string
  added: number
  errors: string[]
}

/// Fetch a single RSS feed via RSSHub, parse, dedup, upsert articles, and embed.
export async function fetchFeed(feed: {
  id: string
  name: string
  rsshubRoute: string
  category: string | null
}): Promise<FetchResult> {
  const base = (process.env.RSSHUB_BASE_URL || 'http://localhost:1200').replace(/\/$/, '')
  const route = feed.rsshubRoute.replace(/^\//, '')
  const url = `${base}/${route}`

  try {
    const parsed = await parser.parseURL(url)
    let added = 0
    const errors: string[] = []

    for (const item of parsed.items) {
      try {
        const link = item.link || item.guid
        if (!link || !item.title) continue

        const rawSnippet = item.contentSnippet || item.summary || item.content || item.title
        const snippet = stripHtml(String(rawSnippet)).slice(0, 500)
        const contentHash = crypto
          .createHash('sha256')
          .update(`${item.title}|${snippet}`)
          .digest('hex')
          .slice(0, 16)

        // dedup by url
        const existing = await db.newsArticle.findUnique({ where: { url: link } })
        if (existing) continue

        const created = await db.newsArticle.create({
          data: {
            title: item.title,
            url: link,
            snippet,
            source: safeHostname(link),
            publishedAt: item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null,
            category: feed.category || guessCategory(item.title, snippet),
            readingTime: estimateReadingTime(snippet || item.title),
            contentHash,
            sourceType: 'rss',
            language: 'ru',
          },
        })

        // Embed async (best-effort, non-blocking)
        embedArticle(created.id, created.title, created.snippet).catch(() => undefined)
        added++
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
    }

    await db.feed.update({
      where: { id: feed.id },
      data: { lastFetchedAt: new Date(), lastError: errors.length ? errors.join('; ') : null },
    })

    return { feedId: feed.id, feedName: feed.name, added, errors }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await db.feed.update({
      where: { id: feed.id },
      data: { lastFetchedAt: new Date(), lastError: msg },
    })
    return { feedId: feed.id, feedName: feed.name, added: 0, errors: [msg] }
  }
}

/// Fetch all feeds that are due for polling.
export async function fetchDueFeeds(): Promise<FetchResult[]> {
  const feeds = await db.feed.findMany({ where: { active: true } })
  const now = Date.now()
  const due = feeds.filter((f) => {
    if (!f.lastFetchedAt) return true
    return now - f.lastFetchedAt.getTime() > f.intervalMin * 60 * 1000
  })
  const results: FetchResult[] = []
  for (const feed of due) {
    const r = await fetchFeed(feed).catch(() => ({
      feedId: feed.id,
      feedName: feed.name,
      added: 0,
      errors: ['unknown'],
    }))
    results.push(r)
  }
  return results
}
