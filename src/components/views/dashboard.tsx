'use client'

import { useFetch } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard, EmptyState } from '@/components/app/stat-card'
import { CategoryBadge, ChannelBadge, StatusBadge } from '@/components/app/badges'
import {
  Newspaper, FileText, Radio, Send, Star, CheckCircle2, Search,
  TrendingUp, Activity, ArrowRight, Sparkles,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from 'recharts'
import { useApp } from '@/lib/store'
import { timeAgo, formatDate } from '@/lib/format'
import { HR_CATEGORY_LABELS } from '@/lib/hr'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface Stats {
  totals: {
    articles: number
    digests: number
    channels: number
    activeChannels: number
    broadcasts: number
    sentBroadcasts: number
    starred: number
    searches: number
    feeds: number
    tgChannels: number
  }
  byCategory: { category: string; count: number }[]
  trend: { date: string; sent: number; failed: number }[]
  recentBroadcasts: Array<{
    id: string
    status: string
    createdAt: string
    channel: { name: string; type: string }
    digest: { id: string; title: string }
  }>
  recentArticles: Array<{ id: string; title: string; source: string; category: string; createdAt: string }>
  topSources: { source: string; count: number }[]
}

const STATUS_TONE: Record<string, string> = {
  sent: 'sky', delivered: 'emerald', failed: 'rose', pending: 'amber',
}
const STATUS_LABEL: Record<string, string> = {
  sent: 'Отправлено', delivered: 'Доставлено', failed: 'Ошибка', pending: 'В очереди',
}

const TREND_DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
function shortDate(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : TREND_DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]
}

export function DashboardView() {
  const { data, loading } = useFetch<Stats>('/api/stats')
  const { setView, openDigest, openArticle } = useApp()

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-xl lg:col-span-2" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  const t = data.totals
  const maxCat = Math.max(1, ...data.byCategory.map((c) => c.count))
  const totalSent14 = data.trend.reduce((s, d) => s + d.sent, 0)
  const totalFailed14 = data.trend.reduce((s, d) => s + d.failed, 0)

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-amber-500/5 to-transparent">
        <div className="absolute right-0 top-0 h-full w-1/2 opacity-30 grain" />
        <CardContent className="relative flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" /> Добро пожаловать в HR Pulse
            </div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Управляйте HR-дайджестом от поиска до рассылки
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Найдите новости, соберите дайджест и отправьте в один клик по всем подключённым каналам.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button onClick={() => setView('search')} size="sm">
              <Search className="size-4" /> Найти новости
            </Button>
            <Button onClick={() => setView('digests')} variant="outline" size="sm">
              <FileText className="size-4" /> Дайджесты
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Статей в библиотеке" value={t.articles} hint={`${t.starred} в избранном`} icon={Newspaper} tone="emerald" onClick={() => setView('library')} />
        <StatCard label="Дайджестов" value={t.digests} icon={FileText} tone="amber" onClick={() => setView('digests')} />
        <StatCard label="Каналов" value={t.channels} hint={`${t.activeChannels} активных`} icon={Radio} tone="violet" onClick={() => setView('channels')} />
        <StatCard label="Отправок всего" value={t.sentBroadcasts} hint={`из ${t.broadcasts} попыток`} icon={CheckCircle2} tone="sky" onClick={() => setView('broadcasts')} />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Рассылки за 14 дней
                </CardTitle>
                <CardDescription>Динамика отправок по каналам</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />Отправлено {totalSent14}</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-400" />Ошибки {totalFailed14}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trend} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
                  <defs>
                    <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.55 0.13 165)" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="oklch(0.55 0.13 165)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.65 0.22 12)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="oklch(0.65 0.22 12)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0 0 0 / 8%)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="oklch(0.5 0 0)" axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12, background: 'var(--card)' }}
                    labelFormatter={(l) => formatDate(l as string)}
                  />
                  <Area type="monotone" dataKey="sent" name="Отправлено" stroke="oklch(0.55 0.13 165)" strokeWidth={2.5} fill="url(#sentGrad)" />
                  <Area type="monotone" dataKey="failed" name="Ошибки" stroke="oklch(0.65 0.22 12)" strokeWidth={1.5} fill="url(#failGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Categories breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4 text-amber-500" /> Категории
            </CardTitle>
            <CardDescription>Распределение статей</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byCategory.slice(0, 8)} layout="vertical" margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={84} tickFormatter={(v) => HR_CATEGORY_LABELS[v as string] || v} stroke="oklch(0.5 0 0)" axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', fontSize: 12, background: 'var(--card)' }}
                    cursor={{ fill: 'oklch(0 0 0 / 4%)' }}
                    formatter={(v) => [v, 'статей']}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={14}>
                    {data.byCategory.slice(0, 8).map((c, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + top sources */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Send className="size-4 text-primary" /> Последние рассылки</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setView('broadcasts')}>
                Все <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentBroadcasts.length === 0 ? (
              <EmptyState icon={Send} title="Ещё нет рассылок" description="Отправьте первый дайджест из конструктора." />
            ) : (
              <ul className="divide-y">
                {data.recentBroadcasts.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ChannelBadge type={b.channel.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        className="block max-w-full truncate text-left text-sm font-medium hover:text-primary"
                        onClick={() => openDigest(b.digest.id)}
                      >
                        {b.digest.title}
                      </button>
                      <p className="truncate text-xs text-muted-foreground">
                        {b.channel.name} · {timeAgo(b.createdAt)}
                      </p>
                    </div>
                    <StatusBadge tone={STATUS_TONE[b.status] || 'slate'} label={STATUS_LABEL[b.status] || b.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="size-4 text-amber-500" /> Источники</CardTitle>
            <CardDescription>Топ доменов по числу статей</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSources.length === 0 ? (
              <EmptyState icon={Newspaper} title="Нет данных" description="Сохранённые статьи появятся здесь." />
            ) : (
              <ul className="space-y-2.5">
                {data.topSources.map((s, i) => {
                  const max = data.topSources[0]?.count || 1
                  return (
                    <li key={s.source} className="group">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="text-xs text-muted-foreground">#{i + 1}</span>
                          {s.source}
                        </span>
                        <span className="text-xs text-muted-foreground">{s.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-amber-500 transition-all"
                          style={{ width: `${(s.count / max) * 100}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent articles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Newspaper className="size-4 text-primary" /> Свежие статьи</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView('library')}>
              В библиотеку <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentArticles.length === 0 ? (
            <EmptyState icon={Newspaper} title="Библиотека пуста" description="Найдите и сохраните статьи через поиск."
              action={<Button size="sm" onClick={() => setView('search')}><Search className="size-4" /> К поиску</Button>}
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.recentArticles.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => openArticle(a.id)}
                    className="flex h-full w-full flex-col gap-2 rounded-lg border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <CategoryBadge category={a.category} />
                      <span className="text-xs text-muted-foreground">{timeAgo(a.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.source}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

const BAR_COLORS = [
  'oklch(0.55 0.13 165)',
  'oklch(0.75 0.16 70)',
  'oklch(0.62 0.21 12)',
  'oklch(0.68 0.1 195)',
  'oklch(0.6 0.2 305)',
  'oklch(0.6 0.13 165)',
  'oklch(0.75 0.16 70)',
  'oklch(0.62 0.21 12)',
]
