import { auth } from '@/lib/auth'
import { verifyToken } from '@/lib/auth-legacy'
import { NextResponse, type NextRequest } from 'next/server'

// Neon Auth middleware — redirects unauthenticated users to /login
const neonMiddleware = auth.middleware({
    loginUrl: '/login',
})

export default async function middleware(request: NextRequest) {
    const legacyToken = request.cookies.get('auth-token')?.value

    if (legacyToken) {
        const payload = await verifyToken(legacyToken)
        if (payload?.email) {
            return NextResponse.next()
        }
    }

    return neonMiddleware(request)
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
}
