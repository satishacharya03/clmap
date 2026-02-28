import { NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { isAdmin } from '@/lib/auth'

// GET /api/admin/stats - Dashboard overview numbers
export async function GET() {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const [places, pending, categories, users] = await Promise.all([
            pool.query(`SELECT COUNT(*) FROM places WHERE "approvalStatus" = 'APPROVED'`),
            pool.query(`SELECT COUNT(*) FROM places WHERE "approvalStatus" = 'PENDING'`),
            pool.query(`SELECT COUNT(*) FROM place_categories`),
            pool.query(`SELECT COUNT(*) FROM users`),
        ])
        return NextResponse.json({
            approvedPlaces: parseInt(places.rows[0].count),
            pendingPlaces: parseInt(pending.rows[0].count),
            categories: parseInt(categories.rows[0].count),
            users: parseInt(users.rows[0].count),
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}
