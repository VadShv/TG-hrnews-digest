import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// POST /api/digests/[id]/items — add article(s) to a digest
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id: digestId } = await ctx.params
  const digest = await db.digest.findUnique({ where: { id: digestId } })
  if (!digest) return NextResponse.json({ error: 'Дайджест не найден' }, { status: 404 })

  const body = await req.json()
  let ids: string[] = []
  if (body.articleId) ids.push(body.articleId)
  if (Array.isArray(body.articleIds)) ids.push(...body.articleIds)

  if (body.article && body.article.url) {
    const a = body.article
    const up = await db.newsArticle.upsert({
      where: { url: a.url },
      update: {},
      create: {
        title: a.title,
        url: a.url,
        snippet: a.snippet || '',
        source: a.source || a.url,
        category: a.category || null,
        publishedAt: a.publishedAt ? new Date(a.publishedAt) : null,
        sourceType: 'manual',
      },
    })
    ids.push(up.id)
  }

  ids = Array.from(new Set(ids.filter(Boolean)))
  if (!ids.length) return NextResponse.json({ error: 'Нет статей для добавления' }, { status: 400 })

  const maxPos = await db.digestItem.aggregate({ where: { digestId }, _max: { position: true } })
  let pos = (maxPos._max.position ?? -1) + 1

  const created: string[] = []
  for (const articleId of ids) {
    try {
      const item = await db.digestItem.create({
        data: { digestId, articleId, position: pos++, note: body.note ?? null },
      })
      created.push(item.id)
    } catch {
      // unique constraint — already in this digest; skip
    }
  }

  const updated = await db.digest.findUnique({
    where: { id: digestId },
    include: { items: { orderBy: { position: 'asc' }, include: { article: true } } },
  })
  return NextResponse.json({ added: created.length, item: updated })
}

/// DELETE /api/digests/[id]/items?itemId=... or ?articleId=...
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id: digestId } = await ctx.params
  const url = new URL(req.url)
  const itemId = url.searchParams.get('itemId')
  const articleId = url.searchParams.get('articleId')

  if (itemId) {
    await db.digestItem.deleteMany({ where: { id: itemId, digestId } })
  } else if (articleId) {
    await db.digestItem.deleteMany({ where: { articleId, digestId } })
  } else {
    return NextResponse.json({ error: 'Нужен itemId или articleId' }, { status: 400 })
  }

  const remaining = await db.digestItem.findMany({ where: { digestId }, orderBy: { position: 'asc' } })
  await Promise.all(
    remaining.map((r, i) => db.digestItem.update({ where: { id: r.id }, data: { position: i } })),
  )
  return NextResponse.json({ ok: true, remaining: remaining.length })
}

/// PATCH /api/digests/[id]/items?itemId=...
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id: digestId } = await ctx.params
  const url = new URL(req.url)
  const itemId = url.searchParams.get('itemId')
  if (!itemId) return NextResponse.json({ error: 'itemId нужен' }, { status: 400 })
  const body = await req.json()

  const data: Record<string, unknown> = {}
  if (body.note !== undefined) data.note = body.note
  if (typeof body.position === 'number') data.position = body.position

  const updated = await db.digestItem.update({ where: { id: itemId }, data })
  return NextResponse.json({ item: updated })
}

/// PUT /api/digests/[id]/items — reorder all items
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id: digestId } = await ctx.params
  const body = (await req.json()) as { order: string[] }
  if (!Array.isArray(body.order)) return NextResponse.json({ error: 'order[] нужен' }, { status: 400 })

  await Promise.all(
    body.order.map((itemId, i) => db.digestItem.update({ where: { id: itemId, digestId }, data: { position: i } })),
  )
  return NextResponse.json({ ok: true })
}
