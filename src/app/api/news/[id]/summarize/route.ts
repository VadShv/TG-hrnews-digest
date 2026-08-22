import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chat } from '@/lib/llm'
import { HR_CATEGORY_LABELS } from '@/lib/hr'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// POST /api/news/[id]/summarize — generate a short HR-style summary via LLM.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await getSessionOr401()
  if (response) return response

  const { id } = await ctx.params
  const article = await db.newsArticle.findUnique({ where: { id } })
  if (!article) return NextResponse.json({ error: 'Не найдено' }, { status: 404 })

  try {
    const categoryLabel = article.category ? HR_CATEGORY_LABELS[article.category] || article.category : 'HR'

    const system = `Ты — редактор HR-дайджеста. Пишешь кратко, по-деловому, на русском языке. Сначала 1 предложение сутью, затем 2-3 предложения с ключевыми деталями. Без воды и без эмодзи.`
    const user = `Статья: «${article.title}»
Источник: ${article.source}
Категория: ${categoryLabel}
Описание: ${article.snippet}

Напиши короткую сводку для HR-дайджеста (до 60 слов).`

    const summary = await chat(system, user, { maxTokens: 200, temperature: 0.3 })
    if (!summary) {
      return NextResponse.json({ error: 'Пустой ответ модели' }, { status: 502 })
    }

    const updated = await db.newsArticle.update({
      where: { id },
      data: { summary },
    })

    return NextResponse.json({ summary, item: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
