

import { NextResponse } from 'next/server'
import { removeAuthCookie } from '@/lib/auth'

// POST /api/auth/logout - Logout user
export async function POST() {
    try {
        await removeAuthCookie()
        return NextResponse.json({ message: 'Logged out successfully' })
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET /api/auth/logout - Logout user via link
export async function GET(request: Request) {
    try {
        await removeAuthCookie()
        return NextResponse.redirect(new URL('/login', request.url))
    } catch (error) {
        console.error('Logout error:', error)
        return NextResponse.redirect(new URL('/login', request.url))
    }
}

