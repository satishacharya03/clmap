import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { pool } from '@/lib/edge-db'
import { auth } from '@/lib/auth'
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth-legacy'

async function verifyStoredPassword(email: string, plainPassword: string, storedPassword: string) {
    if (storedPassword.startsWith('$2')) {
        try {
            const { rows } = await pool.query(
                `SELECT (password = crypt($2, password)) AS match FROM users WHERE email = $1 AND password IS NOT NULL LIMIT 1`,
                [email, plainPassword]
            )
            if (rows[0]?.match === true) return true
        } catch (error) {
            console.error('bcrypt verification via pgcrypto failed:', error)
        }
    }

    return comparePassword(plainPassword, storedPassword)
}

async function tryProvisionNeonAccount(user: { email: string; name: string }, password: string) {
    try {
        const signInResult = await auth.signIn.email({
            email: user.email,
            password,
            callbackURL: '/profile',
        })

        if (!signInResult?.error) {
            return { available: true }
        }
    } catch (error) {
        console.error('Neon sign-in check failed during legacy login:', error)
    }

    try {
        const signUpResult = await auth.signUp.email({
            email: user.email,
            password,
            name: user.name,
            callbackURL: '/profile',
        })

        return { available: !signUpResult?.error }
    } catch (error) {
        console.error('Neon sign-up failed during legacy login:', error)
        return { available: false }
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
        const password = typeof body?.password === 'string' ? body.password : ''

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                emailVerified: true,
                password: true,
            },
        })

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

        const neon = await tryProvisionNeonAccount({
            email: user.email,
            name: user.name || user.email.split('@')[0],
        }, password)

        return NextResponse.json({
            success: true,
            authMethod: 'legacy',
            verificationRequired: !user.emailVerified,
            neonAccountReady: neon.available,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
            },
        })
    } catch (error) {
        console.error('Legacy login error:', error)
        return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }
}
