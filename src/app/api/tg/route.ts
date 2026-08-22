import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const WORKER_URL = () => process.env.TG_WORKER_URL || 'http://localhost:8001'

/// GET /api/tg — Telegram session status
export async function GET() {
  const { response } = await getSessionOr401()
  if (response) return response

  const session = await db.tgSession.findFirst()
  return NextResponse.json({
    status: session?.status || 'off',
    phone: session?.phone || null,
    workerUrl: WORKER_URL(),
  })
}

/// POST /api/tg — login flow actions (proxied to the Python kurigram worker)
/// Body: { action: 'login_start'|'login_submit'|'logout', phone?, code?, password? }
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json()
  const action = body.action

  try {
    if (action === 'login_start') {
      const res = await fetch(`${WORKER_URL()}/tg/login/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: body.phone }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json(data, { status: res.status })
      // Record phone + pending status
      const existing = await db.tgSession.findFirst()
      if (existing) {
        await db.tgSession.update({ where: { id: existing.id }, data: { phone: body.phone, status: 'pending' } })
      } else {
        await db.tgSession.create({ data: { phone: body.phone, status: 'pending' } })
      }
      return NextResponse.json(data)
    }

    if (action === 'login_submit') {
      const res = await fetch(`${WORKER_URL()}/tg/login/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: body.phone, code: body.code, password: body.password }),
      })
      const data = await res.json()
      if (!res.ok) return NextResponse.json(data, { status: res.status })
      // Worker saved the session to DB; update status
      const existing = await db.tgSession.findFirst()
      if (existing) {
        await db.tgSession.update({ where: { id: existing.id }, data: { status: 'active', phone: body.phone } })
      }
      return NextResponse.json({ ok: true, ...data })
    }

    if (action === 'logout') {
      await fetch(`${WORKER_URL()}/tg/logout`, { method: 'POST' }).catch(() => undefined)
      const existing = await db.tgSession.findFirst()
      if (existing) {
        await db.tgSession.update({
          where: { id: existing.id },
          data: { status: 'off', sessionEncrypted: null },
        })
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `TG worker недоступен: ${msg}` }, { status: 502 })
  }
}
