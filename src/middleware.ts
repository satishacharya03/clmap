import { auth } from '@/lib/auth'
import { verifyToken } from '@/lib/auth-credentials'
import { NextResponse, type NextRequest } from 'next/server'

// Neon Auth middleware — redirects unauthenticated users to /login
const neonMiddleware = auth.middleware({
    loginUrl: '/login',
})

export default async function middleware(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl

    // 1. Check for Neon Auth verifiers FIRST
    // We only get here if the matcher allowed it (protected route or has verifier)
    // If a verifier is present, we MUST run neonMiddleware to process it,
    // regardless of whether the user has a credentials token.
    const hasNeonAuthParam = Array.from(searchParams.keys()).some(key => key.startsWith('neon_auth_'))
    if (hasNeonAuthParam) {
        return neonMiddleware(request)
    }

    // 2. Check for credentials auth
    const credentialsToken = request.cookies.get('auth-token')?.value
    if (credentialsToken) {
        const payload = await verifyToken(credentialsToken)
        if (payload?.email) {
            return NextResponse.next()
        }
    }

    // 3. Protected route logic (already matched by config.matcher)
    return neonMiddleware(request)
}

export const config = {
    matcher: [
        // Protect these routes always
        '/admin/:path*',
        '/dashboard/:path*',
        // Run on any route if an auth verifier is present (optimization)
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.json|.*\\.js).*)',
            has: [{ type: 'query', key: 'neon_auth_session_verifier' }],
        },
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.json|.*\\.js).*)',
            has: [{ type: 'query', key: 'neon_auth_email_verification_verifier' }],
        },
        {
            source: '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.json|.*\\.js).*)',
            has: [{ type: 'query', key: 'neon_auth_password_reset_verifier' }],
        },
    ],
}
