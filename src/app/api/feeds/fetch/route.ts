import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchFeed } from '@/lib/rss'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// POST /api/feeds/fetch — manually trigger a feed fetch (body: { feedId } or fetch all due)
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json().catch(() => ({}))
  if (body.feedId) {
    const feed = await db.feed.findUnique({ where: { id: body.feedId } })
    if (!feed) return NextResponse.json({ error: 'Фид не найден' }, { status: 404 })
    const result = await fetchFeed(feed)
    return NextResponse.json({ results: [result] })
  }
  // Fetch all due feeds
  const { fetchDueFeeds } = await import('@/lib/rss')
  const results = await fetchDueFeeds()
  return NextResponse.json({ results })
}
