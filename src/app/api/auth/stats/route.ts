import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const [placesCount, reviewsCount] = await Promise.all([
            prisma.place.count({ where: { createdById: user.id } }),
            prisma.review.count({ where: { userId: user.id } })
        ])

        return NextResponse.json({
            stats: {
                places: placesCount,
                reviews: reviewsCount
            }
        })
    } catch (error) {
        console.error('Stats fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
