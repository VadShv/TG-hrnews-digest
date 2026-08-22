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
  Calendar, Bell, ShieldCheck, Webhook,
} from 'lucide-react'

interface Settings { [key: string]: string }

export function SettingsView() {
  const { data, loading, refresh } = useFetch<{ settings: Settings }>('/api/settings')
  const [form, setForm] = useState<Settings>({})
  const [saving, setSaving] = useState(false)

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
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return <Skeleton className="h-96 rounded-xl" />
  }

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
            <Input value={form['bot.name'] || ''} onChange={(e) => set('bot.name', e.target.value)} placeholder="HR Pulse Bot" />
          </Field>
          <Field icon={Bot} label="Username" hint="Telegram-username">
            <Input value={form['bot.username'] || ''} onChange={(e) => set('bot.username', e.target.value)} placeholder="@hr_pulse_bot" />
          </Field>
          <Field icon={Signature} label="Подпись" hint="В конце каждого дайджеста">
            <Input value={form['bot.signature'] || ''} onChange={(e) => set('bot.signature', e.target.value)} placeholder="— HR Pulse Bot · новости из мира HR" />
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

      {/* Workspace + features */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Languages className="size-4 text-violet-500" /> Рабочее пространство</CardTitle>
            <CardDescription>Язык интерфейса и название</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bell className="size-4 text-rose-500" /> AI и автоматизация</CardTitle>
            <CardDescription>Интеллектуальные функции</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Автогенерация сводок</p>
                <p className="text-xs text-muted-foreground">Генерировать AI-сводку для каждой сохранённой статьи</p>
              </div>
              <Switch checked={form['bot.autoSummarize'] === 'true'} onCheckedChange={(v) => set('bot.autoSummarize', v ? 'true' : 'false')} />
            </label>
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5" /> API-ключи хранятся в защищённом хранилище
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="size-4 text-primary" /> Интеграции</CardTitle>
          <CardDescription>Подключение внешних сервисов</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium">Telegram Bot API</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Введите токен бота от @BotFather. Дайджесты будут отправляться через официальный Telegram Bot API.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Input type="password" placeholder="123456:ABC-DEF…" className="text-xs" disabled />
              <Button size="sm" variant="outline" disabled>Подключить</Button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              ⚠ В демо-режиме отправка имитируется. Реальный токен не требуется.
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
