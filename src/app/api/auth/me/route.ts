import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUser, getOrCreateDbUser } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/auth/me — returns current user + role from our DB
export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                image: (user as any).image,
                emailVerified: (user as any).emailVerified,
                role: (user as any).role || 'USER',
            }
        })
    } catch (error) {
        console.error('Auth check error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
