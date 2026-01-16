export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from '@neondatabase/serverless'
import { jwtVerify } from 'jose'

// Initialize Neon Pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Auth Helper Types
interface TokenPayload {
    userId: string
    role: string
    [key: string]: unknown
}

// Helper to verify token and get user role from DB if needed
async function getEdgeUser(request: NextRequest) {
    try {
        const token = request.cookies.get('auth-token')?.value
        if (!token) return null

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me')
        const { payload } = await jwtVerify(token, secret)

        // Return payload directly as it contains role
        return payload as unknown as TokenPayload
    } catch {
        return null
    }
}

// GET /api/places/[id] - Get place details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const user = await getEdgeUser(request)

        // Raw SQL query to fetch place with all relations
        // Using json_build_object to structure the response like Prisma include
        const query = `
            SELECT 
                p.*,
                to_jsonb(pc.*) as category,
                CASE WHEN b.id IS NOT NULL THEN 
                    jsonb_build_object(
                        'id', b.id, 'name', b.name, 'campusId', b."campusId", 
                        'latitude', b.latitude, 'longitude', b.longitude,
                        'createdAt', b."createdAt", 'updatedAt', b."updatedAt",
                        'campus', to_jsonb(c.*)
                    )
                ELSE null END as block,
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
            LEFT JOIN campuses c ON b."campusId" = c.id
            LEFT JOIN floors f ON p."floorId" = f.id
            LEFT JOIN rooms r ON p."roomId" = r.id
            LEFT JOIN users u ON p."createdById" = u.id
            WHERE p.id = $1
        `

        const { rows } = await pool.query(query, [id])
        const place = rows[0]

        if (!place) {
            return NextResponse.json(
                { error: 'Place not found' },
                { status: 404 }
            )
        }

        if (place.approvalStatus !== 'APPROVED' && user?.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Place not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ place })
    } catch (error) {
        console.error('Error fetching place:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/places/[id] - Update place (admin only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getEdgeUser(request)
        if (user?.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        }

        const { id } = await params
        const body = await request.json()
        const { name, description, categoryId, latitude, longitude, blockId, floorId, roomId } = body

        // Construct dynamic UPDATE query
        const updates: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (name) {
            updates.push(`name = $${paramIndex++}`)
            values.push(name.trim())
        }
        if (description !== undefined) {
            updates.push(`description = $${paramIndex++}`)
            values.push(description?.trim() || null)
        }
        if (categoryId) {
            updates.push(`"categoryId" = $${paramIndex++}`)
            values.push(categoryId)
        }
        if (latitude !== undefined) {
            updates.push(`latitude = $${paramIndex++}`)
            values.push(latitude)
        }
        if (longitude !== undefined) {
            updates.push(`longitude = $${paramIndex++}`)
            values.push(longitude)
        }
        if (blockId !== undefined) {
            updates.push(`"blockId" = $${paramIndex++}`)
            values.push(blockId)
        }
        if (floorId !== undefined) {
            updates.push(`"floorId" = $${paramIndex++}`)
            values.push(floorId)
        }
        if (roomId !== undefined) {
            updates.push(`"roomId" = $${paramIndex++}`)
            values.push(roomId)
        }

        // Always update 'updatedAt'
        updates.push(`"updatedAt" = NOW()`)

        if (updates.length === 0) {
            return NextResponse.json({ message: 'No changes provided' })
        }

        values.push(id) // Add ID for WHERE clause
        const query = `
            UPDATE places 
            SET ${updates.join(', ')} 
            WHERE id = $${paramIndex}
            RETURNING *
        `

        // Execute update
        const { rows: updatedRows } = await pool.query(query, values)
        const updatedPlace = updatedRows[0]

        // Fetch relations for response (like Prisma)
        const relationsQuery = `
            SELECT 
                p.*,
                to_jsonb(pc.*) as category,
                CASE WHEN b.id IS NOT NULL THEN to_jsonb(b.*) ELSE null END as block
            FROM places p
            LEFT JOIN place_categories pc ON p."categoryId" = pc.id
            LEFT JOIN blocks b ON p."blockId" = b.id
            WHERE p.id = $1
        `
        const { rows: fullPlaceRows } = await pool.query(relationsQuery, [id])
        const finalPlace = fullPlaceRows[0]

        return NextResponse.json({
            message: 'Place updated successfully',
            place: finalPlace
        })

    } catch (error) {
        console.error('Error updating place:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
