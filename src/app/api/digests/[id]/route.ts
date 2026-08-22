import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { renderDigestMessage } from '@/lib/zai'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/digests/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  const item = await db.digest.findUnique({
    where: { id },
    include: {
      items: { orderBy: { position: 'asc' }, include: { article: true } },
      broadcasts: { orderBy: { createdAt: 'desc' }, include: { channel: true } },
    },
  })
  if (!item) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  const message = renderDigestMessage({
    title: item.title,
    subtitle: item.subtitle,
    intro: item.intro,
    outro: item.outro,
    articles: item.items.map((i) => ({
      title: i.article.title,
      source: i.article.source,
      url: i.article.url,
      note: i.note,
    })),
  })
  return NextResponse.json({ item, message })
}

/// PATCH /api/digests/[id]
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of ['title', 'subtitle', 'intro', 'outro', 'status', 'coverStyle', 'tone', 'scheduleCron', 'scheduleEnabled', 'autoChannelIds']) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt)
  if (body.clearScheduled) data.scheduledAt = null

  const updated = await db.digest.update({ where: { id }, data })
  return NextResponse.json({ item: updated })
}

/// DELETE /api/digests/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  await db.digest.delete({ where: { id } }).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
