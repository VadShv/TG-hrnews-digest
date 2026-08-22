import { db } from './db'
import { embed } from './llm'

export interface SearchHit {
  id: string
  title: string
  url: string
  snippet: string
  source: string
  category: string | null
  publishedAt: string | null
  readingTime: number | null
  starred: boolean
  sourceType: string
  summary: string | null
  editorNote: string | null
  createdAt: string
  semScore: number
  ftsScore: number
  score: number
}

export interface SearchOptions {
  category?: string
  sourceType?: string
  starred?: boolean
  limit?: number
  mode?: 'hybrid' | 'semantic' | 'fts'
}

/// Hybrid search over the article corpus: pgvector cosine + tsvector Russian FTS.
export async function hybridSearch(query: string, opts: SearchOptions = {}): Promise<SearchHit[]> {
  const limit = Math.min(opts.limit ?? 24, 100)
  const mode = opts.mode ?? 'hybrid'
  const q = query.trim()
  if (!q) return []

  // Build WHERE clause + params (user inputs are always parameterized).
  const conditions: string[] = ['"archived" = false']
  const params: unknown[] = []
  const p = (v: unknown) => {
    params.push(v)
    return `$${params.length}`
  }

  if (opts.category) conditions.push(`"category" = ${p(opts.category)}`)
  if (opts.sourceType) conditions.push(`"sourceType" = ${p(opts.sourceType)}`)
  if (opts.starred) conditions.push(`"starred" = true`)
  const where = conditions.join(' AND ')

  const cols = `"id","title","url","snippet","source","category","publishedAt","readingTime","starred","sourceType","summary","editorNote","createdAt"`

  try {
    if (mode === 'semantic') {
      const vec = await embed(q)
      const vecStr = `[${vec.join(',')}]`
      const vecParam = p(vecStr)
      const limitParam = p(limit)
      const sql = `
        SELECT ${cols},
          (1 - (embedding <=> ${vecParam}::vector)) AS sem_score,
          0::float AS fts_score
        FROM "NewsArticle"
        WHERE ${where} AND embedding IS NOT NULL
        ORDER BY embedding <=> ${vecParam}::vector
        LIMIT ${limitParam}`
      return (await db.$queryRawUnsafe<any[]>(sql, ...params)).map(normalize)
    }

    if (mode === 'fts') {
      const qParam = p(q)
      const limitParam = p(limit)
      const sql = `
        SELECT ${cols},
          0::float AS sem_score,
          ts_rank_cd("search_vector", plainto_tsquery('russian', ${qParam})) AS fts_score
        FROM "NewsArticle"
        WHERE ${where} AND "search_vector" @@ plainto_tsquery('russian', ${qParam})
        ORDER BY fts_score DESC
        LIMIT ${limitParam}`
      return (await db.$queryRawUnsafe<any[]>(sql, ...params)).map(normalize)
    }

    // hybrid: combine both scores
    const vec = await embed(q)
    const vecStr = `[${vec.join(',')}]`
    const vecParam = p(vecStr)
    const qParam = p(q)
    const limitParam = p(limit)
    const sql = `
      SELECT ${cols},
        COALESCE(1 - (embedding <=> ${vecParam}::vector), 0) AS sem_score,
        COALESCE(ts_rank_cd("search_vector", plainto_tsquery('russian', ${qParam})), 0) AS fts_score
      FROM "NewsArticle"
      WHERE ${where}
        AND (embedding IS NOT NULL OR "search_vector" @@ plainto_tsquery('russian', ${qParam}))
      ORDER BY (0.6 * COALESCE(1 - (embedding <=> ${vecParam}::vector), 0)
              + 0.4 * COALESCE(ts_rank_cd("search_vector", plainto_tsquery('russian', ${qParam})), 0)) DESC
      LIMIT ${limitParam}`
    return (await db.$queryRawUnsafe<any[]>(sql, ...params)).map(normalize)
  } catch (e) {
    console.error('[search] error:', e instanceof Error ? e.message : e)
    return []
  }
}

/// Normalize raw DB row (dates → ISO strings, compute combined score).
function normalize(row: any): SearchHit {
  const r: SearchHit = {
    id: row.id,
    title: row.title,
    url: row.url,
    snippet: row.snippet,
    source: row.source,
    category: row.category,
    publishedAt: row.publishedAt instanceof Date ? row.publishedAt.toISOString() : row.publishedAt,
    readingTime: row.readingTime,
    starred: row.starred,
    sourceType: row.sourceType,
    summary: row.summary,
    editorNote: row.editorNote,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    semScore: Number(row.semscore ?? row.sem_score ?? 0),
    ftsScore: Number(row.ftsscore ?? row.fts_score ?? 0),
    score: 0,
  }
  r.score = 0.6 * (r.semScore || 0) + 0.4 * (r.ftsScore || 0)
  return r
}
