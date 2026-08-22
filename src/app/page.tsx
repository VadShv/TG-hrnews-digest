'use client'

import { AppSidebar } from '@/components/app/sidebar'
import { AppTopbar } from '@/components/app/topbar'
import { AppFooter } from '@/components/app/footer'
import { DashboardView } from '@/components/views/dashboard'
import { SearchView } from '@/components/views/search'
import { LibraryView } from '@/components/views/library'
import { FeedsView } from '@/components/views/feeds'
import { DigestsView } from '@/components/views/digests'
import { ChannelsView } from '@/components/views/channels'
import { TelegramView } from '@/components/views/telegram'
import { BroadcastsView } from '@/components/views/broadcasts'
import { SettingsView } from '@/components/views/settings'
import { useApp } from '@/lib/store'

export default function Home() {
  const { view } = useApp()
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {view === 'dashboard' && <DashboardView />}
          {view === 'search' && <SearchView />}
          {view === 'library' && <LibraryView />}
          {view === 'feeds' && <FeedsView />}
          {view === 'digests' && <DigestsView />}
          {view === 'channels' && <ChannelsView />}
          {view === 'telegram' && <TelegramView />}
          {view === 'broadcasts' && <BroadcastsView />}
          {view === 'settings' && <SettingsView />}
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
