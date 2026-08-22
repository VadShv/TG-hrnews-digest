'use client'

import { useState } from 'react'
import { useApp, type ViewKey } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard, Search, Library, FileText, Radio, History, Settings,
  Menu, Sparkles, Bot, ChevronRight, Rss, Send,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const NAV: { key: ViewKey; label: string; icon: LucideIcon; hint: string }[] = [
  { key: 'dashboard', label: 'Дашборд', icon: LayoutDashboard, hint: 'Обзор и статистика' },
  { key: 'search', label: 'Поиск новостей', icon: Search, hint: 'Семантический поиск' },
  { key: 'library', label: 'Библиотека', icon: Library, hint: 'Сохранённые статьи' },
  { key: 'feeds', label: 'Источники RSS', icon: Rss, hint: 'RSSHub-фиды' },
  { key: 'digests', label: 'Дайджесты', icon: FileText, hint: 'Конструктор рассылок' },
  { key: 'channels', label: 'Каналы', icon: Radio, hint: 'Группы и подписчики' },
  { key: 'telegram', label: 'Telegram', icon: Send, hint: 'Подключение и TG-каналы' },
  { key: 'broadcasts', label: 'Рассылки', icon: History, hint: 'История отправок' },
  { key: 'settings', label: 'Настройки бота', icon: Settings, hint: 'Конфигурация' },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView } = useApp()
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map((item) => {
        const active = view === item.key
        const Icon = item.icon
        return (
          <button
            key={item.key}
            onClick={() => {
              setView(item.key)
              onNavigate?.()
            }}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              active
                ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border'
                : 'text-sidebar-foreground/80',
            )}
          >
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-md transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-sidebar-accent/60 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronRight
              className={cn(
                'size-4 opacity-0 transition-opacity',
                active ? 'opacity-100' : 'group-hover:opacity-60',
              )}
            />
          </button>
        )
      })}
    </nav>
  )
}

function BrandHeader() {
  return (
    <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
      <div className="relative">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-500 text-white shadow-lg shadow-primary/20">
          <Bot className="size-5" />
        </div>
        <span className="absolute -right-1 -top-1 flex size-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex size-3 rounded-full bg-emerald-500 ring-2 ring-sidebar"></span>
        </span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight brand-gradient">HR Pulse</span>
          <Sparkles className="size-3.5 text-amber-500" />
        </div>
        <p className="text-[11px] text-muted-foreground truncate">SaaS для HR-дайджест бота</p>
      </div>
    </div>
  )
}

function SidebarCard() {
  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <BrandHeader />
      <div className="flex-1 overflow-y-auto scroll-area-thin py-3">
        <NavList />
      </div>
      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-amber-500/10 p-3 ring-1 ring-primary/20">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold leading-tight">Pro plan</p>
              <p className="text-[11px] text-muted-foreground truncate">Активна до конца периода</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Все функции доступны: неограниченные дайджесты и каналы.
          </p>
        </div>
      </div>
    </div>
  )
}

export function AppSidebar() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-sidebar-border">
        <div className="sticky top-0 h-screen">
          <SidebarCard />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden absolute left-3 top-3 z-30"
            aria-label="Меню"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarCard />
        </SheetContent>
      </Sheet>
    </>
  )
}
