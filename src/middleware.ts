import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Paths to protect
    const isAdminPath = pathname.startsWith('/admin')
    const isDashboardPath = pathname.startsWith('/dashboard')

    // Auth paths
    const isAuthPath = pathname === '/login' || pathname === '/register'

    // Get token from cookies
    const token = request.cookies.get('auth-token')?.value

    if (isAdminPath || isDashboardPath) {
        if (!token) {
            return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url))
        }

        try {
            const payload = await verifyToken(token)

            if (!payload) {
                return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url))
            }

            // Check admin role
            if (isAdminPath && payload.role !== 'ADMIN') {
                return NextResponse.redirect(new URL('/map', request.url))
            }

        } catch (error) {
            // Invalid token
            return NextResponse.redirect(new URL('/login?redirect=' + encodeURIComponent(pathname), request.url))
        }
    }

    // Redirect logged in users away from auth pages
    if (isAuthPath && token) {
        try {
            const payload = await verifyToken(token)
            if (payload) {
                if (payload.role === 'ADMIN') {
                    return NextResponse.redirect(new URL('/admin', request.url))
                }
                return NextResponse.redirect(new URL('/dashboard', request.url))
            }
        } catch (error) {
            // Ignore invalid token here, continue to auth pages
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/register'],
}
