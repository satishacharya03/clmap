

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'

// GET /api/categories - List all categories
export async function GET() {
    try {
        const query = `
            SELECT 
                pc.*,
                (SELECT COUNT(*)::int FROM places p WHERE p."categoryId" = pc.id AND p."approvalStatus" = 'APPROVED') as "placeCount"
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

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { categoryName, icon } = body

        if (!categoryName || typeof categoryName !== 'string' || categoryName.trim().length < 2) {
            return NextResponse.json(
                { error: 'Category name must be at least 2 characters' },
                { status: 400 }
            )
        }

        const trimmedName = categoryName.trim()

        // Check for duplicate
        const { rows: existing } = await pool.query(
            `SELECT id FROM place_categories WHERE LOWER("categoryName") = LOWER($1)`,
            [trimmedName]
        )
        if (existing.length > 0) {
            return NextResponse.json(
                { error: 'A category with this name already exists' },
                { status: 409 }
            )
        }

        const id = crypto.randomUUID()

        const { rows } = await pool.query(
            `INSERT INTO place_categories (id, "categoryName", icon, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING *`,
            [id, trimmedName, icon || null]
        )

        return NextResponse.json({ category: rows[0] }, { status: 201 })
    } catch (error) {
        console.error('Error creating category:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

