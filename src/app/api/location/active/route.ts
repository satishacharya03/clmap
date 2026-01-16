export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
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
        const query = `
            SELECT 
                ll.*,
                jsonb_build_object('id', u.id, 'name', u.name) as user
            FROM live_locations ll
            JOIN users u ON ll."userId" = u.id
            WHERE ll."expiresAt" > NOW()
            ORDER BY ll."createdAt" DESC
        `
        const { rows: activeLocations } = await pool.query(query)

        return NextResponse.json({ locations: activeLocations })
    } catch (error) {
        console.error('Error fetching active locations:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

