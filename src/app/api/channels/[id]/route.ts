import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// PATCH /api/channels/[id]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['name', 'type', 'target', 'description', 'avatarColor', 'subscriberCount']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (typeof body.active === 'boolean') data.active = body.active
  if (body.config !== undefined) data.config = body.config ? JSON.stringify(body.config) : null

  const updated = await db.channel.update({ where: { id }, data })
  return NextResponse.json({ item: updated })
}

/// DELETE /api/channels/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  await db.channel.delete({ where: { id } }).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
