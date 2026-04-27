import { NextResponse } from 'next/server'
import { getSession, markEmailVerifiedInDb } from '@/lib/auth'
import { pool } from '@/lib/edge-db'

// POST /api/auth/sync-verification
// Queries neon_auth.users directly (source of truth) to check email_verified,
// then syncs our local users table. Called by the profile page for unverified users.
export const dynamic = 'force-dynamic'

export async function POST() {
    try {
        const session = await getSession()

        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const userId = (session.user as any).id as string
        if (!userId) {
            return NextResponse.json({ error: 'No user ID in session' }, { status: 400 })
        }

        // Query neon_auth.users directly — this is updated immediately after
        // the user clicks the verification link, before the session JWT is refreshed
        let neonVerified = false
        try {
            const { rows } = await pool.query(
                'SELECT email_verified FROM neon_auth.users WHERE id = $1 LIMIT 1',
                [userId]
            )
            if (rows.length > 0) {
                neonVerified = rows[0].email_verified === true
            }
            console.log(`[SyncVerification] userId=${userId}, neon_auth.email_verified=${neonVerified}`)
        } catch (dbErr) {
            console.error('[SyncVerification] Could not query neon_auth.users:', dbErr)
            // Fall back to session JWT
            const u = session.user as any
            neonVerified = u.emailVerified === true || u.email_verified === true
        }

        if (!neonVerified) {
            return NextResponse.json({ verified: false })
        }

        // Update our own users table
        const updated = await markEmailVerifiedInDb(userId)
        return NextResponse.json({ verified: true, updated })
    } catch (error) {
        console.error('[SyncVerification] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
