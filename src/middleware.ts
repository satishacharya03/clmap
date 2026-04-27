import { auth } from '@/lib/auth'
import { verifyToken } from '@/lib/auth-credentials'
import { NextResponse, type NextRequest } from 'next/server'

// Neon Auth middleware — redirects unauthenticated users to /login
const neonMiddleware = auth.middleware({
    loginUrl: '/login',
})

export default async function middleware(request: NextRequest) {
    const credentialsToken = request.cookies.get('auth-token')?.value

    if (credentialsToken) {
        const payload = await verifyToken(credentialsToken)
        if (payload?.email) {
            return NextResponse.next()
        }
    }

    return neonMiddleware(request)
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
}
