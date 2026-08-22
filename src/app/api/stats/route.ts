import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionOr401 } from '@/lib/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// GET /api/stats — dashboard stats with a 14-day broadcast trend.
export async function GET(_req: NextRequest) {
  const { response } = await getSessionOr401()
  if (response) return response

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  const [articleCount, digestCount, channelCount, broadcastCount, activeChannels, starredCount, sentBroadcasts, recentSearches, feedCount, tgChannelCount] =
    await Promise.all([
      db.newsArticle.count({ where: { archived: false } }),
      db.digest.count(),
      db.channel.count(),
      db.broadcast.count(),
      db.channel.count({ where: { active: true } }),
      db.newsArticle.count({ where: { starred: true } }),
      db.broadcast.count({ where: { status: { in: ['sent', 'delivered'] } } }),
      db.searchQuery.count(),
      db.feed.count({ where: { active: true } }),
      db.tgChannel.count({ where: { active: true } }),
    ])

  const categoryRows = await db.newsArticle.groupBy({
    by: ['category'],
    where: { archived: false },
    _count: { _all: true },
  })
  const byCategory = categoryRows
    .map((r) => ({ category: r.category || 'Other', count: r._count._all }))
    .sort((a, b) => b.count - a.count)

  const trend: { date: string; sent: number; failed: number }[] = []
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    dayStart.setDate(dayStart.getDate() - i)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)
    const sent = await db.broadcast.count({
      where: { createdAt: { gte: dayStart, lt: dayEnd }, status: { in: ['sent', 'delivered'] } },
    })
    const failed = await db.broadcast.count({
      where: { createdAt: { gte: dayStart, lt: dayEnd }, status: 'failed' },
    })
    trend.push({ date: dayStart.toISOString().slice(0, 10), sent, failed })
  }

  const recentBroadcasts = await db.broadcast.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
    include: { channel: true, digest: { select: { id: true, title: true } } },
  })

  const recentArticles = await db.newsArticle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const sourceRows = await db.newsArticle.groupBy({
    by: ['source'],
    where: { archived: false },
    _count: { _all: true },
  })
  const topSources = sourceRows
    .map((r) => ({ source: r.source, count: r._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return NextResponse.json({
    totals: {
      articles: articleCount,
      digests: digestCount,
      channels: channelCount,
      activeChannels,
      broadcasts: broadcastCount,
      sentBroadcasts,
      starred: starredCount,
      searches: recentSearches,
      feeds: feedCount,
      tgChannels: tgChannelCount,
    },
    byCategory,
    trend,
    recentBroadcasts,
    recentArticles,
    topSources,
    since: since.toISOString(),
  })
}
