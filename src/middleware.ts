import { auth } from '@/lib/auth'
import { verifyToken } from '@/lib/auth-credentials'
import { NextResponse, type NextRequest } from 'next/server'

// Neon Auth middleware — redirects unauthenticated users to /login
const neonMiddleware = auth.middleware({
    loginUrl: '/login',
})

export default async function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl

    // 1. Check for credentials auth first
    const credentialsToken = request.cookies.get('auth-token')?.value

    if (credentialsToken) {
        const payload = await verifyToken(credentialsToken)
        if (payload?.email) {
            return NextResponse.next()
        }
    }

    // 2. Neon Auth logic
    // We only get here if the matcher allowed it (protected route or has verifier)
    return neonMiddleware(request)
}

export const config = {
    matcher: [
        // Protect these routes always
        '/admin/:path*',
        '/dashboard/:path*',
        // Only run on other routes IF the auth verifier is present (optimization)
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.json|.*\\.js).*)',
            has: [{ type: 'query', key: 'neon_auth_session_verifier' }],
        },
    ],
}
