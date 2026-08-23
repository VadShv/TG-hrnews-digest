'use client'

import { useEffect, useState } from 'react'
import { useFetch, apiCall } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Bot, Save, Loader2, Clock, Globe, Languages, Signature, Sparkles,
  Calendar, Bell, ShieldCheck, KeyRound, Cpu, CheckCircle2, XCircle, AlertCircle, Zap,
} from 'lucide-react'

interface Settings { [key: string]: string }

interface TestResult {
  chatOk: boolean
  embedOk: boolean
  embedDim: number
  expectedDim: number
  dimMatch: boolean
  errors: string[]
}

export function SettingsView() {
  const { data, loading, refresh } = useFetch<{ settings: Settings }>('/api/settings')
  const [form, setForm] = useState<Settings>({})
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  useEffect(() => {
    if (data?.settings) setForm(data.settings)
  }, [data])

  function set(k: string, v: string) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      await apiCall('/api/settings', 'PUT', form)
      toast.success('Настройки сохранены')
      setForm((s) => ({ ...s, ['llm.apiKey' as string]: '' }))
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await apiCall<TestResult>('/api/settings/llm/test', 'POST', {
        baseUrl: form['llm.baseUrl'] || '',
        apiKey: form['llm.apiKey'] || '',
        model: form['llm.model'] || '',
        embedModel: form['llm.embedModel'] || '',
      })
      setTestResult(res)
      if (res.chatOk && res.embedOk && res.dimMatch) toast.success('Подключение успешно')
      else if (res.chatOk && res.embedOk) toast.warning('Подключение есть, но размерность не совпадает')
      else toast.error('Подключение не удалось')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка теста')
    } finally {
      setTesting(false)
    }
  }

  if (loading || !data) {
    return <Skeleton className="h-96 rounded-xl" />
  }

  const llmConfigured = form['llm.apiKeySet'] === 'true'

  return (
    <div className="space-y-6">
      {/* Bot identity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="size-4 text-primary" /> Идентичность бота</CardTitle>
          <CardDescription>Как бот представляется в каналах</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field icon={Bot} label="Имя бота" hint="Отображается в подписи">
            <Input value={form['bot.name'] || ''} onChange={(e) => set('bot.name', e.target.value)} placeholder="HR News Digest Bot" />
          </Field>
          <Field icon={Bot} label="Username" hint="Telegram-username">
            <Input value={form['bot.username'] || ''} onChange={(e) => set('bot.username', e.target.value)} placeholder="@hr_news_digest_bot" />
          </Field>
          <Field icon={Signature} label="Подпись" hint="В конце каждого дайджеста">
            <Input value={form['bot.signature'] || ''} onChange={(e) => set('bot.signature', e.target.value)} placeholder="— HR News Digest Bot · новости из мира HR" />
          </Field>
          <Field icon={Sparkles} label="Тон по умолчанию" hint="Стиль сообщений">
            <Select value={form['bot.defaultTone']} onValueChange={(v) => set('bot.defaultTone', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Профессиональный</SelectItem>
                <SelectItem value="friendly">Дружелюбный</SelectItem>
                <SelectItem value="bold">Дерзкий</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="size-4 text-amber-500" /> Расписание рассылки</CardTitle>
          <CardDescription>Когда бот автоматически отправляет дайджест</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field icon={Clock} label="Время отправки" hint="Локальное время">
            <Input type="time" value={form['bot.schedule'] || ''} onChange={(e) => set('bot.schedule', e.target.value)} />
          </Field>
          <Field icon={Calendar} label="Частота" hint="Периодичность">
            <Select value={form['bot.frequency']} onValueChange={(v) => set('bot.frequency', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Ежедневно</SelectItem>
                <SelectItem value="weekdays">По будням</SelectItem>
                <SelectItem value="weekly">Еженедельно</SelectItem>
                <SelectItem value="monthly">Ежемесячно</SelectItem>
                <SelectItem value="manual">Только вручную</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field icon={Globe} label="Часовой пояс" hint="Зона расписания">
            <Select value={form['bot.timezone']} onValueChange={(v) => set('bot.timezone', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Moscow">Europe/Moscow (UTC+3)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (UTC+4)</SelectItem>
                <SelectItem value="Asia/Yekaterinburg">Asia/Yekaterinburg (UTC+5)</SelectItem>
                <SelectItem value="Asia/Tashkent">Asia/Tashkent (UTC+5)</SelectItem>
                <SelectItem value="Asia/Almaty">Asia/Almaty (UTC+6)</SelectItem>
                <SelectItem value="Asia/Krasnoyarsk">Asia/Krasnoyarsk (UTC+7)</SelectItem>
                <SelectItem value="Asia/Irkutsk">Asia/Irkutsk (UTC+8)</SelectItem>
                <SelectItem value="Asia/Yakutsk">Asia/Yakutsk (UTC+9)</SelectItem>
                <SelectItem value="Asia/Vladivostok">Asia/Vladivostok (UTC+10)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field icon={Sparkles} label="Максимум статей в дайджесте" hint="Рекомендуем 5–7">
            <Input type="number" min={1} max={20} value={form['bot.maxItems'] || '7'} onChange={(e) => set('bot.maxItems', e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      {/* AI model (Cloud.ru) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Cpu className="size-4 text-primary" /> AI-модель (Cloud.ru)</CardTitle>
              <CardDescription>OpenAI-совместимый endpoint для сводок и эмбеддингов</CardDescription>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${llmConfigured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
              {llmConfigured ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
              {llmConfigured ? 'Подключено' : 'Не настроено'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field icon={Globe} label="Base URL" hint="Напр. https://llm.cloud.ru/v1">
              <Input value={form['llm.baseUrl'] || ''} onChange={(e) => set('llm.baseUrl', e.target.value)} placeholder="https://llm.cloud.ru/v1" />
            </Field>
            <Field icon={KeyRound} label="API-ключ" hint={form['llm.apiKeyMasked'] ? `Текущий: ${form['llm.apiKeyMasked']}` : 'Шифруется и хранится в БД'}>
              <Input type="password" value={form['llm.apiKey'] || ''} onChange={(e) => set('llm.apiKey', e.target.value)} placeholder={form['llm.apiKeyMasked'] || 'Введите API-ключ'} />
            </Field>
            <Field icon={Bot} label="Модель (chat)" hint="Для AI-сводок">
              <Input value={form['llm.model'] || ''} onChange={(e) => set('llm.model', e.target.value)} placeholder="gpt-4o-mini" />
            </Field>
            <Field icon={Sparkles} label="Embedding-модель" hint="Для семантического поиска">
              <Input value={form['llm.embedModel'] || ''} onChange={(e) => set('llm.embedModel', e.target.value)} placeholder="text-embedding-3-small" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              Проверить подключение
            </Button>
            <span className="text-xs text-muted-foreground">Размерность колонки БД: <span className="font-medium">{form['llm.embedDim'] || '4096'}</span></span>
          </div>

          {testResult && (
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  {testResult.chatOk ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-rose-500" />}
                  Chat: {testResult.chatOk ? 'OK' : 'ошибка'}
                </span>
                <span className="flex items-center gap-1.5">
                  {testResult.embedOk ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-rose-500" />}
                  Embeddings: {testResult.embedOk ? 'OK' : 'ошибка'}
                </span>
                {testResult.embedOk && (
                  <span className={`flex items-center gap-1.5 ${testResult.dimMatch ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {testResult.dimMatch ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                    Размерность: {testResult.embedDim} {testResult.dimMatch ? '(совпадает)' : `≠ ${testResult.expectedDim} (несовпадение!)`}
                  </span>
                )}
              </div>
              {testResult.errors.length > 0 && (
                <ul className="space-y-0.5 text-xs text-rose-500">
                  {testResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              )}
              {testResult.embedOk && !testResult.dimMatch && (
                <p className="text-xs text-amber-600">
                  Модель отдаёт {testResult.embedDim}-мерные вектора, а колонка БД ожидает {testResult.expectedDim}. Смените embedding-модель на {testResult.expectedDim}-мерную, иначе семантический поиск не будет работать.
                </p>
              )}
            </div>
          )}

          <label className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Автогенерация сводок</p>
              <p className="text-xs text-muted-foreground">Генерировать AI-сводку для каждой сохранённой статьи</p>
            </div>
            <Switch checked={form['bot.autoSummarize'] === 'true'} onCheckedChange={(v) => set('bot.autoSummarize', v ? 'true' : 'false')} />
          </label>

          <div className="rounded-lg border border-dashed bg-muted/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5" /> API-ключ шифруется (AES-256-GCM) и хранится в БД. В интерфейсе не отображается.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Languages className="size-4 text-violet-500" /> Рабочее пространство</CardTitle>
          <CardDescription>Язык интерфейса и название</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field icon={Languages} label="Название workspace">
            <Input value={form['workspace.name'] || ''} onChange={(e) => set('workspace.name', e.target.value)} />
          </Field>
          <Field icon={Globe} label="Язык">
            <Select value={form['workspace.language']} onValueChange={(v) => set('workspace.language', v)}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">Русский</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="kk">Қазақша</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      {/* Integrations note */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="size-4 text-rose-500" /> Интеграции</CardTitle>
          <CardDescription>Подключение внешних сервисов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-medium">Telegram</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Telegram подключается в разделе «Telegram» через MTProto user-аккаунт (телефон → код → 2FA). BotFather-токен не требуется.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} disabled={saving} size="lg" className="shadow-lg">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'Сохранение…' : 'Сохранить настройки'}
        </Button>
      </div>
    </div>
  )
}

function Field({
  icon: Icon, label, hint, children,
}: {
  icon: React.ComponentType<{ className?: string }>; label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
