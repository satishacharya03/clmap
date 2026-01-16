export const runtime = 'edge'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/location/active - Get active shared locations
export async function GET() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        // Get all non-expired live locations
        const activeLocations = await prisma.liveLocation.findMany({
            where: {
                expiresAt: { gt: new Date() }
            },
            include: {
                user: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ locations: activeLocations })
    } catch (error) {
        console.error('Error fetching active locations:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

