import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from './auth'

/// Returns the session or a 401 NextResponse. Use in API route handlers.
export async function getSessionOr401() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { session: null, response: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) }
  }
  return { session, response: null }
}
