'use client'

import { useState } from 'react'
import { useFetch, apiCall } from '@/lib/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryBadge } from '@/components/app/badges'
import { ALL_CATEGORIES } from '@/components/app/badges'
import { timeAgo, hostFromUrl } from '@/lib/format'
import { toast } from 'sonner'
import { useApp } from '@/lib/store'
import {
  Search, ExternalLink, Loader2, Sparkles, History, Newspaper, FilePlus, Clock, Filter, BookOpen,
} from 'lucide-react'

interface SearchResult {
  id: string; url: string; title: string; snippet: string; source: string;
  date: string | null; category: string | null; readingTime: number | null;
  summary: string | null; score: number; semScore: number; ftsScore: number; inLibrary: boolean;
}
interface SearchResponse { query: string; total: number; results: SearchResult[] }
interface HistoryItem { id: string; query: string; category: string | null; resultCount: number; createdAt: string }

export function SearchView() {
  const { setView, openArticle, openDigest } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [mode, setMode] = useState('hybrid')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [digests, setDigests] = useState<{ id: string; title: string }[]>([])
  const [digestAddFor, setDigestAddFor] = useState<string | null>(null)

  const { data: history, refresh: refreshHistory } = useFetch<{ history: HistoryItem[] }>('/api/news/search')

  async function runSearch(q?: string) {
    const finalQuery = (q ?? query).trim()
    if (!finalQuery) { toast.error('Введите поисковый запрос'); return }
    setQuery(finalQuery)
    setLoading(true); setResults(null)
    try {
      const body: Record<string, unknown> = { query: finalQuery, num: 24, mode }
      if (category !== 'all') body.category = category
      const res = await apiCall<SearchResponse>('/api/news/search', 'POST', body)
      setResults(res.results)
      void refreshHistory()
      if (res.total === 0) toast.info('Ничего не найдено — попробуйте другой запрос или режим')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка поиска') } finally { setLoading(false) }
  }

  async function addToDigest(r: SearchResult) {
    if (digests.length === 0) {
      try {
        const res = await apiCall<{ items: { id: string; title: string }[] }>('/api/digests', 'GET')
        setDigests(res.items.map((d) => ({ id: d.id, title: d.title })))
      } catch { /* ignore */ }
    }
    setDigestAddFor(r.url)
  }

  async function confirmAddToDigest(digestId: string, r: SearchResult) {
    try {
      await apiCall(`/api/digests/${digestId}/items`, 'POST', {
        article: { title: r.title, url: r.url, snippet: r.snippet, source: r.source, category: r.category },
      })
      toast.success('Добавлено в дайджест')
      setDigestAddFor(null); openDigest(digestId)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="py-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder="Семантический поиск: «гибридный график», «зарплаты IT», «выгорание команды»…"
                  className="h-11 pl-9 text-base"
                />
              </div>
              <Button size="lg" onClick={() => runSearch()} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                {loading ? 'Поиск…' : 'Найти'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="size-3.5 text-muted-foreground" />
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Все категории" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {ALL_CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">Гибридный</SelectItem>
                  <SelectItem value="semantic">Семантический</SelectItem>
                  <SelectItem value="fts">Полнотекстовый</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}

          {!loading && results && results.length === 0 && (
            <Card><CardContent className="py-12 text-center">
              <Newspaper className="mx-auto mb-3 size-10 text-muted-foreground" />
              <p className="text-sm font-medium">Ничего не найдено</p>
              <p className="text-xs text-muted-foreground">Попробуйте другой запрос, режим или добавьте источники RSS.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => setView('feeds')}><BookOpen className="size-4" /> К источникам</Button>
            </CardContent></Card>
          )}

          {!loading && results && results.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">Найдено <span className="font-semibold text-foreground">{results.length}</span> статей</p>
              {results.map((r) => (
                <Card key={r.id} className="group transition-shadow hover:shadow-md">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Newspaper className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <CategoryBadge category={r.category} />
                          {r.date && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{timeAgo(r.date)}</span>}
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{Math.round(r.score * 100)}% релевантности</Badge>
                        </div>
                        <a href={r.url} target="_blank" rel="noreferrer" className="mt-1.5 block font-medium leading-snug hover:text-primary">{r.title}</a>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.summary || r.snippet}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="truncate text-xs text-muted-foreground">{hostFromUrl(r.url)}</span>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <Button variant="ghost" size="sm" asChild><a href={r.url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" /> Открыть</a></Button>
                            <Button variant="outline" size="sm" onClick={() => addToDigest(r)} className="h-8"><FilePlus className="size-3.5" /> В дайджест</Button>
                            <Button variant="secondary" size="sm" onClick={() => openArticle(r.id)} className="h-8"><BookOpen className="size-3.5" /> Карточка</Button>
                          </div>
                        </div>
                        {digestAddFor === r.url && digests.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 rounded-md border bg-muted/30 p-2">
                            {digests.map((d) => (
                              <button key={d.id} onClick={() => confirmAddToDigest(d.id, r)} className="rounded-md bg-card px-2.5 py-1 text-xs font-medium ring-1 ring-border hover:bg-primary hover:text-primary-foreground">+ {d.title}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {!loading && !results && (
            <Card><CardContent className="py-16 text-center">
              <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Sparkles className="size-7" /></div>
              <h3 className="text-base font-semibold">Семантический поиск по корпусу HR-новостей</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Введите запрос — поиск найдёт релевантные статьи по смыслу (векторный поиск) и по словам (полнотекстовый). Статьи собираются из RSS и Telegram.
              </p>
            </CardContent></Card>
          )}
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="pt-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><History className="size-4 text-primary" /> История поиска</h3>
            {!history?.history || history.history.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">История пуста</p>
            ) : (
              <ul className="space-y-2">
                {history.history.map((h) => (
                  <li key={h.id}>
                    <button onClick={() => { setQuery(h.query); void runSearch(h.query) }} className="flex w-full items-center gap-2 rounded-lg border bg-card p-2.5 text-left transition-all hover:border-primary/40 hover:shadow-sm">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Search className="size-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{h.query}</p>
                        <p className="text-xs text-muted-foreground">{h.resultCount} рез. · {timeAgo(h.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
