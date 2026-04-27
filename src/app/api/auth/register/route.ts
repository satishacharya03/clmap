import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { generateToken, hashPassword, setAuthCookie } from '@/lib/auth-credentials'
import { normalizeAppCallbackURL } from '@/lib/app-origin'
import { postToNeonAuthProxy } from '@/lib/neon-auth-proxy'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const name = typeof body?.name === 'string' ? body.name.trim() : ''
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
        const password = typeof body?.password === 'string' ? body.password : ''

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
        }

        const existingResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 LIMIT 1',
            [email]
        )

        if (existingResult.rows[0]) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
        }

        const neonResult = await postToNeonAuthProxy<{
            message?: string
            code?: string
        }>(request, 'sign-up/email', {
            email,
            password,
            name,
            callbackURL: normalizeAppCallbackURL(request, body?.callbackURL, '/profile'),
        })

        if (!neonResult.ok) {
            const neonError =
                neonResult.data?.message ||
                neonResult.data?.code ||
                'Could not create verification account right now'

            return NextResponse.json(
                { error: neonError },
                { status: neonResult.status >= 400 ? neonResult.status : 400 }
            )
        }

        const hashedPassword = await hashPassword(password)
        const userId = crypto.randomUUID()

        const insertResult = await pool.query(
            'INSERT INTO users (id, name, email, password, "emailVerified", role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, name, email, role, "emailVerified"',
            [userId, name, email, hashedPassword, false, 'USER']
        )

        const user = insertResult.rows[0] as {
            id: string
            name: string | null
            email: string
            role: 'USER' | 'ADMIN'
            emailVerified: boolean
        }

        const token = await generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        })

        await setAuthCookie(token)

        return NextResponse.json({
            success: true,
            authMethod: 'credentials',
            user,
        })
    } catch (error) {
        console.error('Register error:', error)
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
    }
}
