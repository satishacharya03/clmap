export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'

// GET /api/categories - List all categories
export async function GET() {
    try {
        const query = `
            SELECT 
                pc.*,
                jsonb_build_object(
                    'places', (SELECT COUNT(*) FROM places p WHERE p."categoryId" = pc.id)
                ) as "_count"
            FROM place_categories pc
            ORDER BY pc."categoryName" ASC
        `
        const { rows: categories } = await pool.query(query)

        return NextResponse.json({ categories })
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

