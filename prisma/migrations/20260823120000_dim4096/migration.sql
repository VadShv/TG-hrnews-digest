-- Embedding dimension 1536 -> 4096 (Qwen3-VL-Embedding-8B)
DROP INDEX IF EXISTS "NewsArticle_embedding_hnsw_idx";
UPDATE "NewsArticle" SET embedding = NULL WHERE embedding IS NOT NULL;
ALTER TABLE "NewsArticle" ALTER COLUMN embedding TYPE vector(4096);
CREATE INDEX "NewsArticle_embedding_hnsw_idx" ON "NewsArticle" USING hnsw ("embedding" vector_cosine_ops);
UPDATE "NewsArticle" SET "embedded" = false WHERE "embedded" = true;
INSERT INTO "BotSetting" ("id","key","value","updatedAt")
  VALUES (gen_random_uuid()::text,'llm.embedDim','4096',NOW())
  ON CONFLICT ("key") DO UPDATE SET "value"='4096',"updatedAt"=NOW();
