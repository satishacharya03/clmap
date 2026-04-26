import { NextRequest, NextResponse } from 'next/server'
import { auth, getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        if (user.emailVerified) {
            return NextResponse.json({ success: true, message: 'Email already verified' })
        }

        const body = await request.json().catch(() => ({}))
        const callbackURL = typeof body?.callbackURL === 'string' && body.callbackURL.trim()
            ? body.callbackURL
            : '/profile'

        const result = await auth.sendVerificationEmail({
            email: user.email,
            callbackURL,
        })

        if (result?.error) {
            return NextResponse.json(
                {
                    error: result.error.message || 'Could not send verification link right now',
                },
                { status: 400 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Verification link sent',
        })
    } catch (error) {
        console.error('Send verification link error:', error)
        return NextResponse.json({ error: 'Failed to send verification link' }, { status: 500 })
    }
}
