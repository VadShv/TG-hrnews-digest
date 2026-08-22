import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hybridSearch, type SearchOptions } from '@/lib/search'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// POST /api/search — hybrid search over the article corpus.
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json().catch(() => ({}))
  const query = (body.query || '').trim()
  if (!query) {
    return NextResponse.json({ error: 'Пустой поисковый запрос' }, { status: 400 })
  }

  const opts: SearchOptions = {
    limit: Math.min(body.limit ?? 24, 100),
    mode: body.mode || 'hybrid',
  }
  if (body.category && body.category !== 'all') opts.category = body.category
  if (body.sourceType && body.sourceType !== 'all') opts.sourceType = body.sourceType
  if (body.starred) opts.starred = true

  const results = await hybridSearch(query, opts)

  // Audit log (best-effort)
  await db.searchQuery
    .create({ data: { query, category: body.category ?? null, resultCount: results.length } })
    .catch(() => undefined)

  return NextResponse.json({ query, total: results.length, results })
}

/// GET /api/search — recent search history
export async function GET() {
  const { response } = await getSessionOr401()
  if (response) return response

  const recent = await db.searchQuery.findMany({ orderBy: { createdAt: 'desc' }, take: 20 })
  return NextResponse.json({ history: recent })
}
