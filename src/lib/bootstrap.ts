import bcrypt from 'bcryptjs'
import { db } from './db'

const DEFAULT_FEEDS = [
  { name: 'HH.ru — новости HR', rsshubRoute: 'hhru/vacancies', category: 'Hiring', intervalMin: 120 },
  { name: 'VC.ru — HR и менеджмент', rsshubRoute: 'vcru/hr', category: 'Culture', intervalMin: 60 },
  { name: 'Habr Карьера — статьи', rsshubRoute: 'habrcareer/articles', category: 'Compensation', intervalMin: 90 },
  { name: 'Forbes — управление', rsshubRoute: 'forbes/management', category: 'L&D', intervalMin: 180 },
]

const DEFAULT_SETTINGS: Record<string, string> = {
  'bot.name': 'HR News Digest Bot',
  'bot.username': '@hr_news_digest_bot',
  'bot.schedule': '09:00',
  'bot.timezone': 'Europe/Moscow',
  'bot.frequency': 'daily',
  'bot.defaultTone': 'professional',
  'bot.autoSummarize': 'false',
  'bot.signature': '— HR News Digest Bot · новости из мира HR',
  'bot.maxItems': '7',
  'workspace.name': 'HR News Digest',
  'workspace.language': 'ru',
  'llm.baseUrl': '',
  'llm.model': 'gpt-4o-mini',
  'llm.embedModel': 'text-embedding-3-small',
  'llm.embedDim': '1536',
}

// Old brand values → new (only migrated if the user hasn't customized them).
const BRAND_MIGRATIONS: Record<string, { from: string; to: string }> = {
  'bot.name': { from: 'HR Pulse Bot', to: 'HR News Digest Bot' },
  'bot.username': { from: '@hr_pulse_bot', to: '@hr_news_digest_bot' },
  'bot.signature': { from: '— HR Pulse Bot · новости из мира HR', to: '— HR News Digest Bot · новости из мира HR' },
  'workspace.name': { from: 'HR Pulse', to: 'HR News Digest' },
}

/// Idempotent bootstrap: create admin user, default feeds, settings, and TgSession row.
/// Safe to run on every startup.
export async function ensureBootstrap() {
  try {
    // Admin user
    const email = process.env.ADMIN_EMAIL || 'admin@hrpulse.io'
    const password = process.env.ADMIN_PASSWORD || 'changeme123'
    const existingUser = await db.user.findUnique({ where: { email } })
    if (!existingUser) {
      const passwordHash = await bcrypt.hash(password, 12)
      await db.user.create({ data: { email, passwordHash, name: 'Admin' } })
      console.log(`[bootstrap] Created admin user: ${email}`)
    }

    // Default feeds
    const feedCount = await db.feed.count()
    if (feedCount === 0) {
      for (const f of DEFAULT_FEEDS) {
        await db.feed.create({ data: f })
      }
      console.log(`[bootstrap] Created ${DEFAULT_FEEDS.length} default feeds`)
    }

    // Default settings (upsert create-only; do not overwrite user edits)
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db.botSetting.upsert({ where: { key }, update: {}, create: { key, value } })
    }

    // Migrate old brand values → new (only if still the old default)
    await migrateBrandNames()

    // TgSession row
    const sessionCount = await db.tgSession.count()
    if (sessionCount === 0) {
      await db.tgSession.create({ data: { status: 'off' } })
    }

    console.log('[bootstrap] OK')
  } catch (e) {
    console.error('[bootstrap] error:', e instanceof Error ? e.message : e)
  }
}

/// Rename old brand strings in BotSetting (only where the value is still the old default).
async function migrateBrandNames() {
  let migrated = 0
  for (const [key, { from, to }] of Object.entries(BRAND_MIGRATIONS)) {
    const row = await db.botSetting.findUnique({ where: { key } })
    if (row && row.value === from) {
      await db.botSetting.update({ where: { key }, data: { value: to } })
      migrated++
    }
  }
  if (migrated > 0) console.log(`[bootstrap] Migrated ${migrated} brand settings → HR News Digest`)
}
