

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth'
import { validateRegistration } from '@/utils/validators'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, password } = body

        // Validate input
        const errors = validateRegistration({ name, email, password })
        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validation failed', details: errors },
                { status: 400 }
            )
        }

        // Check if user already exists
        const { rows: existingRows } = await pool.query(
            'SELECT 1 FROM users WHERE email = $1',
            [email.toLowerCase()]
        )

        if (existingRows.length > 0) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 409 }
            )
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password)

        const { rows: userRows } = await pool.query(
            `INSERT INTO users (id, name, email, password, role, "updatedAt") 
             VALUES (gen_random_uuid(), $1, $2, $3, 'USER', NOW()) 
             RETURNING id, name, email, role, "createdAt"`,
            [name.trim(), email.toLowerCase(), hashedPassword]
        )

        const user = userRows[0]

        // Generate token and set cookie
        const token = await generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        })
        await setAuthCookie(token)

        return NextResponse.json(
            {
                message: 'Registration successful',
                user
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Registration error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

