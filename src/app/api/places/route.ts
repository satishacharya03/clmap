

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser } from '@/lib/auth'
import { validatePlace } from '@/utils/validators'

// GET /api/places - List all approved places
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const categoryId = searchParams.get('categoryId')
        const blockId = searchParams.get('blockId')
        const search = searchParams.get('search')

        let query = `
            SELECT 
                p.*,
                to_jsonb(pc.*) as category,
                to_jsonb(b.*) as block,
                to_jsonb(f.*) as floor,
                to_jsonb(r.*) as room,
                coalesce(
                    (SELECT jsonb_agg(pp.*) FROM place_photos pp WHERE pp."placeId" = p.id),
                    '[]'::jsonb
                ) as photos,
                jsonb_build_object('id', u.id, 'name', u.name) as "createdBy"
            FROM places p
            LEFT JOIN place_categories pc ON p."categoryId" = pc.id
            LEFT JOIN blocks b ON p."blockId" = b.id
            LEFT JOIN floors f ON p."floorId" = f.id
            LEFT JOIN rooms r ON p."roomId" = r.id
            LEFT JOIN users u ON p."createdById" = u.id
            WHERE p."approvalStatus" = 'APPROVED'
        `
        const params: any[] = []
        let paramIndex = 1

        if (categoryId) {
            query += ` AND p."categoryId" = $${paramIndex++}`
            params.push(categoryId)
        }
        if (blockId) {
            query += ` AND p."blockId" = $${paramIndex++}`
            params.push(blockId)
        }
        if (search) {
            query += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`
            params.push(`%${search}%`)
            paramIndex++
        }

        query += ` ORDER BY p."createdAt" DESC`

        const { rows } = await pool.query(query, params)

        return NextResponse.json({ places: rows })
    } catch (error) {
        console.error('Error fetching places:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/places - Submit a new place (authenticated users)
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
        const { name, description, categoryId, latitude, longitude, blockId, floorId, roomId } = body

        // Validate input
        const errors = validatePlace({ name, description, categoryId, latitude, longitude, blockId, floorId, roomId })
        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validation failed', details: errors },
                { status: 400 }
            )
        }

        // Generate ID
        const placeId = crypto.randomUUID()

        // Create place and approval
        // Using a simple transaction block approach or sequential ensures data integrity
        // Neon handles single query strings well

        await pool.query('BEGIN')

        try {
            const insertPlaceQuery = `
                INSERT INTO places (
                    id, name, description, "categoryId", latitude, longitude, 
                    "blockId", "floorId", "roomId", "createdById", "approvalStatus", "updatedAt"
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', NOW()
                )
                RETURNING *
            `
            const insertPlaceParams = [
                placeId, name.trim(), description?.trim() || null, categoryId,
                latitude, longitude, blockId, floorId, roomId, user.id
            ]

            const { rows: placeRows } = await pool.query(insertPlaceQuery, insertPlaceParams)
            const place = placeRows[0]

            await pool.query(
                `INSERT INTO approvals (id, "placeId", status, "updatedAt") VALUES (gen_random_uuid(), $1, 'PENDING', NOW())`,
                [placeId]
            )

            await pool.query('COMMIT')

            // Fetch full relations for response to match previous behavior
            const { rows: fullPlaceRows } = await pool.query(`
                SELECT 
                    p.*,
                    to_jsonb(pc.*) as category,
                    to_jsonb(b.*) as block
                FROM places p
                LEFT JOIN place_categories pc ON p."categoryId" = pc.id
                LEFT JOIN blocks b ON p."blockId" = b.id
                WHERE p.id = $1
            `, [placeId])

            return NextResponse.json(
                {
                    message: 'Place submitted for approval',
                    place: fullPlaceRows[0]
                },
                { status: 201 }
            )

        } catch (err) {
            await pool.query('ROLLBACK')
            throw err
        }

    } catch (error) {
        console.error('Error creating place:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

