import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { normalizeAppCallbackURL } from '@/lib/app-origin'
import { postToNeonAuthProxy } from '@/lib/neon-auth-proxy'

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
        const callbackURL = normalizeAppCallbackURL(request, body?.callbackURL, '/profile')

        const result = await postToNeonAuthProxy<{
            message?: string
            code?: string
        }>(request, 'send-verification-email', {
            email: user.email,
            callbackURL,
        })

        if (!result.ok) {
            return NextResponse.json(
                {
                    error:
                        result.data?.message ||
                        result.data?.code ||
                        'Could not send verification link right now',
                },
                { status: result.status >= 400 ? result.status : 400 }
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
