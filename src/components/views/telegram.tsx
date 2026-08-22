'use client'

import { useEffect, useState } from 'react'
import { useFetch, apiCall } from '@/lib/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Send, Loader2, CheckCircle2, XCircle, Phone, KeyRound, Plus, Trash2, RefreshCw, Radio,
} from 'lucide-react'

interface TgStatus { status: string; phone: string | null; workerUrl: string }
interface TgChannel { id: string; chatId: string; title: string | null; active: boolean; lastScannedAt: string | null }

export function TelegramView() {
  const { data: statusData, refresh: refreshStatus, loading } = useFetch<TgStatus>('/api/tg')
  const { data: channelsData, refresh: refreshChannels } = useFetch<{ total: number; items: TgChannel[] }>('/api/tg/channels')

  const status = statusData?.status || 'off'
  const connected = status === 'active'

  return (
    <div className="space-y-6">
      {/* Connection status + login */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="size-4 text-primary" /> Подключение Telegram</CardTitle>
          <CardDescription>Личный аккаунт (MTProto) для чтения каналов и отправки дайджестов</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <Skeleton className="h-24" />}
          {!loading && (
            <>
              <div className={`flex items-center gap-3 rounded-lg border p-4 ${connected ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40' : 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'}`}>
                {connected ? (
                  <CheckCircle2 className="size-6 text-emerald-600" />
                ) : (
                  <XCircle className="size-6 text-amber-500" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {connected ? 'Аккаунт подключён' : 'Аккаунт не подключён'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connected ? `Телефон: ${statusData?.phone}` : 'Подключите аккаунт, чтобы читать TG-каналы и отправлять дайджесты'}
                  </p>
                </div>
                {connected && (
                  <Button variant="outline" size="sm" onClick={async () => {
                    try { await apiCall('/api/tg', 'POST', { action: 'logout' }); toast.success('Отключено'); void refreshStatus() }
                    catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') }
                  }}>
                    Отключить
                  </Button>
                )}
              </div>
              {!connected && <LoginFlow onConnected={() => void refreshStatus()} />}
            </>
          )}
        </CardContent>
      </Card>

      {/* TG scan channels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Radio className="size-4 text-primary" /> TG-каналы для сканирования</CardTitle>
              <CardDescription>Каналы, из которых бот собирает новости</CardDescription>
            </div>
            <ScanChannels channels={channelsData?.items || []} onSaved={() => void refreshChannels()} />
          </div>
        </CardHeader>
        <CardContent>
          {channelsData?.items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Нет каналов. Добавьте @username или ID канала.</p>
          )}
          <div className="space-y-2">
            {channelsData?.items.map((ch) => (
              <div key={ch.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Send className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{ch.title || ch.chatId}</p>
                  <p className="truncate text-xs text-muted-foreground">{ch.chatId} · {ch.lastScannedAt ? `скан: ${new Date(ch.lastScannedAt).toLocaleDateString('ru-RU')}` : 'не сканировался'}</p>
                </div>
                <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={async () => {
                  try { await apiCall(`/api/tg/channels/${ch.id}`, 'DELETE'); toast.success('Удалено'); void refreshChannels() }
                  catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') }
                }}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test message */}
      <TestMessage connected={connected} />
    </div>
  )
}

function LoginFlow({ onConnected }: { onConnected: () => void }) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendCode() {
    if (!phone.trim()) { toast.error('Введите номер телефона'); return }
    setLoading(true)
    try {
      await apiCall('/api/tg', 'POST', { action: 'login_start', phone: phone.trim() })
      toast.success('Код отправлен в Telegram')
      setStep('code')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') } finally { setLoading(false) }
  }

  async function submit() {
    if (!code.trim()) { toast.error('Введите код'); return }
    setLoading(true)
    try {
      await apiCall('/api/tg', 'POST', { action: 'login_submit', phone: phone.trim(), code: code.trim(), password: password.trim() || undefined })
      toast.success('Аккаунт подключён')
      onConnected()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка'
      if (msg.includes('2FA') || msg.includes('password') || msg.includes('пароль')) {
        toast.info('Требуется пароль 2FA — введите его ниже')
      } else {
        toast.error(msg)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border bg-card p-4">
      {step === 'phone' && (
        <>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Phone className="size-3.5" /> Номер телефона</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 999 123 45 67" />
          <Button onClick={sendCode} disabled={loading} className="w-full">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Отправить код
          </Button>
        </>
      )}
      {step === 'code' && (
        <>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><KeyRound className="size-3.5" /> Код из Telegram</label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="12345" />
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">Пароль 2FA (если включён)</label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="оставьте пустым, если нет 2FA" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('phone')} className="flex-1">Назад</Button>
            <Button onClick={submit} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Подключить
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function ScanChannels({ channels, onSaved }: { channels: TgChannel[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [chatId, setChatId] = useState('')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  async function add() {
    if (!chatId.trim()) { toast.error('Введите @username или ID'); return }
    setSaving(true)
    try {
      await apiCall('/api/tg/channels', 'POST', { chatId: chatId.trim(), title: title.trim() || null })
      toast.success('Канал добавлен')
      setChatId(''); setTitle(''); setOpen(false); onSaved()
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') } finally { setSaving(false) }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(!open)}><Plus className="size-4" /> Добавить</Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-lg border bg-card p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-sm font-semibold">Новый TG-канал</h3>
            <div className="space-y-2">
              <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="@hr_news или -100123456" />
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название (опц.)" />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Отмена</Button>
                <Button onClick={add} disabled={saving} className="flex-1">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Добавить
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function TestMessage({ connected }: { connected: boolean }) {
  const [chatId, setChatId] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (!chatId.trim()) { toast.error('Введите chat ID или @username'); return }
    setSending(true)
    try {
      await apiCall('/api/tg/test', 'POST', { chatId: chatId.trim() })
      toast.success('Тест поставлен в очередь')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Ошибка') } finally { setSending(false) }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><RefreshCw className="size-4 text-primary" /> Тестовое сообщение</CardTitle>
        <CardDescription>Проверить доставку в группу/чат</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input value={chatId} onChange={(e) => setChatId(e.target.value)} placeholder="@my_hr_group или -100123456" disabled={!connected} />
          <Button onClick={send} disabled={!connected || sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Отправить
          </Button>
        </div>
        {!connected && <p className="mt-2 text-xs text-muted-foreground">Сначала подключите аккаунт Telegram.</p>}
      </CardContent>
    </Card>
  )
}
