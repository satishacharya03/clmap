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

        console.log(`[ResendAuth] Attempting to resend verification to: ${user.email}`);

        // Try the standard Better Auth 1.0 endpoint first
        let result = await postToNeonAuthProxy<{
            message?: string
            code?: string
        }>(request, 'verify-email/send-verification-email', {
            email: user.email,
            callbackURL,
        })

        // If that fails, try the alternative endpoint path
        if (!result.ok) {
            console.warn(`[ResendAuth] Primary endpoint failed (${result.status}), trying alternative...`);
            result = await postToNeonAuthProxy<{
                message?: string
                code?: string
            }>(request, 'send-verification-email', {
                email: user.email,
                callbackURL,
            })
        }

        if (!result.ok) {
            const errorMsg = result.data?.message || result.data?.code || 'Neon Auth error';
            console.error(`[ResendAuth] Both endpoints failed. Last error: ${errorMsg} (Status: ${result.status})`);
            
            return NextResponse.json(
                {
                    error: errorMsg,
                    details: 'Check if you are signed in or if the email is correct.',
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
