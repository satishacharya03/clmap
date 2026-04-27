

import { NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { isAdmin } from '@/lib/auth'

// GET /api/admin/approvals - List pending approvals
export async function GET() {
    try {
        const admin = await isAdmin()
        if (!admin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        }

        const query = `
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
                jsonb_build_object('id', u.id, 'name', u.name, 'email', u.email) as "createdBy",
                to_jsonb(a.*) as approval
            FROM places p
            LEFT JOIN place_categories pc ON p."categoryId" = pc.id
            LEFT JOIN blocks b ON p."blockId" = b.id
            LEFT JOIN floors f ON p."floorId" = f.id
            LEFT JOIN rooms r ON p."roomId" = r.id
            LEFT JOIN users u ON p."createdById" = u.id
            LEFT JOIN approvals a ON a."placeId" = p.id
            WHERE p."approvalStatus" = 'PENDING'
            ORDER BY p."createdAt" DESC
        `

        const { rows: pendingPlaces } = await pool.query(query)

        return NextResponse.json({ places: pendingPlaces })
    } catch (error) {
        console.error('Error fetching pending approvals:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

