import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/// Public health check (no auth) — used by Docker healthcheck and load balancers.
export async function GET() {
  return NextResponse.json({ status: 'ok', ts: new Date().toISOString() })
}
