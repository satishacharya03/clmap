import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { isAdmin } from '@/lib/auth'

// GET /api/admin/places - All places (any status) for admin management
export async function GET() {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { rows } = await pool.query(`
            SELECT p.*, 
                to_jsonb(pc.*) as category,
                to_jsonb(b.*) as block,
                jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) as "createdBy"
            FROM places p
            LEFT JOIN place_categories pc ON p."categoryId" = pc.id
            LEFT JOIN blocks b ON p."blockId" = b.id
            LEFT JOIN users u ON p."createdById" = u.id
            ORDER BY p."createdAt" DESC
        `)
        return NextResponse.json({ places: rows })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// DELETE /api/admin/places - Delete a place
export async function DELETE(req: NextRequest) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { placeId } = await req.json()
        await pool.query(`DELETE FROM places WHERE id = $1`, [placeId])
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PATCH /api/admin/places - Update approval status directly
export async function PATCH(req: NextRequest) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { placeId, approvalStatus } = await req.json()
        const { rows } = await pool.query(
            `UPDATE places SET "approvalStatus" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
            [approvalStatus, placeId]
        )
        return NextResponse.json({ place: rows[0] })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export const runtime = 'edge';

