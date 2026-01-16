

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
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

        // Using transaction to replace location
        await pool.query('BEGIN')

        try {
            // Delete any existing location for this user
            await pool.query(
                `DELETE FROM live_locations WHERE "userId" = $1`,
                [user.id]
            )

            // Create new live location
            const { rows: locationRows } = await pool.query(
                `INSERT INTO live_locations (id, "userId", latitude, longitude, "expiresAt", "updatedAt") 
                 VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) 
                 RETURNING *`,
                [user.id, latitude, longitude, expiresAt.toISOString()]
            )

            await pool.query('COMMIT')

            return NextResponse.json({
                message: 'Location shared successfully',
                location: locationRows[0],
                expiresAt
            })
        } catch (err) {
            await pool.query('ROLLBACK')
            throw err
        }
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

        await pool.query(
            `DELETE FROM live_locations WHERE "userId" = $1`,
            [user.id]
        )

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

