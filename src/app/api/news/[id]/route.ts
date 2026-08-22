import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/news/[id]
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  const item = await db.newsArticle.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  return NextResponse.json({ item })
}

/// PATCH /api/news/[id] — toggle starred/archived, edit category/tags/summary/editorNote
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  for (const k of [
    'title', 'snippet', 'category', 'tags', 'imageUrl', 'author', 'summary', 'language', 'editorNote',
  ]) {
    if (body[k] !== undefined) data[k] = body[k]
  }
  if (typeof body.starred === 'boolean') data.starred = body.starred
  if (typeof body.archived === 'boolean') data.archived = body.archived
  if (body.publishedAt) data.publishedAt = new Date(body.publishedAt)

  const updated = await db.newsArticle.update({ where: { id }, data })
  return NextResponse.json({ item: updated })
}

/// DELETE /api/news/[id]
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  await db.newsArticle.delete({ where: { id } }).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
