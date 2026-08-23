/// Render an array of articles into a polished broadcast-ready message (Markdown-like).
/// (ZAI SDK removed — this is a pure renderer.)

export interface DigestArticleInput {
  title: string
  snippet: string
  source: string
  url: string
  publishedAt?: string | null
}

export function renderDigestMessage(opts: {
  title: string
  subtitle?: string | null
  intro?: string | null
  outro?: string | null
  articles: { title: string; source: string; url: string; note?: string | null }[]
}): string {
  const { title, subtitle, intro, outro, articles } = opts
  const lines: string[] = []
  lines.push(`📣 ${title}`)
  if (subtitle) lines.push(subtitle)
  lines.push('')
  if (intro) {
    lines.push(intro)
    lines.push('')
  }
  lines.push('━━━━━━━━━━━━━━━━')
  articles.forEach((a, i) => {
    lines.push(`${i + 1}. ${a.title}`)
    lines.push(`   📰 ${a.source}`)
    if (a.note) lines.push(`   💬 ${a.note}`)
    lines.push(`   🔗 ${a.url}`)
    lines.push('')
  })
  lines.push('━━━━━━━━━━━━━━━━')
  if (outro) {
    lines.push(outro)
    lines.push('')
  }
  lines.push('— HR News Digest Bot')
  return lines.join('\n')
}
