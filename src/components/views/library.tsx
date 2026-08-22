'use client'

import { useMemo, useState } from 'react'
import { useFetch, apiCall } from '@/lib/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryBadge } from '@/components/app/badges'
import { ALL_CATEGORIES } from '@/components/app/badges'
import { timeAgo, formatDate, hostFromUrl } from '@/lib/format'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'
import {
  Star, Archive, Trash2, ExternalLink, Search as SearchIcon, Loader2,
  Newspaper, Sparkles, Tag, Clock, Library as LibraryIcon, FileText, Save,
} from 'lucide-react'
import { HR_CATEGORY_LABELS } from '@/lib/hr'

interface Article {
  id: string
  title: string
  url: string
  snippet: string
  source: string
  author: string | null
  publishedAt: string | null
  category: string | null
  tags: string | null
  editorNote: string | null
  imageUrl: string | null
  summary: string | null
  readingTime: number | null
  starred: boolean
  archived: boolean
  createdAt: string
}

export function LibraryView() {
  const { activeArticleId, clearActiveArticle, openArticle } = useApp()
  const [category, setCategory] = useState<string>('all')
  const [starredOnly, setStarredOnly] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('newest')

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (category && category !== 'all') p.set('category', category)
    if (starredOnly) p.set('starred', '1')
    if (showArchived) p.set('archived', '1')
    if (q) p.set('q', q)
    if (sort) p.set('sort', sort)
    return `/api/news?${p.toString()}`
  }, [category, starredOnly, showArchived, q, sort])

  const { data, loading, refresh } = useFetch<{ total: number; items: Article[] }>(query)
  const { data: activeArticle, refresh: refreshActive } = useFetch<{ item: Article }>(
    activeArticleId ? `/api/news/${activeArticleId}` : null,
  )

  const activeId = activeArticleId

  async function toggleStar(a: Article) {
    try {
      await apiCall(`/api/news/${a.id}`, 'PATCH', { starred: !a.starred })
      toast.success(a.starred ? 'Убрано из избранного' : 'Добавлено в избранное')
      void refresh()
      if (activeId === a.id) void refreshActive()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function toggleArchive(a: Article) {
    try {
      await apiCall(`/api/news/${a.id}`, 'PATCH', { archived: !a.archived })
      toast.success(a.archived ? 'Восстановлено' : 'Архивировано')
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function remove(a: Article) {
    if (!confirm(`Удалить статью «${a.title}»?`)) return
    try {
      await apiCall(`/api/news/${a.id}`, 'DELETE')
      toast.success('Удалено')
      if (activeId === a.id) clearActiveArticle()
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function summarize(a: Article) {
    if (a.summary) return
    toast.info('Генерация сводки…')
    try {
      const res = await apiCall<{ summary: string }>(`/api/news/${a.id}/summarize`, 'POST', {})
      toast.success('Сводка готова')
      void refresh()
      if (activeId === a.id) void refreshActive()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка генерации')
    }
  }

  async function saveNote(a: Article, note: string) {
    try {
      await apiCall(`/api/news/${a.id}`, 'PATCH', { editorNote: note })
      toast.success('Сохранено')
      if (activeId === a.id) void refreshActive()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по заголовку, источнику, описанию…"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-[160px] text-xs">
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {ALL_CATEGORIES.map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="h-9 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Сначала новые</SelectItem>
                  <SelectItem value="oldest">Сначала старые</SelectItem>
                  <SelectItem value="starred">Избранные</SelectItem>
                  <SelectItem value="title">По алфавиту</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={starredOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStarredOnly((v) => !v)}
              >
                <Star className="size-4" /> Избранные
              </Button>
              <Button
                variant={showArchived ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowArchived((v) => !v)}
              >
                <Archive className="size-4" /> Архив
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Library grid */}
      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <LibraryIcon className="mx-auto mb-3 size-10 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Библиотека пуста</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Найдите HR-новости через поиск и сохраните их — они появятся здесь.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && data && data.items.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Всего <span className="font-semibold text-foreground">{data.total}</span> статей
          </p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((a) => (
              <Card
                key={a.id}
                className={`group flex flex-col gap-0 transition-shadow hover:shadow-md ${a.archived ? 'opacity-60' : ''}`}
              >
                <CardContent className="flex flex-1 flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <CategoryBadge category={a.category} />
                    <button onClick={() => toggleStar(a)} aria-label="В избранное">
                      <Star className={`size-4 transition-colors ${a.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground hover:text-amber-400'}`} />
                    </button>
                  </div>
                  <button onClick={() => openArticle(a.id)} className="text-left">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary">{a.title}</p>
                  </button>
                  <p className="line-clamp-3 flex-1 text-xs text-muted-foreground">{a.snippet}</p>
                  {a.summary && (
                    <div className="rounded-md bg-primary/5 p-2 text-[11px] leading-relaxed text-primary ring-1 ring-primary/10">
                      <span className="font-medium">AI-сводка: </span>{a.summary}
                    </div>
                  )}
                  <div className="mt-1 flex items-center justify-between gap-2 border-t pt-2">
                    <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                      <span className="truncate">{a.source}</span>
                      <span className="mx-1">·</span>
                      <span>{timeAgo(a.publishedAt || a.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => openArticle(a.id)} aria-label="Открыть">
                        <ExternalLink className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => toggleArchive(a)} aria-label="Архив">
                        <Archive className="size-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => remove(a)} aria-label="Удалить">
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Article detail sheet */}
      <Sheet open={!!activeArticleId} onOpenChange={(o) => !o && clearActiveArticle()}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {activeArticle?.item && (
            <>
              <SheetHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge category={activeArticle.item.category} />
                  {activeArticle.item.starred && <span className="inline-flex items-center gap-1 text-xs text-amber-600"><Star className="size-3 fill-current" /> в избранном</span>}
                </div>
                <SheetTitle className="text-lg leading-snug">{activeArticle.item.title}</SheetTitle>
                <SheetDescription className="text-xs">
                  {activeArticle.item.source} · {activeArticle.item.author || 'автор не указан'} · {formatDate(activeArticle.item.publishedAt || activeArticle.item.createdAt, true)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed">
                  {activeArticle.item.snippet}
                </div>

                {activeArticle.item.summary && (
                  <div className="rounded-lg bg-primary/5 p-3 ring-1 ring-primary/20">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <Sparkles className="size-3.5" /> AI-сводка
                    </p>
                    <p className="text-sm leading-relaxed">{activeArticle.item.summary}</p>
                  </div>
                )}

                <Button
                  variant={activeArticle.item.summary ? 'outline' : 'default'}
                  className="w-full"
                  onClick={() => summarize(activeArticle.item)}
                  disabled={!!activeArticle.item.summary}
                >
                  <Sparkles className="size-4" /> {activeArticle.item.summary ? 'Сводка уже сгенерирована' : 'Сгенерировать AI-сводку'}
                </Button>

                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Tag className="size-3.5" /> Заметки редактора
                  </label>
                  <NoteEditor
                    key={activeArticle.item.id}
                    initial={activeArticle.item.editorNote || ''}
                    onSave={(v) => saveNote(activeArticle.item, v)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-muted-foreground">Категория</p>
                    <p className="font-medium">{activeArticle.item.category ? HR_CATEGORY_LABELS[activeArticle.item.category] || activeArticle.item.category : '—'}</p>
                  </div>
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3" /> Время чтения</p>
                    <p className="font-medium">{activeArticle.item.readingTime || '—'} мин</p>
                  </div>
                  <div className="col-span-2 rounded-md bg-muted/40 p-2">
                    <p className="text-muted-foreground">Источник</p>
                    <p className="truncate font-medium">{hostFromUrl(activeArticle.item.url)}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <a href={activeArticle.item.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" /> Открыть оригинал
                    </a>
                  </Button>
                  <Button variant="outline" onClick={() => toggleStar(activeArticle.item)}>
                    <Star className={`size-4 ${activeArticle.item.starred ? 'fill-current text-amber-400' : ''}`} />
                    {activeArticle.item.starred ? 'В избранном' : 'В избранное'}
                  </Button>
                </div>
              </div>
            </>
          )}
          {!activeArticle && activeId && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function NoteEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)
  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        placeholder="Заметки для редактора дайджеста…"
        className="text-sm"
      />
      <Button
        size="sm"
        disabled={saving || value === initial}
        onClick={async () => {
          setSaving(true)
          await onSave(value)
          setSaving(false)
        }}
      >
        <Save className="size-3.5" /> {saving ? 'Сохранение…' : 'Сохранить заметку'}
      </Button>
    </div>
  )
}
