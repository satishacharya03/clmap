import { NextResponse } from 'next/server'
import { getCurrentUser, type AppCurrentUser } from '@/lib/auth'

// GET /api/auth/me — returns current user + role from our DB
export const dynamic = 'force-dynamic'
export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const appUser: AppCurrentUser = user

        return NextResponse.json({
            user: {
                id: appUser.id,
                name: appUser.name,
                email: appUser.email,
                image: appUser.image,
                emailVerified: appUser.emailVerified,
                role: appUser.role,
                authMethod: appUser.authMethod,
            }
        })
    } catch (error) {
        console.error('Auth check error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
