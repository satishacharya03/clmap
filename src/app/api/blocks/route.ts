export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'

// GET /api/blocks - List all blocks
export async function GET() {
    try {
        const query = `
            SELECT 
                b.*,
                to_jsonb(c.*) as campus,
                jsonb_build_object(
                    'floors', (SELECT COUNT(*) FROM floors f WHERE f."blockId" = b.id),
                    'places', (SELECT COUNT(*) FROM places p WHERE p."blockId" = b.id)
                ) as "_count"
            FROM blocks b
            LEFT JOIN campuses c ON b."campusId" = c.id
            ORDER BY b.name ASC
        `
        const { rows: blocks } = await pool.query(query)

        return NextResponse.json({ blocks })
    } catch (error) {
        console.error('Error fetching blocks:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

