/// Next.js instrumentation — runs once on server start.
/// Starts the background scheduler and runs idempotent bootstrap (admin, feeds, settings).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureBootstrap } = await import('./lib/bootstrap')
    await ensureBootstrap()
    const { startScheduler } = await import('./lib/scheduler')
    startScheduler()
  }
}
