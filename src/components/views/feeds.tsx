'use client'

import { useEffect, useState } from 'react'
import { useFetch, apiCall } from '@/lib/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryBadge } from '@/components/app/badges'
import { ALL_CATEGORIES } from '@/components/app/badges'
import { timeAgo } from '@/lib/format'
import { toast } from 'sonner'
import { Rss, Plus, Trash2, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Feed {
  id: string; name: string; rsshubRoute: string; category: string | null;
  active: boolean; intervalMin: number; lastFetchedAt: string | null; lastError: string | null;
  createdAt: string
}

export function FeedsView() {
  const { data, loading, refresh } = useFetch<{ total: number; items: Feed[] }>('/api/feeds')
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Feed | null>(null)
  const [fetching, setFetching] = useState(false)

  function openNew() { setEditing(null); setEditOpen(true) }
  function openEdit(f: Feed) { setEditing(f); setEditOpen(true) }

  async function remove(f: Feed) {
    if (!confirm(`Удалить фид «${f.name}»?`)) return
    try {
      await apiCall(`/api/feeds/${f.id}`, 'DELETE')
      toast.success('Удалено')
      void refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') }
  }

  async function toggleActive(f: Feed) {
    try {
      await apiCall(`/api/feeds/${f.id}`, 'PATCH', { active: !f.active })
      void refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') }
  }

  async function fetchNow(f?: Feed) {
    setFetching(true)
    try {
      const res = await apiCall<{ results: { added: number; errors: string[] }[] }>(
        '/api/feeds/fetch', 'POST', f ? { feedId: f.id } : {},
      )
      const total = res.results.reduce((s, r) => s + r.added, 0)
      toast.success(`Получено ${total} новых статей`)
      void refresh()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') } finally {
      setFetching(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data?.total ?? 0}</span> RSS-источников
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchNow()} disabled={fetching}>
            {fetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Обновить все
          </Button>
          <Button onClick={openNew}><Plus className="size-4" /> Добавить</Button>
        </div>
      </div>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((f) => (
          <Card key={f.id} className="group transition-shadow hover:shadow-md">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Rss className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold">{f.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{f.rsshubRoute}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {f.category && <CategoryBadge category={f.category} />}
                <span className="text-xs text-muted-foreground">каждые {f.intervalMin} мин</span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {f.lastError ? (
                    <span className="flex items-center gap-1 text-rose-500"><AlertCircle className="size-3" /> ошибка</span>
                  ) : f.lastFetchedAt ? (
                    <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="size-3" /> {timeAgo(f.lastFetchedAt)}</span>
                  ) : (
                    <span>не загружен</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5">
                    <Switch checked={f.active} onCheckedChange={() => toggleActive(f)} />
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => fetchNow(f)} disabled={fetching} className="h-7">
                    <RefreshCw className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => remove(f)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              {f.lastError && (
                <p className="mt-2 truncate text-xs text-rose-500">{f.lastError}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <FeedEditDialog open={editOpen} onOpenChange={setEditOpen} feed={editing} onSaved={() => { setEditOpen(false); void refresh() }} />
    </div>
  )
}

function FeedEditDialog({ open, onOpenChange, feed, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; feed: Feed | null; onSaved: () => void;
}) {
  const [name, setName] = useState('')
  const [rsshubRoute, setRsshubRoute] = useState('')
  const [category, setCategory] = useState('all')
  const [intervalMin, setIntervalMin] = useState(60)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (feed) {
      setName(feed.name); setRsshubRoute(feed.rsshubRoute)
      setCategory(feed.category || 'all'); setIntervalMin(feed.intervalMin)
    } else {
      setName(''); setRsshubRoute(''); setCategory('all'); setIntervalMin(60)
    }
  }, [feed, open])

  async function save() {
    if (!name.trim() || !rsshubRoute.trim()) {
      toast.error('Название и маршрут обязательны')
      return
    }
    setSaving(true)
    try {
      const data: Record<string, unknown> = { name, rsshubRoute, intervalMin, category: category === 'all' ? null : category }
      if (feed) {
        await apiCall(`/api/feeds/${feed.id}`, 'PATCH', data)
        toast.success('Фид обновлён')
      } else {
        await apiCall('/api/feeds', 'POST', data)
        toast.success('Фид добавлен')
      }
      onSaved()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{feed ? 'Редактировать фид' : 'Новый RSS-фид'}</DialogTitle>
          <DialogDescription>Источник через RSSHub (маршрут после /)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Название</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HH.ru — новости" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">RSSHub маршрут</label>
            <Input value={rsshubRoute} onChange={(e) => setRsshubRoute(e.target.value)} placeholder="hhru/vacancies" />
            <p className="mt-1 text-[11px] text-muted-foreground">Например: <code>hhru/vacancies</code>, <code>vcru/hr</code></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Категория</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Без категории</SelectItem>
                  {ALL_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Интервал (мин)</label>
              <Input type="number" min={5} value={intervalMin} onChange={(e) => setIntervalMin(parseInt(e.target.value) || 60)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
