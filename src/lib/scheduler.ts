import cron from 'node-cron'
import { db } from './db'
import { fetchDueFeeds } from './rss'
import { broadcastDigest, enqueueChannelScan } from './broadcast'
import { embedArticle } from './llm'

let started = false

/// Start background schedulers: RSS polling, digest auto-send, TG channel scanning.
/// Safe to call multiple times — only starts once.
export function startScheduler() {
  if (started) return
  started = true
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
    console.log('[scheduler] Starting background jobs...')
    cron.schedule('*/10 * * * *', runRssPoll, { name: 'rss-poll' })
    cron.schedule('* * * * *', runDigestAutoSend, { name: 'digest-auto' })
    cron.schedule('*/30 * * * *', runChannelScan, { name: 'tg-scan' })
    cron.schedule('*/5 * * * *', runEmbedPending, { name: 'embed-pending' })
  } else {
    console.log('[scheduler] Disabled in development (set ENABLE_SCHEDULER=true to enable)')
  }
}

/// Poll due RSS feeds.
async function runRssPoll() {
  try {
    const results = await fetchDueFeeds()
    const total = results.reduce((s, r) => s + r.added, 0)
    if (total > 0) console.log(`[scheduler] RSS: +${total} articles from ${results.length} feeds`)
  } catch (e) {
    console.error('[scheduler] RSS poll error:', e instanceof Error ? e.message : e)
  }
}

/// Auto-send scheduled digests based on bot.schedule (HH:MM) + bot.frequency.
async function runDigestAutoSend() {
  try {
    const settings = await db.botSetting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) map[s.key] = s.value

    const schedule = map['bot.schedule'] || '09:00'
    const frequency = map['bot.frequency'] || 'daily'
    const [hh, mm] = schedule.split(':').map((x) => parseInt(x))

    const now = new Date()
    if (now.getHours() !== hh || now.getMinutes() !== mm) return

    // Frequency check
    const dow = now.getDay() // 0=Sun..6=Sat
    if (frequency === 'weekdays' && (dow === 0 || dow === 6)) return
    if (frequency === 'weekly' && dow !== 1) return

    const digests = await db.digest.findMany({ where: { scheduleEnabled: true } })
    for (const d of digests) {
      // Avoid double-run on the same day
      if (d.lastRunAt && sameDay(d.lastRunAt, now)) continue
      const channelIds = (d.autoChannelIds as string[] | null) || []
      if (channelIds.length === 0) continue
      try {
        await broadcastDigest(d.id, channelIds)
        await db.digest.update({ where: { id: d.id }, data: { lastRunAt: now } })
        console.log(`[scheduler] Auto-sent digest "${d.title}" to ${channelIds.length} channels`)
      } catch (e) {
        console.error(`[scheduler] Auto-send failed for "${d.title}":`, e instanceof Error ? e.message : e)
      }
    }
  } catch (e) {
    console.error('[scheduler] Digest auto-send error:', e instanceof Error ? e.message : e)
  }
}

/// Scan active TG channels for new articles.
async function runChannelScan() {
  try {
    const session = await db.tgSession.findFirst()
    if (!session || session.status !== 'active') return

    const channels = await db.tgChannel.findMany({ where: { active: true } })
    for (const ch of channels) {
      await enqueueChannelScan(ch.id, ch.chatId, ch.lastMessageId)
    }
    if (channels.length > 0) console.log(`[scheduler] Enqueued ${channels.length} TG channel scans`)
  } catch (e) {
    console.error('[scheduler] Channel scan error:', e instanceof Error ? e.message : e)
  }
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/// Embed articles that don't have vectors yet (from RSS/TG ingestion).
async function runEmbedPending() {
  try {
    const pending = await db.newsArticle.findMany({
      where: { embedded: false, archived: false },
      take: 20,
      select: { id: true, title: true, snippet: true },
    })
    if (pending.length === 0) return
    for (const a of pending) {
      await embedArticle(a.id, a.title, a.snippet).catch(() => undefined)
    }
    console.log(`[scheduler] Embedded ${pending.length} articles`)
  } catch (e) {
    console.error('[scheduler] Embed error:', e instanceof Error ? e.message : e)
  }
}
