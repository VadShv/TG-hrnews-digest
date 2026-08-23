-- HR News Digest — initial migration (Postgres + pgvector + pg_trgm)
-- Extensions must exist before the vector column.

CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── User ──
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ── NewsArticle ──
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "category" TEXT,
    "tags" TEXT,
    "imageUrl" TEXT,
    "summary" TEXT,
    "readingTime" INTEGER,
    "language" TEXT DEFAULT 'ru',
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "editorNote" TEXT,
    "contentHash" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'rss',
    "embedded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" vector(1536),
    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsArticle_url_key" ON "NewsArticle"("url");
CREATE INDEX "NewsArticle_category_idx" ON "NewsArticle"("category");
CREATE INDEX "NewsArticle_starred_idx" ON "NewsArticle"("starred");
CREATE INDEX "NewsArticle_createdAt_idx" ON "NewsArticle"("createdAt");
CREATE INDEX "NewsArticle_sourceType_idx" ON "NewsArticle"("sourceType");
CREATE INDEX "NewsArticle_contentHash_idx" ON "NewsArticle"("contentHash");

-- FTS: generated tsvector column (russian config) + GIN index
ALTER TABLE "NewsArticle" ADD COLUMN "search_vector" tsvector
    GENERATED ALWAYS AS (
        to_tsvector('russian', coalesce("title", '') || ' ' || coalesce("snippet", ''))
    ) STORED;
CREATE INDEX "NewsArticle_search_vector_idx" ON "NewsArticle" USING GIN ("search_vector");

-- Trigram fuzzy index on url (dedup)
CREATE INDEX "NewsArticle_url_trgm_idx" ON "NewsArticle" USING GIST ("url" gist_trgm_ops);

-- Vector HNSW index (cosine)
CREATE INDEX "NewsArticle_embedding_hnsw_idx" ON "NewsArticle" USING hnsw ("embedding" vector_cosine_ops);

-- ── Feed ──
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rsshubRoute" TEXT NOT NULL,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "intervalMin" INTEGER NOT NULL DEFAULT 60,
    "lastFetchedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Feed_active_idx" ON "Feed"("active");

-- ── TgChannel ──
CREATE TABLE "TgChannel" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "title" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastScannedAt" TIMESTAMP(3),
    "lastMessageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TgChannel_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TgChannel_active_idx" ON "TgChannel"("active");

-- ── TgSession ──
CREATE TABLE "TgSession" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "sessionEncrypted" TEXT,
    "status" TEXT NOT NULL DEFAULT 'off',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TgSession_pkey" PRIMARY KEY ("id")
);

-- ── TgJob ──
CREATE TABLE "TgJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "TgJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "TgJob_status_idx" ON "TgJob"("status");
CREATE INDEX "TgJob_createdAt_idx" ON "TgJob"("createdAt");

-- ── Digest ──
CREATE TABLE "Digest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "intro" TEXT,
    "outro" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "coverStyle" TEXT DEFAULT 'emerald',
    "tone" TEXT DEFAULT 'professional',
    "scheduledAt" TIMESTAMP(3),
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "scheduleCron" TEXT,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoChannelIds" JSONB,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Digest_pkey" PRIMARY KEY ("id")
);

-- ── DigestItem ──
CREATE TABLE "DigestItem" (
    "id" TEXT NOT NULL,
    "digestId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    CONSTRAINT "DigestItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DigestItem_digestId_articleId_key" ON "DigestItem"("digestId", "articleId");
CREATE INDEX "DigestItem_digestId_idx" ON "DigestItem"("digestId");
ALTER TABLE "DigestItem" ADD CONSTRAINT "DigestItem_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest"("id") ON DELETE CASCADE;
ALTER TABLE "DigestItem" ADD CONSTRAINT "DigestItem_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE;

-- ── Channel ──
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "config" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "avatarColor" TEXT DEFAULT 'emerald',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- ── Broadcast ──
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "digestId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "errorMessage" TEXT,
    "tgJobId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Broadcast_digestId_idx" ON "Broadcast"("digestId");
CREATE INDEX "Broadcast_channelId_idx" ON "Broadcast"("channelId");
CREATE INDEX "Broadcast_status_idx" ON "Broadcast"("status");
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_digestId_fkey" FOREIGN KEY ("digestId") REFERENCES "Digest"("id") ON DELETE CASCADE;
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE;

-- ── BotSetting ──
CREATE TABLE "BotSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BotSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BotSetting_key_key" ON "BotSetting"("key");

-- ── SearchQuery ──
CREATE TABLE "SearchQuery" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "category" TEXT,
    "resultCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchQuery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchQuery_createdAt_idx" ON "SearchQuery"("createdAt");
