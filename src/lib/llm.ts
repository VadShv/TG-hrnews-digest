import OpenAI from 'openai'
import { db } from './db'
import { decrypt } from './crypto'

/// Cloud.ru OpenAI-compatible LLM + embeddings client.
/// Config source precedence: DB (BotSetting llm.*) > env > not configured.
/// The API key is stored encrypted in the DB; env values starting with CHANGE_ME are ignored.

export interface LlmConfig {
  baseURL: string
  apiKey: string
  model: string
  embedModel: string
  embedDim: number
}

/// Fixed vector column dimension (from the init migration). Embeddings must match.
export const COLUMN_EMBED_DIM = 4096

const ENV_PLACEHOLDER = /^CHANGE_ME/i

function envOrUndef(v: string | undefined): string | undefined {
  if (!v) return undefined
  if (ENV_PLACEHOLDER.test(v)) return undefined
  return v
}

let _config: LlmConfig | null = null
let _client: OpenAI | null = null

/// Reset the cached config + client (call after settings are saved).
export function invalidateLlmCache() {
  _config = null
  _client = null
}

/// Resolve the active LLM config (DB → env). Returns null if not configured.
export async function getLlmConfig(): Promise<LlmConfig | null> {
  if (_config) return _config

  const rows = await db.botSetting.findMany({ where: { key: { startsWith: 'llm.' } } })
  const dbMap: Record<string, string> = {}
  for (const r of rows) dbMap[r.key] = r.value

  const baseURL = dbMap['llm.baseUrl'] || envOrUndef(process.env.LLM_BASE_URL) || ''
  let apiKey = ''
  if (dbMap['llm.apiKey']) {
    try {
      apiKey = decrypt(dbMap['llm.apiKey'])
    } catch {
      apiKey = ''
    }
  }
  if (!apiKey) apiKey = envOrUndef(process.env.LLM_API_KEY) || ''
  const model = dbMap['llm.model'] || envOrUndef(process.env.LLM_MODEL) || 'gpt-4o-mini'
  const embedModel = dbMap['llm.embedModel'] || envOrUndef(process.env.LLM_EMBED_MODEL) || 'text-embedding-3-small'
  const embedDim = parseInt(dbMap['llm.embedDim'] || process.env.EMBED_DIM || '4096', 10) || 4096

  if (!baseURL || !apiKey) return null
  _config = { baseURL, apiKey, model, embedModel, embedDim }
  return _config
}

async function client(): Promise<OpenAI> {
  const cfg = await getLlmConfig()
  if (!cfg) {
    throw new Error('AI-модель не настроена: задайте Base URL и API-ключ в разделе «Настройки»')
  }
  if (!_client) _client = new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey })
  return _client
}

/// Chat completion: system + user → text.
export async function chat(
  system: string,
  user: string,
  opts?: { maxTokens?: number; temperature?: number },
): Promise<string> {
  const cfg = await getLlmConfig()
  if (!cfg) throw new Error('AI-модель не настроена')
  const c = await client()
  const completion = await c.chat.completions.create({
    model: cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...(opts?.maxTokens ? { max_tokens: opts.maxTokens } : {}),
    ...(opts?.temperature !== undefined ? { temperature: opts.temperature } : {}),
  })
  return completion.choices[0]?.message?.content?.trim() || ''
}

/// Embed a single text → vector.
export async function embed(text: string): Promise<number[]> {
  const cfg = await getLlmConfig()
  if (!cfg) throw new Error('AI-модель не настроена')
  const c = await client()
  const res = await c.embeddings.create({ model: cfg.embedModel, input: text.slice(0, 8000) })
  return res.data[0]?.embedding || []
}

/// Embed multiple texts in one call.
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const cfg = await getLlmConfig()
  if (!cfg) throw new Error('AI-модель не настроена')
  const c = await client()
  const res = await c.embeddings.create({
    model: cfg.embedModel,
    input: texts.map((t) => t.slice(0, 8000)),
  })
  return res.data.map((d) => d.embedding)
}

/// Embed an article's title+snippet and persist the vector (raw SQL for pgvector).
export async function embedArticle(articleId: string, title: string, snippet: string): Promise<void> {
  const vec = await embed(`${title} ${snippet}`)
  if (vec.length !== COLUMN_EMBED_DIM) {
    throw new Error(
      `Размерность эмбеддинга модели (${vec.length}) не совпадает с колонкой БД (${COLUMN_EMBED_DIM}). ` +
        `Смените embedding-модель на ${COLUMN_EMBED_DIM}-мерную или выполните миграцию колонки.`,
    )
  }
  const vecStr = `[${vec.join(',')}]`
  await db.$executeRawUnsafe(
    `UPDATE "NewsArticle" SET embedding = $1::vector, "embedded" = true WHERE id = $2`,
    vecStr,
    articleId,
  )
}

/// Check if the LLM is configured (for status UI).
export async function isLlmConfigured(): Promise<boolean> {
  const cfg = await getLlmConfig()
  return cfg !== null
}

/// Test a given config (chat + embeddings) without persisting. Used by the UI test button.
export async function testLlm(cfg: {
  baseURL: string
  apiKey: string
  model: string
  embedModel: string
}): Promise<{ chatOk: boolean; embedOk: boolean; embedDim: number; errors: string[] }> {
  const errors: string[] = []
  if (!cfg.baseURL || !cfg.apiKey) {
    return { chatOk: false, embedOk: false, embedDim: 0, errors: ['Base URL и API-ключ обязательны'] }
  }
  const c = new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey })
  let chatOk = false
  let embedOk = false
  let embedDim = 0
  try {
    const comp = await c.chat.completions.create({
      model: cfg.model,
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    })
    chatOk = !!comp.choices?.[0]
  } catch (e) {
    errors.push('chat: ' + (e instanceof Error ? e.message : String(e)))
  }
  try {
    const res = await c.embeddings.create({ model: cfg.embedModel, input: 'test' })
    embedDim = res.data[0]?.embedding?.length || 0
    embedOk = embedDim > 0
  } catch (e) {
    errors.push('embed: ' + (e instanceof Error ? e.message : String(e)))
  }
  return { chatOk, embedOk, embedDim, errors }
}
