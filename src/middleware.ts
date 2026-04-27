import { auth } from '@/lib/auth'
import { NextResponse, type NextRequest } from 'next/server'

// Neon Auth middleware — all auth handled by Neon Auth
const neonMiddleware = auth.middleware({
    loginUrl: '/login',
})

export default async function middleware(request: NextRequest) {
    // All auth is Neon Auth — delegate directly
    return neonMiddleware(request)
}

export const config = {
    matcher: [
        // Protect these routes
        '/admin/:path*',
        '/dashboard/:path*',
        // Run on any route if a Neon Auth verifier param is present
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
