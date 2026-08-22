'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone?: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate'
  trend?: { value: string; up?: boolean }
  onClick?: () => void
}

const TONES: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  sky: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'emerald', trend, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        'group relative gap-0 overflow-hidden py-5',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
      )}
      onClick={onClick}
    >
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-gradient-to-br from-primary/5 to-amber-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
            <Icon className="size-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                trend.up ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
              )}
            >
              {trend.up ? '▲' : '▼'} {trend.value}
            </span>
            <span className="text-xs text-muted-foreground">за 14 дней</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
