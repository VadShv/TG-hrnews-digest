import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  // Protect pages only. API routes self-protect via getSessionOr401 (return 401 JSON).
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico|logo.svg|robots.txt).*)'],
}
