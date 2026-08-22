import bcrypt from 'bcryptjs'
import { db } from './db'

const DEFAULT_FEEDS = [
  { name: 'HH.ru — новости HR', rsshubRoute: 'hhru/vacancies', category: 'Hiring', intervalMin: 120 },
  { name: 'VC.ru — HR и менеджмент', rsshubRoute: 'vcru/hr', category: 'Culture', intervalMin: 60 },
  { name: 'Habr Карьера — статьи', rsshubRoute: 'habrcareer/articles', category: 'Compensation', intervalMin: 90 },
  { name: 'Forbes — управление', rsshubRoute: 'forbes/management', category: 'L&D', intervalMin: 180 },
]

const DEFAULT_SETTINGS: Record<string, string> = {
  'bot.name': 'HR Pulse Bot',
  'bot.username': '@hr_pulse_bot',
  'bot.schedule': '09:00',
  'bot.timezone': 'Europe/Moscow',
  'bot.frequency': 'daily',
  'bot.defaultTone': 'professional',
  'bot.autoSummarize': 'false',
  'bot.signature': '— HR Pulse Bot · новости из мира HR',
  'bot.maxItems': '7',
  'workspace.name': 'HR Pulse',
  'workspace.language': 'ru',
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

    // Default settings
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      await db.botSetting.upsert({ where: { key }, update: {}, create: { key, value } })
    }

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
