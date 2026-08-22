import OpenAI from 'openai'
import { db } from './db'

/// Cloud.ru OpenAI-compatible LLM + embeddings client.

function getClient(): OpenAI {
  const baseURL = process.env.LLM_BASE_URL
  const apiKey = process.env.LLM_API_KEY
  if (!baseURL || !apiKey) {
    throw new Error('LLM_BASE_URL и LLM_API_KEY должны быть заданы в окружении')
  }
  return new OpenAI({ baseURL, apiKey })
}

let _client: OpenAI | null = null
function client(): OpenAI {
  if (!_client) _client = getClient()
  return _client
}

/// Chat completion: system + user → text.
export async function chat(system: string, user: string, opts?: { maxTokens?: number; temperature?: number }): Promise<string> {
  const completion = await client().chat.completions.create({
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
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
  const res = await client().embeddings.create({
    model: process.env.LLM_EMBED_MODEL || 'text-embedding-3-small',
    input: text.slice(0, 8000),
  })
  return res.data[0]?.embedding || []
}

/// Embed multiple texts in one call.
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const res = await client().embeddings.create({
    model: process.env.LLM_EMBED_MODEL || 'text-embedding-3-small',
    input: texts.map((t) => t.slice(0, 8000)),
  })
  return res.data.map((d) => d.embedding)
}

/// Embed an article's title+snippet and persist the vector (raw SQL for pgvector).
export async function embedArticle(articleId: string, title: string, snippet: string): Promise<void> {
  const vec = await embed(`${title} ${snippet}`)
  const vecStr = `[${vec.join(',')}]`
  await db.$executeRawUnsafe(
    `UPDATE "NewsArticle" SET embedding = $1::vector, "embedded" = true WHERE id = $2`,
    vecStr,
    articleId,
  )
}

/// Check if the LLM is configured (for health/status UI).
export function isLlmConfigured(): boolean {
  return !!(process.env.LLM_BASE_URL && process.env.LLM_API_KEY)
}
