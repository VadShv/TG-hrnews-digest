import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enqueueTestMessage } from '@/lib/broadcast'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// POST /api/tg/test — send a test message to a TG chat
/// Body: { chatId, message? }
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json()
  if (!body.chatId) {
    return NextResponse.json({ error: 'chatId обязателен' }, { status: 400 })
  }
  const message = body.message || '🧪 Тестовое сообщение от HR News Digest Bot'
  const job = await enqueueTestMessage(body.chatId, message)
  return NextResponse.json({ ok: true, jobId: job.id, message: 'Тест поставлен в очередь' })
}
