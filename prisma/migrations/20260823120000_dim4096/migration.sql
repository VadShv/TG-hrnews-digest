-- Embedding dimension 1536 -> 4096 (Qwen3-VL-Embedding-8B)
-- pgvector HNSW/IVFFLAT indexes support max 2000 dimensions, so 4096 uses exact search (no index).
-- For a small corpus this is fast; if it grows >10k articles, consider binary quantization (bit type + HNSW).
DROP INDEX IF EXISTS "NewsArticle_embedding_hnsw_idx";
UPDATE "NewsArticle" SET embedding = NULL WHERE embedding IS NOT NULL;
ALTER TABLE "NewsArticle" ALTER COLUMN embedding TYPE vector(4096);
UPDATE "NewsArticle" SET "embedded" = false WHERE "embedded" = true;
INSERT INTO "BotSetting" ("id","key","value","updatedAt")
  VALUES (gen_random_uuid()::text,'llm.embedDim','4096',NOW())
  ON CONFLICT ("key") DO UPDATE SET "value"='4096',"updatedAt"=NOW();
