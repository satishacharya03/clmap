import { NextResponse } from 'next/server'
import { getSession, markEmailVerifiedInDb } from '@/lib/auth'

// POST /api/auth/sync-verification
// Called by the profile page after landing from an email verification link.
// Reads the current Neon session to check if email is now verified,
// and force-marks it as verified in our local users table.
export const dynamic = 'force-dynamic'
export async function POST() {
    try {
        const session = await getSession()

        if (!session?.user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const neonUser = session.user as {
            id: string
            email: string
            emailVerified?: boolean
            email_verified?: boolean
        }

        // Neon Auth marks the session user after verifier is processed
        const isVerified =
            neonUser.emailVerified === true ||
            (neonUser as any).email_verified === true

        console.log(`[SyncVerification] userId=${neonUser.id}, isVerified=${isVerified}`)

        if (!isVerified) {
            // Session doesn't yet show verified — return current state
            return NextResponse.json({ verified: false })
        }

        // Force-update our DB
        const updated = await markEmailVerifiedInDb(neonUser.id)
        return NextResponse.json({ verified: true, updated })
    } catch (error) {
        console.error('[SyncVerification] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
