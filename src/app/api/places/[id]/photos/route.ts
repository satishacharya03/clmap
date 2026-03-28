import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
        }

        const placeId = (await params).id
        const body = await request.json()
        const { photoUrl } = body

        if (!photoUrl) {
            return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 })
        }

        // Verify place exists
        const { rows: placeRows } = await pool.query(`SELECT id FROM places WHERE id = $1`, [placeId])
        if (placeRows.length === 0) {
            return NextResponse.json({ error: 'Place not found' }, { status: 404 })
        }

        const { rows } = await pool.query(
            `INSERT INTO place_photos (id, "photoUrl", "placeId") VALUES (gen_random_uuid(), $1, $2) RETURNING *`,
            [photoUrl, placeId]
        )

        return NextResponse.json({ message: 'Photo added', photo: rows[0] }, { status: 201 })
    } catch (error) {
        console.error('Error adding photo:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export const runtime = 'edge';
