import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/feeds — list RSS feeds
export async function GET() {
  const { response } = await getSessionOr401()
  if (response) return response

  const items = await db.feed.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ total: items.length, items })
}

/// POST /api/feeds — create a feed
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json()
  if (!body.name || !body.rsshubRoute) {
    return NextResponse.json({ error: 'name и rsshubRoute обязательны' }, { status: 400 })
  }
  const created = await db.feed.create({
    data: {
      name: body.name,
      rsshubRoute: body.rsshubRoute,
      category: body.category || null,
      active: body.active ?? true,
      intervalMin: body.intervalMin ?? 60,
    },
  })
  return NextResponse.json({ item: created })
}
