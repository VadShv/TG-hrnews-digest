import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { guessCategory, estimateReadingTime } from '@/lib/hr'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/news — list the library with filters.
export async function GET(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const url = new URL(req.url)
  const category = url.searchParams.get('category') || undefined
  const starred = url.searchParams.get('starred') === '1' ? true : undefined
  const archived = url.searchParams.get('archived') === '1' ? true : undefined
  const q = url.searchParams.get('q') || undefined
  const sort = url.searchParams.get('sort') || 'newest'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 500)

  const where: any = { archived: archived ?? false }
  if (category) where.category = category
  if (starred !== undefined) where.starred = starred
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { snippet: { contains: q } },
      { source: { contains: q } },
    ]
  }

  const orderBy: any =
    sort === 'oldest'
      ? { createdAt: 'asc' }
      : sort === 'title'
        ? { title: 'asc' }
        : sort === 'starred'
          ? [{ starred: 'desc' as const }, { createdAt: 'desc' as const }]
          : { createdAt: 'desc' }

  const items = await db.newsArticle.findMany({ where, orderBy, take: limit })
  return NextResponse.json({ total: items.length, items })
}

/// POST /api/news — save a single article into the library (upsert by url).
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json()
  const url: string = body.url
  if (!url || !body.title) {
    return NextResponse.json({ error: 'url и title обязательны' }, { status: 400 })
  }
  const created = await db.newsArticle.upsert({
    where: { url },
    update: {
      title: body.title,
      snippet: body.snippet ?? '',
      source: body.source ?? safeHostname(url),
      author: body.author ?? null,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      category: body.category || guessCategory(body.title, body.snippet || ''),
      tags: body.tags ?? null,
      imageUrl: body.imageUrl ?? null,
      readingTime: body.readingTime ?? estimateReadingTime(body.snippet || body.title),
    },
    create: {
      title: body.title,
      url,
      snippet: body.snippet || '',
      source: body.source ?? safeHostname(url),
      author: body.author ?? null,
      publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      category: body.category || guessCategory(body.title, body.snippet || ''),
      tags: body.tags ?? null,
      imageUrl: body.imageUrl ?? null,
      readingTime: body.readingTime ?? estimateReadingTime(body.snippet || body.title),
      language: body.language ?? 'ru',
      sourceType: body.sourceType ?? 'manual',
    },
  })
  return NextResponse.json({ item: created })
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}
