import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const placeId = (await params).id

        const { rows } = await pool.query(`
            SELECT 
                r.id, r.rating, r.comment, r."createdAt",
                jsonb_build_object('id', u.id, 'name', u.name) as user
            FROM reviews r
            JOIN users u ON r."userId" = u.id
            WHERE r."placeId" = $1
            ORDER BY r."createdAt" DESC
        `, [placeId])

        return NextResponse.json({ reviews: rows })
    } catch (error) {
        console.error('Error fetching reviews:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

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
        const { rating, comment } = body

        if (!rating || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Valid rating (1-5) is required' }, { status: 400 })
        }

        // Verify place exists
        const { rows: placeRows } = await pool.query(`SELECT id FROM places WHERE id = $1`, [placeId])
        if (placeRows.length === 0) {
            return NextResponse.json({ error: 'Place not found' }, { status: 404 })
        }

        // Create new review
        const { rows } = await pool.query(
            `INSERT INTO reviews (id, rating, comment, "placeId", "userId", "updatedAt") 
             VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING *`,
            [rating, comment?.trim() || null, placeId, user.id]
        )
        const reviewRow = rows[0]

        // Include user object to return
        const reviewWithUser = {
            ...reviewRow,
            user: { id: user.id, name: user.name }
        };

        return NextResponse.json({ message: 'Review added', review: reviewWithUser }, { status: 201 })
    } catch (error) {
        console.error('Error adding review:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export const runtime = 'edge';
