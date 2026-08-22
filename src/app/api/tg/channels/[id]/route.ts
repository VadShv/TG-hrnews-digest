import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enqueueChannelScan } from '@/lib/broadcast'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// PATCH /api/tg/channels/[id]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['chatId', 'title', 'category']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (typeof body.active === 'boolean') data.active = body.active
  const updated = await db.tgChannel.update({ where: { id }, data })
  return NextResponse.json({ item: updated })
}

/// DELETE /api/tg/channels/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  await db.tgChannel.delete({ where: { id } }).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
