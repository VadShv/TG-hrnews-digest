import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { testLlm, COLUMN_EMBED_DIM } from '@/lib/llm'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MASK_PREFIX = '••••'

/// POST /api/settings/llm/test — test an LLM config (chat + embeddings) before/after saving.
/// Body: { baseUrl, apiKey, model, embedModel }. If apiKey is masked/empty, the stored key is used.
export async function POST(req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const body = await req.json().catch(() => ({}))
  let apiKey = (body.apiKey || '').toString()
  const baseURL = (body.baseUrl || '').toString()
  const model = (body.model || '').toString()
  const embedModel = (body.embedModel || '').toString()

  // If the key is masked or empty, fall back to the stored (decrypted) key.
  if (!apiKey || apiKey.startsWith(MASK_PREFIX)) {
    const row = await db.botSetting.findUnique({ where: { key: 'llm.apiKey' } })
    if (row) {
      try {
        apiKey = decrypt(row.value)
      } catch {
        apiKey = ''
      }
    }
  }

  const result = await testLlm({ baseURL, apiKey, model, embedModel })
  return NextResponse.json({
    ...result,
    expectedDim: COLUMN_EMBED_DIM,
    dimMatch: result.embedDim === COLUMN_EMBED_DIM,
  })
}
