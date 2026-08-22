'use client'

import { Bot, Heart } from 'lucide-react'

export function AppFooter() {
  return (
    <footer className="mt-auto border-t bg-card/50 px-4 py-4">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Bot className="size-3.5 text-primary" />
          <span className="font-medium">HR Pulse</span> · SaaS для управления HR-дайджест ботом
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Сделано с <Heart className="size-3 fill-rose-500 text-rose-500" /> для HR-сообщества · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
