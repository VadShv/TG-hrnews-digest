import { NextRequest, NextResponse } from 'next/server'
import { broadcastDigest } from '@/lib/broadcast'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface BroadcastBody {
  digestId: string
  channelIds: string[]
  preview?: boolean
}

/// POST /api/broadcast — send a digest to channels (real TG delivery via worker queue).
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = (await req.json()) as BroadcastBody
  if (!body.digestId || !Array.isArray(body.channelIds) || body.channelIds.length === 0) {
    return NextResponse.json({ error: 'digestId и channelIds[] обязательны' }, { status: 400 })
  }

  try {
    const result = await broadcastDigest(body.digestId, body.channelIds, body.preview)
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const status = msg.includes('не найден') ? 404 : msg.includes('Нет активных') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
