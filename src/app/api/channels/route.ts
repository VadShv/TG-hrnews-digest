import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/channels
export async function GET(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const url = new URL(req.url)
  const activeOnly = url.searchParams.get('active') === '1'
  const items = await db.channel.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { broadcasts: true } } },
  })
  return NextResponse.json({ total: items.length, items })
}

/// POST /api/channels
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json()
  if (!body.name || !body.type) {
    return NextResponse.json({ error: 'name и type обязательны' }, { status: 400 })
  }
  const created = await db.channel.create({
    data: {
      name: body.name,
      type: body.type,
      target: body.target || '',
      config: body.config ? JSON.stringify(body.config) : null,
      description: body.description || null,
      active: body.active ?? true,
      subscriberCount: body.subscriberCount ?? 0,
      avatarColor: body.avatarColor || 'emerald',
    },
  })
  return NextResponse.json({ item: created })
}
