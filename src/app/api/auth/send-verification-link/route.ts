import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { normalizeAppCallbackURL } from '@/lib/app-origin'
import { postToNeonAuthProxy } from '@/lib/neon-auth-proxy'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}))
        const user = await getCurrentUser()
        
        // Use email from body if provided (for public resend), otherwise use logged-in user's email
        const targetEmail = body?.email || user?.email

        if (!targetEmail) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const callbackURL = normalizeAppCallbackURL(request, body?.callbackURL, '/profile')

        console.log(`[ResendAuth] Attempting to resend verification to: ${targetEmail}`);

        // Try the standard Neon Auth / Better Auth endpoints
        let result = await postToNeonAuthProxy<{
            message?: string
            code?: string
        }>(request, 'verify-email/send-verification-email', {
            email: targetEmail,
            callbackURL,
        })

        // Fallback for different Neon Auth versions
        if (!result.ok) {
            result = await postToNeonAuthProxy<{
                message?: string
                code?: string
            }>(request, 'send-verification-email', {
                email: targetEmail,
                callbackURL,
            })
        }

        if (!result.ok) {
            const errorMsg = result.data?.message || result.data?.code || 'Neon Auth error';
            return NextResponse.json(
                { error: errorMsg },
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
