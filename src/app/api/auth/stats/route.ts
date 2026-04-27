import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { pool } from '@/lib/edge-db'

export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const [placesResult, reviewsResult] = await Promise.all([
            pool.query('SELECT COUNT(*)::int AS count FROM places WHERE "createdById" = $1', [user.id]),
            pool.query('SELECT COUNT(*)::int AS count FROM reviews WHERE "userId" = $1', [user.id]),
        ])

        return NextResponse.json({
            stats: {
                places: placesResult.rows[0]?.count ?? 0,
                reviews: reviewsResult.rows[0]?.count ?? 0
            }
        })
    } catch (error) {
        console.error('Stats fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
