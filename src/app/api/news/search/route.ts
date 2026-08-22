import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hybridSearch, type SearchOptions } from '@/lib/search'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// POST /api/news/search — hybrid search over the corpus (replaces ZAI web_search).
/// Results are already in the library (ingested via RSS/TG).
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const query = (body.query || '').trim()
  if (!query) {
    return NextResponse.json({ error: 'Пустой поисковый запрос' }, { status: 400 })
  }

  const opts: SearchOptions = {
    limit: Math.min(body.num ?? 24, 100),
    mode: body.mode || 'hybrid',
  }
  if (body.category && body.category !== 'all') opts.category = body.category
  if (body.starred) opts.starred = true

  const hits = await hybridSearch(query, opts)

  // Audit log (best-effort)
  await db.searchQuery
    .create({ data: { query, category: body.category ?? null, resultCount: hits.length } })
    .catch(() => undefined)

  const results = hits.map((h) => ({
    id: h.id,
    url: h.url,
    title: h.title,
    snippet: h.snippet,
    source: h.source,
    date: h.publishedAt,
    category: h.category,
    readingTime: h.readingTime,
    summary: h.summary,
    semScore: h.semScore,
    ftsScore: h.ftsScore,
    score: h.score,
    inLibrary: true,
  }))

  return NextResponse.json({ query, total: results.length, results, savedIds: [] })
}

/// GET /api/news/search — recent search history
export async function GET() {
  const { response } = await getSessionOr401()
  if (response) return response

  const recent = await db.searchQuery.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
  return NextResponse.json({ history: recent })
}
