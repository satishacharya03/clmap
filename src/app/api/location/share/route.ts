export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isValidCoordinates } from '@/utils/validators'
import { LIVE_LOCATION_CONFIG } from '@/utils/constants'

// POST /api/location/share - Share live location
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { latitude, longitude, durationMinutes } = body

        // Validate coordinates
        if (!latitude || !longitude || !isValidCoordinates(latitude, longitude)) {
            return NextResponse.json(
                { error: 'Valid latitude and longitude are required' },
                { status: 400 }
            )
        }

        // Calculate expiry time
        const duration = Math.min(
            durationMinutes || LIVE_LOCATION_CONFIG.defaultDurationMinutes,
            LIVE_LOCATION_CONFIG.maxDurationMinutes
        )
        const expiresAt = new Date(Date.now() + duration * 60 * 1000)

        // Delete any existing location for this user
        await prisma.liveLocation.deleteMany({
            where: { userId: user.id }
        })

        // Create new live location
        const location = await prisma.liveLocation.create({
            data: {
                userId: user.id,
                latitude,
                longitude,
                expiresAt
            }
        })

        return NextResponse.json({
            message: 'Location shared successfully',
            location,
            expiresAt
        })
    } catch (error) {
        console.error('Error sharing location:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE - Stop sharing location
export async function DELETE() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        await prisma.liveLocation.deleteMany({
            where: { userId: user.id }
        })

        return NextResponse.json({
            message: 'Location sharing stopped'
        })
    } catch (error) {
        console.error('Error stopping location share:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

