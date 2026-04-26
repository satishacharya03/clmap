import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUser, getOrCreateDbUser } from '@/lib/auth'
import prisma from '@/lib/db'

// GET /api/auth/me — returns current user + role from our DB
export async function GET() {
    try {
        const neonUser = await getCurrentUser()

        if (!neonUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Auto-provision DB record on first login
        const dbUser = await getOrCreateDbUser()

        return NextResponse.json({
            user: {
                id: neonUser.id,
                name: neonUser.name,
                email: neonUser.email,
                image: neonUser.image,
                emailVerified: neonUser.emailVerified,
                role: dbUser?.role ?? 'USER',
            }
        })
    } catch (error) {
        console.error('Auth check error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
