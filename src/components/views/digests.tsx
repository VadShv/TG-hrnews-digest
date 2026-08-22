'use client'

import { useMemo, useState } from 'react'
import { useFetch, apiCall } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CategoryBadge, StatusBadge } from '@/components/app/badges'
import { DIGEST_COVER_STYLES, DIGEST_STATUSES, HR_CATEGORY_LABELS } from '@/lib/hr'
import { timeAgo, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'
import {
  Plus, Trash2, ArrowUp, ArrowDown, Save, Send, Eye, FileText,
  Loader2, Sparkles, Search, Library as LibraryIcon, X, GripVertical,
  ExternalLink, Calendar,
} from 'lucide-react'

interface Article {
  id: string; title: string; url: string; snippet: string; source: string; category: string | null;
  publishedAt: string | null; starred: boolean; tags: string | null; summary: string | null; createdAt: string;
}
interface DigestItem { id: string; digestId: string; articleId: string; position: number; note: string | null; article: Article }
interface Digest {
  id: string; title: string; subtitle: string | null; intro: string | null; outro: string | null;
  status: string; coverStyle: string | null; tone: string | null; scheduledAt: string | null;
  scheduleEnabled: boolean; autoChannelIds: string[] | null; lastRunAt: string | null; nextRunAt: string | null;
  createdAt: string; updatedAt: string;
  items: DigestItem[];
  broadcasts?: { id: string; status: string; channel: { id: string; name: string; type: string } }[];
  _count?: { items: number; broadcasts: number };
}
interface Channel { id: string; name: string; type: string; target: string; active: boolean; subscriberCount: number }

export function DigestsView() {
  const { activeDigestId, openDigest, clearActiveDigest } = useApp()
  const { data: listData, loading: listLoading, refresh: refreshList } = useFetch<{ total: number; items: Digest[] }>('/api/digests')

  const firstId = listData?.items?.[0]?.id || null
  const effectiveId = activeDigestId || firstId

  const { data: activeData, refresh: refreshActive } = useFetch<{ item: Digest; message: string }>(
    effectiveId ? `/api/digests/${effectiveId}` : null,
  )

  async function createDigest() {
    try {
      const res = await apiCall<{ item: Digest }>('/api/digests', 'POST', { title: 'Новый дайджест' })
      toast.success('Дайджест создан')
      void refreshList()
      openDigest(res.item.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function deleteDigest(d: Digest) {
    if (!confirm(`Удалить дайджест «${d.title}»?`)) return
    try {
      await apiCall(`/api/digests/${d.id}`, 'DELETE')
      toast.success('Удалено')
      if (effectiveId === d.id) clearActiveDigest()
      void refreshList()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* List panel */}
      <div className="space-y-3">
        <Button className="w-full" onClick={createDigest}>
          <Plus className="size-4" /> Новый дайджест
        </Button>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm"><FileText className="size-4 text-primary" /> Дайджесты</CardTitle>
            <CardDescription>{listData?.total ?? 0} всего</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {listLoading && <Skeleton className="h-20" />}
            {!listLoading && listData && listData.items.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">Список пуст</p>
            )}
            <ul className="space-y-1.5">
              {listData?.items.map((d) => {
                const active = effectiveId === d.id
                const st = DIGEST_STATUSES[d.status] || DIGEST_STATUSES.draft
                return (
                  <li key={d.id}>
                    <button
                      onClick={() => openDigest(d.id)}
                      className={`group w-full rounded-lg border p-3 text-left transition-all ${active ? 'border-primary bg-primary/5 shadow-sm' : 'hover:border-primary/30 hover:bg-muted/40'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm font-medium ${active ? 'text-primary' : ''}`}>{d.title}</span>
                        <span className={`size-2 rounded-full ${statusDot(st.tone)}`} />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{d._count?.items ?? 0} статей</span>
                        <span>·</span>
                        <span>{timeAgo(d.updatedAt)}</span>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Editor panel */}
      <div>
        {!activeData?.item && (
          <Card>
            <CardContent className="py-20 text-center">
              <FileText className="mx-auto mb-3 size-12 text-muted-foreground" />
              <h3 className="text-base font-semibold">Выберите дайджест</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Выберите дайджест слева или создайте новый, чтобы начать редактировать.
              </p>
              <Button className="mt-4" onClick={createDigest}>
                <Plus className="size-4" /> Создать дайджест
              </Button>
            </CardContent>
          </Card>
        )}
        {activeData?.item && (
          <DigestEditor
            key={activeData.item.id}
            digest={activeData.item}
            message={activeData.message}
            onChanged={() => {
              void refreshActive()
              void refreshList()
            }}
            onDelete={() => deleteDigest(activeData.item)}
          />
        )}
      </div>
    </div>
  )
}

function statusDot(tone: string): string {
  switch (tone) {
    case 'emerald': return 'bg-emerald-500'
    case 'amber': return 'bg-amber-500'
    case 'sky': return 'bg-cyan-500'
    case 'slate': return 'bg-slate-400'
    case 'rose': return 'bg-rose-500'
    default: return 'bg-slate-400'
  }
}

function DigestEditor({
  digest, message, onChanged, onDelete,
}: {
  digest: Digest; message: string; onChanged: () => void; onDelete: () => void
}) {
  const [title, setTitle] = useState(digest.title)
  const [subtitle, setSubtitle] = useState(digest.subtitle || '')
  const [intro, setIntro] = useState(digest.intro || '')
  const [outro, setOutro] = useState(digest.outro || '')
  const [coverStyle, setCoverStyle] = useState(digest.coverStyle || 'emerald')
  const [status, setStatus] = useState(digest.status || 'draft')
  const [saving, setSaving] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)

  const dirty = useMemo(() => (
    title !== digest.title ||
    subtitle !== (digest.subtitle || '') ||
    intro !== (digest.intro || '') ||
    outro !== (digest.outro || '') ||
    coverStyle !== (digest.coverStyle || 'emerald') ||
    status !== digest.status
  ), [title, subtitle, intro, outro, coverStyle, status, digest])

  async function saveMeta() {
    setSaving(true)
    try {
      await apiCall(`/api/digests/${digest.id}`, 'PATCH', {
        title, subtitle, intro, outro, coverStyle, status,
      })
      toast.success('Сохранено')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(item: DigestItem) {
    try {
      await apiCall(`/api/digests/${digest.id}/items?articleId=${item.articleId}`, 'DELETE')
      toast.success('Удалено из дайджеста')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function moveItem(item: DigestItem, dir: -1 | 1) {
    const items = digest.items
    const idx = items.findIndex((i) => i.id === item.id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const reordered = [...items]
    const [moved] = reordered.splice(idx, 1)
    reordered.splice(newIdx, 0, moved)
    const order = reordered.map((r) => r.id)
    try {
      await apiCall(`/api/digests/${digest.id}/items`, 'PUT', { order })
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function saveNote(item: DigestItem, note: string) {
    try {
      await apiCall(`/api/digests/${digest.id}/items?itemId=${item.id}`, 'PATCH', { note })
      toast.success('Заметка сохранена')
      onChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  const st = DIGEST_STATUSES[status] || DIGEST_STATUSES.draft

  return (
    <div className="space-y-4">
      {/* Header / actions */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusBadge tone={st.tone} label={st.label} />
              <span className="text-xs text-muted-foreground">обновлён {timeAgo(digest.updatedAt)}</span>
            </div>
            <h2 className="mt-1 truncate text-lg font-semibold">{digest.title}</h2>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSendOpen(true)}>
              <Send className="size-4" /> Отправить
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="size-4" /> Удалить
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Editor */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="size-4 text-primary" /> Параметры дайджеста</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Заголовок">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="HR Pulse · Дайджест недели" />
              </Field>
              <Field label="Подзаголовок">
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Подбор · Культура · Технологии" />
              </Field>
              <Field label="Вступление">
                <Textarea rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Главные новости за неделю…" />
              </Field>
              <Field label="Заключение / подпись">
                <Textarea rows={2} value={outro} onChange={(e) => setOutro(e.target.value)} placeholder="До встречи в следующем выпуске!" />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Статус">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DIGEST_STATUSES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Обложка">
                  <Select value={coverStyle} onValueChange={setCoverStyle}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIGEST_COVER_STYLES.map((c) => (
                        <SelectItem key={c.key} value={c.key}>
                          <span className="flex items-center gap-2">
                            <span className="size-3 rounded-full" style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }} />
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={saveMeta} disabled={!dirty || saving} size="sm">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Items list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LibraryIcon className="size-4 text-amber-500" /> Статьи в дайджесте
                  <Badge variant="secondary" className="ml-1">{digest.items.length}</Badge>
                </CardTitle>
                <Button size="sm" onClick={() => setPickOpen(true)}>
                  <Plus className="size-4" /> Добавить статьи
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {digest.items.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center">
                  <FileText className="mx-auto mb-2 size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">В дайджесте нет статей</p>
                  <p className="mt-1 text-xs text-muted-foreground">Добавьте статьи из библиотеки или поиска.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setPickOpen(true)}>
                    <Plus className="size-4" /> Добавить
                  </Button>
                </div>
              ) : (
                <ol className="space-y-2">
                  {digest.items.map((item, i) => (
                    <DigestItemCard
                      key={item.id}
                      item={item}
                      index={i}
                      total={digest.items.length}
                      onMove={(d) => moveItem(item, d)}
                      onRemove={() => removeItem(item)}
                      onSaveNote={(note) => saveNote(item, note)}
                    />
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <ScheduleCard digest={digest} onChanged={onChanged} />
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm"><Eye className="size-4 text-primary" /> Предпросмотр</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-hidden rounded-xl ring-1 ring-border">
                {/* Cover */}
                {(() => {
                  const cs = DIGEST_COVER_STYLES.find((c) => c.key === coverStyle) || DIGEST_COVER_STYLES[0]
                  return (
                    <div
                      className="relative p-4 text-white"
                      style={{ background: `linear-gradient(135deg, ${cs.from}, ${cs.to})` }}
                    >
                      <p className="text-xs font-medium uppercase tracking-wider opacity-80">HR Pulse Digest</p>
                      <p className="mt-1 text-base font-bold leading-tight">{title || 'Без названия'}</p>
                      {subtitle && <p className="mt-0.5 text-xs opacity-90">{subtitle}</p>}
                      <div className="mt-3 flex items-center gap-2 text-[10px] opacity-80">
                        <span>{digest.items.length} статей</span>
                        <span>·</span>
                        <span>{formatDate(new Date())}</span>
                      </div>
                    </div>
                  )
                })()}
                {/* Body */}
                <div className="max-h-80 overflow-y-auto scroll-area-thin bg-card p-4 text-sm">
                  {intro && <p className="mb-3 text-muted-foreground">{intro}</p>}
                  <ol className="space-y-3">
                    {digest.items.map((item, i) => (
                      <li key={item.id} className="flex gap-2">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{item.article.title}</p>
                          <p className="text-xs text-muted-foreground">{item.article.source}</p>
                          {item.note && <p className="mt-0.5 text-xs italic text-amber-600">💬 {item.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                  {outro && <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">{outro}</p>}
                  <p className="mt-2 text-[10px] text-muted-foreground">— HR Pulse Bot</p>
                </div>
              </div>
              {/* Raw message */}
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">Показать текст сообщения</summary>
                <pre className="mt-2 max-h-48 overflow-y-auto scroll-area-thin rounded-md bg-muted/40 p-2 text-[10px] whitespace-pre-wrap">{message}</pre>
              </details>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pick articles dialog */}
      <PickArticlesDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        digestId={digest.id}
        existingIds={new Set(digest.items.map((i) => i.articleId))}
        onAdded={() => {
          setPickOpen(false)
          onChanged()
        }}
      />

      {/* Send dialog */}
      <SendDigestDialog
        open={sendOpen}
        onOpenChange={setSendOpen}
        digest={digest}
        onSent={() => {
          setSendOpen(false)
          onChanged()
        }}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function DigestItemCard({
  item, index, total, onMove, onRemove, onSaveNote,
}: {
  item: DigestItem; index: number; total: number;
  onMove: (d: -1 | 1) => void; onRemove: () => void; onSaveNote: (note: string) => void;
}) {
  const [showNote, setShowNote] = useState(false)
  const [note, setNote] = useState(item.note || '')
  return (
    <li className="rounded-lg border bg-card p-3 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>
          <button onClick={() => onMove(-1)} disabled={index === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30" aria-label="Вверх">
            <ArrowUp className="size-3.5" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30" aria-label="Вниз">
            <ArrowDown className="size-3.5" />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <a href={item.article.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
              {item.article.title}
            </a>
            <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Удалить">
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CategoryBadge category={item.article.category} />
            <span className="text-xs text-muted-foreground">{item.article.source}</span>
          </div>
          {item.note && !showNote && (
            <p className="mt-1.5 text-xs italic text-amber-600">💬 {item.note}</p>
          )}
          {showNote ? (
            <div className="mt-2 space-y-1.5">
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Заметка редактора к этой статье…"
                className="text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onSaveNote(note); setShowNote(false) }}>
                  <Save className="size-3" /> Сохранить
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setNote(item.note || ''); setShowNote(false) }}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNote(true)} className="mt-1.5 text-xs text-primary hover:underline">
              {item.note ? 'Изменить заметку' : '+ Добавить заметку'}
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function PickArticlesDialog({
  open, onOpenChange, digestId, existingIds, onAdded,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; digestId: string; existingIds: Set<string>; onAdded: () => void;
}) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (category && category !== 'all') p.set('category', category)
    p.set('limit', '60')
    return `/api/news?${p.toString()}`
  }, [q, category])

  const { data, loading } = useFetch<{ items: Article[] }>(open ? query : null)

  async function addSelected() {
    if (selected.size === 0) return
    setAdding(true)
    try {
      const ids = Array.from(selected)
      await apiCall(`/api/digests/${digestId}/items`, 'POST', { articleIds: ids })
      toast.success(`Добавлено ${ids.length} статей`)
      setSelected(new Set())
      onAdded()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить статьи из библиотеки</DialogTitle>
          <DialogDescription>Выберите статьи для добавления в дайджест</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск…" className="pl-9" />
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px] text-xs"><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {Object.entries(HR_CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto scroll-area-thin pr-1">
            {loading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            {!loading && data?.items.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Ничего не найдено</p>
            )}
            {data?.items.map((a) => {
              const isIn = existingIds.has(a.id)
              const checked = selected.has(a.id)
              return (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-2.5 transition-all ${checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'} ${isIn ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={isIn}
                    onChange={(e) => {
                      setSelected((s) => {
                        const ns = new Set(s)
                        if (e.target.checked) ns.add(a.id)
                        else ns.delete(a.id)
                        return ns
                      })
                    }}
                    className="mt-1 size-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={a.category} />
                      {isIn && <Badge variant="outline" className="text-[10px]">уже в дайджесте</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.source} · {timeAgo(a.publishedAt || a.createdAt)}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <span className="mr-auto text-xs text-muted-foreground">Выбрано: {selected.size}</span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={addSelected} disabled={selected.size === 0 || adding}>
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Добавить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SendDigestDialog({
  open, onOpenChange, digest, onSent,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; digest: Digest; onSent: () => void;
}) {
  const { data, loading } = useFetch<{ items: Channel[] }>(open ? '/api/channels?active=1' : null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ total: number; delivered: number; failed: number } | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Select-all-by-default when channels first load (adjust state during render, per React docs)
  if (!initialized && data?.items?.length) {
    setInitialized(true)
    setSelected(new Set(data.items.map((c) => c.id)))
  }

  async function send() {
    if (selected.size === 0) {
      toast.error('Выберите хотя бы один канал')
      return
    }
    setSending(true)
    setResult(null)
    try {
      const res = await apiCall<{ total: number; delivered: number; failed: number }>(
        '/api/broadcast', 'POST',
        { digestId: digest.id, channelIds: Array.from(selected) },
      )
      setResult({ total: res.total, delivered: res.delivered, failed: res.failed })
      if (res.failed === 0) toast.success(`Отправлено в ${res.delivered} каналов`)
      else toast.warning(`Доставлено ${res.delivered}, ошибок ${res.failed}`)
      setTimeout(() => onSent(), 800)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка отправки')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Send className="size-4 text-primary" /> Отправка дайджеста</DialogTitle>
          <DialogDescription>{digest.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {loading && <Skeleton className="h-20" />}
          {data?.items.length === 0 && (
            <div className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
              Нет активных каналов. Добавьте канал в разделе «Каналы».
            </div>
          )}
          {data?.items.map((c) => {
            const checked = selected.has(c.id)
            return (
              <label key={c.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 ${checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    setSelected((s) => {
                      const ns = new Set(s)
                      if (e.target.checked) ns.add(c.id)
                      else ns.delete(c.id)
                      return ns
                    })
                  }}
                  className="size-4 accent-primary"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.type} · {c.subscriberCount} подписчиков</p>
                </div>
              </label>
            )
          })}
          {result && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950/40">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">Готово!</p>
              <p className="text-xs">Доставлено: {result.delivered} · Ошибок: {result.failed} · Всего: {result.total}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
          <Button onClick={send} disabled={selected.size === 0 || sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sending ? 'Отправка…' : `Отправить (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ScheduleCard({ digest, onChanged }: { digest: Digest; onChanged: () => void }) {
  const [enabled, setEnabled] = useState(digest.scheduleEnabled)
  const [selected, setSelected] = useState<Set<string>>(new Set((digest.autoChannelIds as string[]) || []))
  const [saving, setSaving] = useState(false)
  const { data, loading } = useFetch<{ items: Channel[] }>('/api/channels?active=1')

  async function save() {
    setSaving(true)
    try {
      await apiCall(`/api/digests/${digest.id}`, 'PATCH', {
        scheduleEnabled: enabled,
        autoChannelIds: Array.from(selected),
      })
      toast.success(enabled ? 'Авто-отправка включена' : 'Авто-отправка выключена')
      onChanged()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') } finally { setSaving(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Calendar className="size-4 text-primary" /> Авто-отправка по расписанию</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Включить авто-отправку</p>
            <p className="text-xs text-muted-foreground">Расписание берётся из настроек бота (время + частота)</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </label>
        {enabled && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Каналы для авто-отправки:</p>
            {loading && <Skeleton className="h-16" />}
            {data?.items.length === 0 && <p className="text-xs text-muted-foreground">Нет активных каналов</p>}
            <div className="space-y-1.5">
              {data?.items.map((c) => {
                const checked = selected.has(c.id)
                return (
                  <label key={c.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm ${checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}>
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      setSelected((s) => { const ns = new Set(s); if (e.target.checked) ns.add(c.id); else ns.delete(c.id); return ns })
                    }} className="size-4 accent-primary" />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground">{c.type}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
        {digest.lastRunAt && (
          <p className="text-xs text-muted-foreground">Последняя отправка: {timeAgo(digest.lastRunAt)}</p>
        )}
        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Сохранить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
