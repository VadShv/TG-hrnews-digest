import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enqueueChannelScan } from '@/lib/broadcast'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/tg/channels — list TG scan-source channels
export async function GET() {
  const { response } = await getSessionOr401()
  if (response) return response

  const items = await db.tgChannel.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ total: items.length, items })
}

/// POST /api/tg/channels — add a TG channel to scan
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json()
  if (!body.chatId) {
    return NextResponse.json({ error: 'chatId обязателен' }, { status: 400 })
  }
  const created = await db.tgChannel.create({
    data: {
      chatId: body.chatId,
      title: body.title || null,
      category: body.category || null,
      active: body.active ?? true,
    },
  })
  return NextResponse.json({ item: created })
}
