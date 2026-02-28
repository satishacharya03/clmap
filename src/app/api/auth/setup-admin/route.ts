import { NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/auth/setup-admin
// Promotes the currently logged-in user to ADMIN.
// Only works if there are currently zero admins in the system (first-time setup).
export async function POST() {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
        }

        // Check if an admin already exists
        const { rows: admins } = await pool.query(
            `SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`
        )

        if (admins.length > 0 && admins[0].id !== user.id) {
            return NextResponse.json(
                { error: 'An admin already exists. Contact them to grant you access.' },
                { status: 403 }
            )
        }

        // Promote the current user
        const { rows } = await pool.query(
            `UPDATE users SET role = 'ADMIN', "updatedAt" = NOW() WHERE id = $1 RETURNING id, name, email, role`,
            [user.id]
        )

        return NextResponse.json({
            message: `✅ ${rows[0].name} is now an ADMIN. Refresh the page to activate admin features.`,
            user: rows[0]
        })
    } catch (error) {
        console.error('Setup admin error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
