import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/broadcasts — history of broadcasts
export async function GET(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const status = url.searchParams.get('status') || undefined

  const where: any = {}
  if (status) where.status = status

  const items = await db.broadcast.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      channel: true,
      digest: { select: { id: true, title: true, coverStyle: true } },
    },
  })
  return NextResponse.json({ total: items.length, items })
}
