import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { comparePassword, generateToken, setAuthCookie } from '@/lib/auth'
import { isValidEmail } from '@/utils/validators'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password } = body

        // Validate input
        if (!email || !isValidEmail(email)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            )
        }

        if (!password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            )
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid email or password' },
                { status: 401 }
            )
        }

        // Generate token and set cookie
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        })
        await setAuthCookie(token)

        return NextResponse.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
