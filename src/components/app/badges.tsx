'use client'

import { HR_CATEGORIES, HR_CATEGORY_LABELS } from '@/lib/hr'
import { categoryColor, statusTone } from '@/lib/format'
import {
  UserPlus, HeartHandshake, Banknote, Cpu, GraduationCap, Sparkles,
  Laptop, Scale, BarChart3, Users, HelpCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  Send, MessageSquare, Mail, Webhook, Hash,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus, HeartHandshake, Banknote, Cpu, GraduationCap, Sparkles,
  Laptop, Scale, BarChart3, Users,
}

export function CategoryIcon({ category, className }: { category?: string | null; className?: string }) {
  const Icon = (category && ICON_MAP[HR_CATEGORIES.find((c) => c.key === category)?.icon || '']) || HelpCircle
  return <Icon className={className} />
}

export function CategoryBadge({ category, className }: { category?: string | null; className?: string }) {
  const c = categoryColor(category)
  const label = category ? HR_CATEGORY_LABELS[category] || category : 'Без категории'
  const Icon = (category && ICON_MAP[HR_CATEGORIES.find((x) => x.key === category)?.icon || '']) || HelpCircle
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${c.bg} ${c.fg} ${c.ring} ${className ?? ''}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  )
}

export function StatusBadge({ tone, label }: { tone: string; label: string }) {
  const t = statusTone(tone)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${t.bg} ${t.fg}`}
    >
      <span className={`size-1.5 rounded-full ${t.dot}`} />
      {label}
    </span>
  )
}

const CHANNEL_ICON: Record<string, LucideIcon> = {
  telegram: Send,
  slack: MessageSquare,
  email: Mail,
  webhook: Webhook,
  discord: Hash,
}

export function ChannelIcon({ type, className }: { type: string; className?: string }) {
  const Icon = CHANNEL_ICON[type] || MessageSquare
  return <Icon className={className} />
}

export const CHANNEL_COLORS: Record<string, string> = {
  telegram: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
  slack: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  email: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  webhook: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  discord: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300',
}

export function ChannelBadge({ type, className }: { type: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${CHANNEL_COLORS[type] || 'bg-slate-100 text-slate-700'} ${className ?? ''}`}>
      <ChannelIcon type={type} className="size-3" />
      {type}
    </span>
  )
}

export const ALL_CATEGORIES = HR_CATEGORIES
