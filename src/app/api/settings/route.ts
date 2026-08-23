import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/crypto'
import { invalidateLlmCache } from '@/lib/llm'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULTS: Record<string, string> = {
  'bot.name': 'HR News Digest Bot',
  'bot.username': '@hr_news_digest_bot',
  'bot.schedule': '09:00',
  'bot.timezone': 'Europe/Moscow',
  'bot.frequency': 'daily',
  'bot.defaultTone': 'professional',
  'bot.autoSummarize': 'false',
  'bot.signature': '— HR News Digest Bot · новости из мира HR',
  'bot.maxItems': '7',
  'workspace.name': 'HR News Digest',
  'workspace.language': 'ru',
  'llm.baseUrl': '',
  'llm.model': 'gpt-4o-mini',
  'llm.embedModel': 'text-embedding-3-small',
  'llm.embedDim': '4096',
}

const MASK_PREFIX = '••••'

function maskKey(encrypted: string): string {
  try {
    const raw = decrypt(encrypted)
    if (!raw) return ''
    return MASK_PREFIX + raw.slice(-4)
  } catch {
    return ''
  }
}

/// GET /api/settings — return all settings merged with defaults. API key is masked.
export async function GET() {
  const { response } = await getSessionOr401()
  if (response) return response

  const rows = await db.botSetting.findMany()
  const map: Record<string, string> = { ...DEFAULTS }
  for (const r of rows) {
    if (r.key === 'llm.apiKey') continue // never expose the encrypted key
    map[r.key] = r.value
  }

  const apiKeyRow = rows.find((r) => r.key === 'llm.apiKey')
  map['llm.apiKeyMasked'] = apiKeyRow ? maskKey(apiKeyRow.value) : ''
  map['llm.apiKeySet'] = apiKeyRow ? 'true' : 'false'

  return NextResponse.json({ settings: map })
}

/// PUT /api/settings — accept partial { key: value } map. llm.apiKey is encrypted.
export async function PUT(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = (await req.json()) as Record<string, string>
  const allowed = new Set(Object.keys(DEFAULTS))
  const updates: Promise<unknown>[] = []

  for (const [key, value] of Object.entries(body)) {
    if (key === 'llm.apiKey') {
      // Special: encrypt + store only if a real new key is provided.
      if (typeof value !== 'string') continue
      if (!value || value.startsWith(MASK_PREFIX)) continue // empty or unchanged mask → skip
      updates.push(
        db.botSetting.upsert({
          where: { key },
          update: { value: encrypt(value) },
          create: { key, value: encrypt(value) },
        }),
      )
      continue
    }
    if (!allowed.has(key)) continue
    if (typeof value !== 'string') continue
    updates.push(
      db.botSetting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    )
  }

  await Promise.all(updates)
  invalidateLlmCache()

  // Re-read and return (with masked key)
  const rows = await db.botSetting.findMany()
  const map: Record<string, string> = { ...DEFAULTS }
  for (const r of rows) {
    if (r.key === 'llm.apiKey') continue
    map[r.key] = r.value
  }
  const apiKeyRow = rows.find((r) => r.key === 'llm.apiKey')
  map['llm.apiKeyMasked'] = apiKeyRow ? maskKey(apiKeyRow.value) : ''
  map['llm.apiKeySet'] = apiKeyRow ? 'true' : 'false'

  return NextResponse.json({ settings: map })
}
