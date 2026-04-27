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
    // Protected routes that ALWAYS require authentication
    const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/dashboard')

    // Auth callback parameter — if present, we MUST run neonMiddleware to process it
    // We check for any parameter starting with 'neon_auth_' to be safe
    const hasNeonAuthParam = Array.from(searchParams.keys()).some(key => key.startsWith('neon_auth_'))

    if (isProtectedRoute || hasNeonAuthParam) {
        return neonMiddleware(request)
    }

    // Otherwise, allow the request (public routes)
    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.svg|.*\\.json|.*\\.js).*)'],
}
