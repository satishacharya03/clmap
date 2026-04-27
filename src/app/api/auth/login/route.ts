import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth-credentials'

async function verifyStoredPassword(email: string, plainPassword: string, storedPassword: string) {
    if (storedPassword.startsWith('$2')) {
        try {
            const { rows } = await pool.query(
                'SELECT (password = crypt($2, password)) AS match FROM users WHERE email = $1 AND password IS NOT NULL LIMIT 1',
                [email, plainPassword]
            )
            if (rows[0]?.match === true) return true
        } catch (error) {
            console.error('bcrypt verification via pgcrypto failed:', error)
        }
    }

    return comparePassword(plainPassword, storedPassword)
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
        const password = typeof body?.password === 'string' ? body.password : ''

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const { rows } = await pool.query(
            'SELECT id, name, email, role, "emailVerified", password FROM users WHERE email = $1 LIMIT 1',
            [email]
        )

        const user = rows[0] as
            | {
                id: string
                name: string | null
                email: string
                role: 'USER' | 'ADMIN'
                emailVerified: boolean
                password: string | null
            }
            | undefined

        if (!user?.password) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
        }

        const passwordOk = await verifyStoredPassword(email, password, user.password)
        if (!passwordOk) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
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
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
            },
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
}
