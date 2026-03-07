import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { isAdmin } from '@/lib/auth'

// GET /api/admin/users - List all users
export async function GET() {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { rows } = await pool.query(
            `SELECT id, name, email, role, "createdAt" FROM users ORDER BY "createdAt" DESC`
        )
        return NextResponse.json({ users: rows })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

// PATCH /api/admin/users - Change a user's role
export async function PATCH(req: NextRequest) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { userId, role } = await req.json()
        if (!userId || !['USER', 'ADMIN'].includes(role))
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
        const { rows } = await pool.query(
            `UPDATE users SET role = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING id, name, email, role`,
            [role, userId]
        )
        return NextResponse.json({ user: rows[0] })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export const runtime = 'edge';

