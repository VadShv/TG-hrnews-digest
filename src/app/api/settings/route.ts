import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  'bot.name': 'HR Pulse Bot',
  'bot.username': '@hr_pulse_bot',
  'bot.schedule': '09:00',
  'bot.timezone': 'Europe/Moscow',
  'bot.frequency': 'daily',
  'bot.defaultTone': 'professional',
  'bot.autoSummarize': 'false',
  'bot.signature': '— HR Pulse Bot · новости из мира HR',
  'bot.maxItems': '7',
  'workspace.name': 'HR Pulse',
  'workspace.language': 'ru',
}

/// GET /api/settings — return all settings merged with defaults.
export async function GET() {
  const { response } = await getSessionOr401()
  if (response) return response

  const rows = await db.botSetting.findMany()
  const map: Record<string, string> = { ...DEFAULTS }
  for (const r of rows) map[r.key] = r.value
  return NextResponse.json({ settings: map })
}

/// PUT /api/settings — accept partial { key: value } map.
export async function PUT(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = (await req.json()) as Record<string, string>
  const allowed = new Set(Object.keys(DEFAULTS))
  const updates: Promise<unknown>[] = []
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.has(key)) continue
    if (typeof value !== 'string') continue
    updates.push(
      db.botSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    )
  }
  await Promise.all(updates)
  const rows = await db.botSetting.findMany()
  const map: Record<string, string> = { ...DEFAULTS }
  for (const r of rows) map[r.key] = r.value
  return NextResponse.json({ settings: map })
}
