import { db } from './db'
import { renderDigestMessage } from './zai'

/// Render + broadcast a digest to channels. TG channels enqueue a TgJob for the
/// Python worker; other types are marked as unsupported (v1 = Telegram only).
export async function broadcastDigest(digestId: string, channelIds: string[], preview = false) {
  const digest = await db.digest.findUnique({
    where: { id: digestId },
    include: {
      items: { orderBy: { position: 'asc' }, include: { article: true } },
    },
  })
  if (!digest) throw new Error('Дайджест не найден')

  const channels = await db.channel.findMany({
    where: { id: { in: channelIds }, active: true },
  })
  if (channels.length === 0) throw new Error('Нет активных каналов для отправки')

  const message = renderDigestMessage({
    title: digest.title,
    subtitle: digest.subtitle,
    intro: digest.intro,
    outro: digest.outro,
    articles: digest.items.map((i) => ({
      title: i.article.title,
      source: i.article.source,
      url: i.article.url,
      note: i.note,
    })),
  })

  if (preview) return { preview: message, total: 0, delivered: 0, failed: 0, results: [] }

  const results: Array<{
    id: string
    channelId: string
    channelName: string
    channelType: string
    status: string
    tgJobId?: string
    errorMessage?: string | null
  }> = []

  for (const ch of channels) {
    if (ch.type === 'telegram') {
      const job = await db.tgJob.create({
        data: {
          type: 'post_digest',
          payload: { chatId: ch.target, message, channelName: ch.name } as Record<string, unknown>,
        },
      })
      const broadcast = await db.broadcast.create({
        data: {
          digestId: digest.id,
          channelId: ch.id,
          status: 'pending',
          message,
          tgJobId: job.id,
        },
      })
      results.push({
        id: broadcast.id,
        channelId: ch.id,
        channelName: ch.name,
        channelType: ch.type,
        status: 'pending',
        tgJobId: job.id,
      })
    } else {
      const broadcast = await db.broadcast.create({
        data: {
          digestId: digest.id,
          channelId: ch.id,
          status: 'failed',
          message,
          errorMessage: 'Реальная доставка поддерживается только для Telegram',
        },
      })
      results.push({
        id: broadcast.id,
        channelId: ch.id,
        channelName: ch.name,
        channelType: ch.type,
        status: 'failed',
        errorMessage: broadcast.errorMessage,
      })
    }
  }

  const tgCount = results.filter((r) => r.channelType === 'telegram').length
  await db.digest.update({
    where: { id: digest.id },
    data: { status: 'sent', sentCount: { increment: tgCount } },
  })

  return {
    total: results.length,
    delivered: results.filter((r) => r.status !== 'failed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    message,
    results,
  }
}

/// Enqueue a TG channel scan job (worker reads channel history → articles).
export async function enqueueChannelScan(tgChannelId: string, chatId: string, lastMessageId?: number | null) {
  return db.tgJob.create({
    data: {
      type: 'scan_channel',
      payload: { tgChannelId, chatId, lastMessageId: lastMessageId ?? null } as Record<string, unknown>,
    },
  })
}

/// Enqueue a test message to a TG chat.
export async function enqueueTestMessage(chatId: string, message: string) {
  return db.tgJob.create({
    data: {
      type: 'send_test',
      payload: { chatId, message } as Record<string, unknown>,
    },
  })
}
