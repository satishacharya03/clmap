import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/feedback - Submit developer feedback (public)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, message, rating } = body

        if (!name?.trim() || !message?.trim()) {
            return NextResponse.json({ error: 'Name and message are required' }, { status: 400 })
        }

        const clampedRating = Math.min(5, Math.max(1, parseInt(rating) || 5))

        await pool.query(
            `INSERT INTO feedback (id, name, email, message, rating) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [name.trim(), email?.trim() || null, message.trim(), clampedRating]
        )

        return NextResponse.json({ message: 'Feedback submitted successfully' }, { status: 201 })
    } catch (error) {
        console.error('Error saving feedback:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// GET /api/feedback - List all feedback (admin only)
export async function GET() {
    try {
        const { isAdmin } = await import('@/lib/auth')
        const adminOk = await isAdmin()
        if (!adminOk) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
        }
        const { rows } = await pool.query(
            `SELECT * FROM feedback ORDER BY "createdAt" DESC LIMIT 200`
        )
        return NextResponse.json({ feedback: rows })
    } catch (error) {
        console.error('Error fetching feedback:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
