import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/digests — list digests with item count
export async function GET(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const q = url.searchParams.get('q') || undefined
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)

  const where: any = {}
  if (status) where.status = status
  if (q) where.title = { contains: q }

  const items = await db.digest.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: { _count: { select: { items: true, broadcasts: true } } },
  })
  return NextResponse.json({ total: items.length, items })
}

/// POST /api/digests — create a new digest
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json()
  const title: string = (body.title || 'Новый дайджест').trim()
  const created = await db.digest.create({
    data: {
      title,
      subtitle: body.subtitle ?? null,
      intro: body.intro ?? null,
      outro: body.outro ?? null,
      status: body.status || 'draft',
      coverStyle: body.coverStyle || 'emerald',
      tone: body.tone || 'professional',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
      scheduleCron: body.scheduleCron ?? null,
      scheduleEnabled: body.scheduleEnabled ?? false,
      autoChannelIds: body.autoChannelIds ?? null,
    },
  })
  return NextResponse.json({ item: created })
}
