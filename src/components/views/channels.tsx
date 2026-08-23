'use client'

import { useEffect, useState } from 'react'
import { useFetch, apiCall } from '@/lib/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ChannelBadge, ChannelIcon } from '@/components/app/badges'
import { CHANNEL_TYPES } from '@/lib/hr'
import { toast } from 'sonner'
import {
  Plus, Trash2, Edit2, Radio, Users, Loader2, Mail, Send, Hash, Webhook, MessageSquare,
} from 'lucide-react'

interface Channel {
  id: string; name: string; type: string; target: string; description: string | null;
  config: string | null; active: boolean; subscriberCount: number; avatarColor: string | null;
  createdAt: string; _count?: { broadcasts: number }
}

const AVATAR_COLORS = ['emerald', 'amber', 'rose', 'violet', 'teal', 'sunset']

export function ChannelsView() {
  const { data, loading, refresh } = useFetch<{ total: number; items: Channel[] }>('/api/channels')
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Channel | null>(null)

  function openNew() {
    setEditing(null)
    setEditOpen(true)
  }
  function openEdit(c: Channel) {
    setEditing(c)
    setEditOpen(true)
  }

  async function remove(c: Channel) {
    if (!confirm(`Удалить канал «${c.name}»?`)) return
    try {
      await apiCall(`/api/channels/${c.id}`, 'DELETE')
      toast.success('Удалено')
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  async function toggleActive(c: Channel) {
    try {
      await apiCall(`/api/channels/${c.id}`, 'PATCH', { active: !c.active })
      void refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{data?.total ?? 0}</span> каналов подключено
        </p>
        <Button onClick={openNew}>
          <Plus className="size-4" /> Добавить канал
        </Button>
      </div>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Radio className="mx-auto mb-3 size-12 text-muted-foreground" />
            <h3 className="text-base font-semibold">Нет каналов</h3>
            <p className="mt-1 text-sm text-muted-foreground">Добавьте Telegram-чат, Slack-канал или email-рассылку.</p>
            <Button className="mt-4" onClick={openNew}><Plus className="size-4" /> Добавить канал</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data?.items.map((c) => (
          <Card key={c.id} className="group transition-shadow hover:shadow-md">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${avatarBg(c.avatarColor || 'emerald')}`}>
                  <ChannelIcon type={c.type} className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold">{c.name}</h3>
                    <ChannelBadge type={c.type} />
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.target}</p>
                </div>
              </div>
              {c.description && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="size-3.5" /> {c.subscriberCount}</span>
                  <span className="flex items-center gap-1"><Send className="size-3.5" /> {c._count?.broadcasts ?? 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                  </label>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(c)} aria-label="Изменить">
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => remove(c)} aria-label="Удалить">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ChannelEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        channel={editing}
        onSaved={() => { setEditOpen(false); void refresh() }}
      />
    </div>
  )
}

function avatarBg(color: string): string {
  switch (color) {
    case 'emerald': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
    case 'amber': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
    case 'rose': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
    case 'violet': return 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300'
    case 'teal': return 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300'
    case 'sunset': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
    default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
  }
}

function ChannelEditDialog({
  open, onOpenChange, channel, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; channel: Channel | null; onSaved: () => void;
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('telegram')
  const [target, setTarget] = useState('')
  const [description, setDescription] = useState('')
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [avatarColor, setAvatarColor] = useState('emerald')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (channel) {
      setName(channel.name)
      setType(channel.type)
      setTarget(channel.target)
      setDescription(channel.description || '')
      setSubscriberCount(channel.subscriberCount)
      setAvatarColor(channel.avatarColor || 'emerald')
    } else {
      setName('')
      setType('telegram')
      setTarget('')
      setDescription('')
      setSubscriberCount(0)
      setAvatarColor('emerald')
    }
  }, [channel, open])

  async function save() {
    if (!name.trim() || !target.trim()) {
      toast.error('Название и адрес канала обязательны')
      return
    }
    setSaving(true)
    try {
      if (channel) {
        await apiCall(`/api/channels/${channel.id}`, 'PATCH', {
          name, type, target, description, subscriberCount, avatarColor,
        })
        toast.success('Канал обновлён')
      } else {
        await apiCall('/api/channels', 'POST', {
          name, type, target, description, subscriberCount, avatarColor,
        })
        toast.success('Канал добавлен')
      }
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{channel ? 'Редактировать канал' : 'Новый канал'}</DialogTitle>
          <DialogDescription>Куда будут отправляться дайджесты</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Тип канала</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNEL_TYPES.map((t) => {
                  const Icon = iconFor(t.key)
                  return (
                    <SelectItem key={t.key} value={t.key}>
                      <span className="flex items-center gap-2"><Icon className="size-3.5" /> {t.label}</span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Название</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HR-команда · Главный чат" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {targetLabel(type)}
            </label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={targetPlaceholder(type)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Описание</label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Назначение канала…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Подписчиков</label>
              <Input type="number" min={0} value={subscriberCount} onChange={(e) => setSubscriberCount(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Цвет аватара</label>
              <div className="flex gap-1.5">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className={`size-7 rounded-full ${avatarBg(c)} ring-2 transition-all ${avatarColor === c ? 'ring-foreground' : 'ring-transparent'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {saving ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function iconFor(type: string) {
  switch (type) {
    case 'telegram': return Send
    case 'slack': return MessageSquare
    case 'email': return Mail
    case 'webhook': return Webhook
    case 'discord': return Hash
    default: return Radio
  }
}

function targetLabel(type: string): string {
  switch (type) {
    case 'telegram': return 'ID чата или @username'
    case 'slack': return 'Имя канала (#hr-news)'
    case 'email': return 'Email получателей'
    case 'webhook': return 'URL вебхука'
    case 'discord': return 'ID канала'
    default: return 'Адрес'
  }
}

function targetPlaceholder(type: string): string {
  switch (type) {
    case 'telegram': return '@hr_team_main'
    case 'slack': return '#hr-news'
    case 'email': return 'subscribers@hrnewsdigest.io'
    case 'webhook': return 'https://example.com/webhook'
    case 'discord': return '1234567890'
    default: return '…'
  }
}
