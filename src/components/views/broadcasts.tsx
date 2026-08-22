'use client'

import { useMemo, useState } from 'react'
import { useFetch } from '@/lib/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { StatusBadge, ChannelBadge } from '@/components/app/badges'
import { BROADCAST_STATUSES } from '@/lib/hr'
import { formatDate, timeAgo } from '@/lib/format'
import { useApp } from '@/lib/store'
import {
  History, Send, CheckCircle2, XCircle, Clock, Eye, Copy,
} from 'lucide-react'
import { toast } from 'sonner'

interface Broadcast {
  id: string
  digestId: string
  channelId: string
  status: string
  message: string | null
  errorMessage: string | null
  sentAt: string | null
  deliveredAt: string | null
  createdAt: string
  channel: { id: string; name: string; type: string }
  digest: { id: string; title: string; coverStyle: string | null }
}

export function BroadcastsView() {
  const [status, setStatus] = useState<string>('')
  const [active, setActive] = useState<Broadcast | null>(null)
  const { openDigest } = useApp()

  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    p.set('limit', '100')
    return `/api/broadcasts?${p.toString()}`
  }, [status])

  const { data, loading } = useFetch<{ total: number; items: Broadcast[] }>(url)

  const stats = useMemo(() => {
    const sent = data?.items.filter((b) => b.status === 'sent' || b.status === 'delivered').length ?? 0
    const failed = data?.items.filter((b) => b.status === 'failed').length ?? 0
    const pending = data?.items.filter((b) => b.status === 'pending').length ?? 0
    return { sent, failed, pending }
  }, [data])

  return (
    <div className="space-y-5">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 py-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Доставлено</p>
              <p className="text-xl font-bold">{stats.sent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 py-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ошибок</p>
              <p className="text-xl font-bold">{stats.failed}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-3 py-0">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">В очереди</p>
              <p className="text-xl font-bold">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={status === '' ? 'default' : 'outline'} size="sm" onClick={() => setStatus('')}>
          Все ({data?.total ?? 0})
        </Button>
        {Object.entries(BROADCAST_STATUSES).map(([k, v]) => {
          const count = data?.items.filter((b) => b.status === k).length ?? 0
          return (
            <Button key={k} variant={status === k ? 'default' : 'outline'} size="sm" onClick={() => setStatus(k)}>
              {v.label} ({count})
            </Button>
          )
        })}
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <History className="mx-auto mb-3 size-12 text-muted-foreground" />
            <h3 className="text-base font-semibold">История пуста</h3>
            <p className="mt-1 text-sm text-muted-foreground">Отправьте первый дайджест из раздела «Дайджесты».</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {data?.items.map((b) => {
          const st = BROADCAST_STATUSES[b.status] || BROADCAST_STATUSES.pending
          return (
            <Card key={b.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex items-center gap-3 py-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <ChannelBadge type={b.channel.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <button onClick={() => openDigest(b.digest.id)} className="block max-w-full truncate text-left text-sm font-medium hover:text-primary">
                    {b.digest.title}
                  </button>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.channel.name} · {formatDate(b.createdAt, true)} · {timeAgo(b.createdAt)}
                  </p>
                  {b.errorMessage && (
                    <p className="mt-0.5 truncate text-xs text-rose-500">⚠ {b.errorMessage}</p>
                  )}
                </div>
                <StatusBadge tone={st.tone} label={st.label} />
                <Button size="icon" variant="ghost" className="size-8" onClick={() => setActive(b)} aria-label="Просмотр">
                  <Eye className="size-4" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detail sheet */}
      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {active && (
            <>
              <SheetHeader>
                <SheetDescription className="text-xs">{active.channel.name} · {formatDate(active.createdAt, true)}</SheetDescription>
                <SheetTitle className="text-base leading-snug">{active.digest.title}</SheetTitle>
                <div className="mt-2 flex items-center gap-2">
                  <ChannelBadge type={active.channel.type} />
                  <StatusBadge tone={(BROADCAST_STATUSES[active.status] || BROADCAST_STATUSES.pending).tone} label={(BROADCAST_STATUSES[active.status] || BROADCAST_STATUSES.pending).label} />
                </div>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {active.sentAt && (
                  <div className="rounded-md bg-muted/40 p-2.5 text-xs">
                    <p className="flex items-center gap-1.5 text-muted-foreground"><Send className="size-3.5" /> Отправлено: {formatDate(active.sentAt, true)}</p>
                  </div>
                )}
                {active.message && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground">Текст сообщения</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { navigator.clipboard.writeText(active.message || ''); toast.success('Скопировано') }}
                      >
                        <Copy className="size-3" /> Копировать
                      </Button>
                    </div>
                    <pre className="max-h-80 overflow-y-auto scroll-area-thin whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed">
                      {active.message}
                    </pre>
                  </div>
                )}
                <Button className="w-full" variant="outline" onClick={() => { openDigest(active.digest.id); setActive(null) }}>
                  Открыть дайджест
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
