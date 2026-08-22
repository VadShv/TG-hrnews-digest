import type { NewsArticle } from '@prisma/client'

export const HR_CATEGORIES = [
  { key: 'Hiring', label: 'Подбор и найм', icon: 'UserPlus' },
  { key: 'Retention', label: 'Удержание', icon: 'HeartHandshake' },
  { key: 'Compensation', label: 'Компенсации', icon: 'Banknote' },
  { key: 'Tech HR', label: 'HR-технологии', icon: 'Cpu' },
  { key: 'L&D', label: 'Обучение и развитие', icon: 'GraduationCap' },
  { key: 'Culture', label: 'Культура', icon: 'Sparkles' },
  { key: 'Remote', label: 'Удалённая работа', icon: 'Laptop' },
  { key: 'Legal', label: 'HR-право', icon: 'Scale' },
  { key: 'Analytics', label: 'HR-аналитика', icon: 'BarChart3' },
  { key: 'Diversity', label: 'D&I', icon: 'Users' },
] as const

export const HR_CATEGORY_LABELS: Record<string, string> = HR_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.label }),
  {} as Record<string, string>,
)

/// Curated search templates — one click searches that target specific HR verticals.
export const QUICK_SEARCHES: { label: string; query: string; category: string; emoji: string }[] = [
  { label: 'Рынок труда сегодня', query: 'HR trends hiring market 2025 новости', category: 'Hiring', emoji: '📈' },
  { label: 'Удалёнка и гибрид', query: 'remote work hybrid news HR 2025', category: 'Remote', emoji: '🏠' },
  { label: 'Зарплаты и бонусы', query: 'compensation salary bonus HR news', category: 'Compensation', emoji: '💰' },
  { label: 'ИИ в HR', query: 'AI in HR technology news 2025', category: 'Tech HR', emoji: '🤖' },
  { label: 'Корпоративная культура', query: 'corporate culture employee engagement news', category: 'Culture', emoji: '🌟' },
  { label: 'Обучение персонала', query: 'employee learning development L&D news', category: 'L&D', emoji: '🎓' },
]

export const DIGEST_COVER_STYLES = [
  { key: 'emerald', label: 'Изумруд', from: '#059669', to: '#10b981' },
  { key: 'sunset', label: 'Закат', from: '#ea580c', to: '#f59e0b' },
  { key: 'rose', label: 'Роза', from: '#e11d48', to: '#f43f5e' },
  { key: 'violet', label: 'Аметист', from: '#7c3aed', to: '#a855f7' },
  { key: 'slate', label: 'Графит', from: '#334155', to: '#64748b' },
  { key: 'teal', label: 'Лагуна', from: '#0d9488', to: '#14b8a6' },
] as const

export const CHANNEL_TYPES = [
  { key: 'telegram', label: 'Telegram', icon: 'Send', color: '#0ea5e9' },
  { key: 'slack', label: 'Slack', icon: 'MessageSquare', color: '#e11d48' },
  { key: 'email', label: 'Email', icon: 'Mail', color: '#f59e0b' },
  { key: 'webhook', label: 'Webhook', icon: 'Webhook', color: '#7c3aed' },
  { key: 'discord', label: 'Discord', icon: 'Hash', color: '#6366f1' },
] as const

export const BROADCAST_STATUSES: Record<string, { label: string; tone: string }> = {
  pending: { label: 'В очереди', tone: 'amber' },
  sent: { label: 'Отправлено', tone: 'sky' },
  delivered: { label: 'Доставлено', tone: 'emerald' },
  failed: { label: 'Ошибка', tone: 'rose' },
}

export const DIGEST_STATUSES: Record<string, { label: string; tone: string }> = {
  draft: { label: 'Черновик', tone: 'slate' },
  ready: { label: 'Готов', tone: 'sky' },
  scheduled: { label: 'Запланирован', tone: 'amber' },
  sent: { label: 'Отправлен', tone: 'emerald' },
}

export type NewsArticleWithRelations = NewsArticle & {
  digestItems?: { digestId: string }[]
}

/// Guess the HR category from an article's title + snippet.
export function guessCategory(title: string, snippet: string): string {
  const text = `${title} ${snippet}`.toLowerCase()
  const map: [string, string[]][] = [
    ['Hiring', ['hiring', 'recruit', 'найм', 'подбор', 'ваканс', 'candidate', 'interview']],
    ['Retention', ['retention', 'turnover', 'удержан', 'текучесть', 'engagement']],
    ['Compensation', ['salary', 'compensation', 'зарплат', 'бонус', 'wage', 'pay']],
    ['Tech HR', ['ai ', 'hr tech', 'ats', 'hrtech', 'искусств. интел', 'hr-технол']],
    ['L&D', ['learning', 'training', 'обучение', 'развитие', 'upskilling', 'reskilling']],
    ['Culture', ['culture', 'культур', 'engagement', 'wellbeing', 'благополуч']],
    ['Remote', ['remote', 'hybrid', 'удалён', 'гибрид', 'wfh', 'remote work']],
    ['Legal', ['law', 'legal', 'compliance', 'право', 'закон', 'трудовой кодекс']],
    ['Analytics', ['analytics', 'people analytics', 'метрик', 'данны', 'kpi']],
    ['Diversity', ['diversity', 'inclusion', 'dei', 'инклюзив']],
  ]
  for (const [cat, keys] of map) {
    if (keys.some((k) => text.includes(k))) return cat
  }
  return 'Hiring'
}

/// Estimate reading time in minutes from a text length.
export function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}
