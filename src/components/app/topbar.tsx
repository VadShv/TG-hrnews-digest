'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Moon, Sun, RefreshCw, BookOpen, LogOut,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { signOut } from 'next-auth/react'
import { useApp, type ViewKey } from '@/lib/store'

const TITLES: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Дашборд', subtitle: 'Аналитика и сводка по платформе' },
  search: { title: 'Поиск новостей', subtitle: 'Гибридный семантический + полнотекстовый поиск' },
  library: { title: 'Библиотека', subtitle: 'Сохранённые статьи и сводки' },
  feeds: { title: 'Источники RSS', subtitle: 'RSSHub-фиды и автоматический сбор' },
  digests: { title: 'Дайджесты', subtitle: 'Конструктор рассылок и расписание' },
  channels: { title: 'Каналы', subtitle: 'Группы и подписчики для рассылки' },
  telegram: { title: 'Telegram', subtitle: 'Подключение аккаунта и TG-каналы' },
  broadcasts: { title: 'История рассылок', subtitle: 'Журнал отправок и статусы' },
  settings: { title: 'Настройки бота', subtitle: 'Конфигурация, расписание, подпись' },
}

export function AppTopbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { view } = useApp()
  const t = TITLES[view]

  useEffect(() => setMounted(true), [])

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md pl-16 lg:pl-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{t.title}</h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{t.subtitle}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" aria-label="Обновить" onClick={() => window.location.reload()}>
          <RefreshCw className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Переключить тему"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {mounted ? (
            theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />
          ) : (
            <span className="size-4" />
          )}
        </Button>
        <div className="ml-2 hidden items-center gap-2 rounded-full border bg-card px-2.5 py-1 sm:flex">
          <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 text-[10px] font-bold text-white">
            HR
          </div>
          <span className="text-xs font-medium">admin</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Выйти"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  )
}
