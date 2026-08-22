import { ensureBootstrap } from '../src/lib/bootstrap'

/// Manual seed entrypoint — runs the same idempotent bootstrap as server startup.
ensureBootstrap()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    const { db } = await import('../src/lib/db')
    await db.$disconnect()
  })
