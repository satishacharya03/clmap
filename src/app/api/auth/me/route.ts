import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// GET /api/auth/me — returns current Neon Auth user synced with our DB
export const dynamic = 'force-dynamic'

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
                image: user.image,
                emailVerified: user.emailVerified,
                role: user.role,
            }
        })
    } catch (error) {
        console.error('Auth check error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
