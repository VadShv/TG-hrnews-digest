import { HR_CATEGORIES } from './hr'

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  const diff = Date.now() - d.getTime()
  const sec = Math.round(diff / 1000)
  const min = Math.round(sec / 60)
  const hr = Math.round(min / 60)
  const day = Math.round(hr / 24)
  if (sec < 60) return 'только что'
  if (min < 60) return `${min} мин назад`
  if (hr < 24) return `${hr} ч назад`
  if (day < 30) return `${day} дн назад`
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

export function formatDate(date: string | Date | null | undefined, withTime = false): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }
  return d.toLocaleDateString('ru-RU', opts)
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function initials(name: string): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export const CATEGORY_ICON: Record<string, string> = HR_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.icon }),
  {} as Record<string, string>,
)

export function categoryColor(key?: string | null): { bg: string; fg: string; ring: string } {
  switch (key) {
    case 'Hiring':
      return { bg: 'bg-emerald-100 dark:bg-emerald-950/60', fg: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-800' }
    case 'Retention':
      return { bg: 'bg-rose-100 dark:bg-rose-950/60', fg: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-200 dark:ring-rose-800' }
    case 'Compensation':
      return { bg: 'bg-amber-100 dark:bg-amber-950/60', fg: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-800' }
    case 'Tech HR':
      return { bg: 'bg-violet-100 dark:bg-violet-950/60', fg: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-200 dark:ring-violet-800' }
    case 'L&D':
      return { bg: 'bg-teal-100 dark:bg-teal-950/60', fg: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-200 dark:ring-teal-800' }
    case 'Culture':
      return { bg: 'bg-pink-100 dark:bg-pink-950/60', fg: 'text-pink-700 dark:text-pink-300', ring: 'ring-pink-200 dark:ring-pink-800' }
    case 'Remote':
      return { bg: 'bg-cyan-100 dark:bg-cyan-950/60', fg: 'text-cyan-700 dark:text-cyan-300', ring: 'ring-cyan-200 dark:ring-cyan-800' }
    case 'Legal':
      return { bg: 'bg-stone-200 dark:bg-stone-800/60', fg: 'text-stone-700 dark:text-stone-300', ring: 'ring-stone-300 dark:ring-stone-700' }
    case 'Analytics':
      return { bg: 'bg-lime-100 dark:bg-lime-950/60', fg: 'text-lime-700 dark:text-lime-300', ring: 'ring-lime-200 dark:ring-lime-800' }
    case 'Diversity':
      return { bg: 'bg-orange-100 dark:bg-orange-950/60', fg: 'text-orange-700 dark:text-orange-300', ring: 'ring-orange-200 dark:ring-orange-800' }
    default:
      return { bg: 'bg-slate-100 dark:bg-slate-800/60', fg: 'text-slate-600 dark:text-slate-300', ring: 'ring-slate-200 dark:ring-slate-700' }
  }
}

export function statusTone(tone: string): { bg: string; fg: string; dot: string } {
  switch (tone) {
    case 'emerald':
      return { bg: 'bg-emerald-100 dark:bg-emerald-950/60', fg: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' }
    case 'amber':
      return { bg: 'bg-amber-100 dark:bg-amber-950/60', fg: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' }
    case 'rose':
      return { bg: 'bg-rose-100 dark:bg-rose-950/60', fg: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' }
    case 'sky':
      return { bg: 'bg-cyan-100 dark:bg-cyan-950/60', fg: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' }
    case 'slate':
      return { bg: 'bg-slate-100 dark:bg-slate-800/60', fg: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' }
    case 'violet':
      return { bg: 'bg-violet-100 dark:bg-violet-950/60', fg: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' }
    default:
      return { bg: 'bg-slate-100 dark:bg-slate-800/60', fg: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' }
  }
}
