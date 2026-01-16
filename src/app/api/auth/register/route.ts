export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
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
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: 'Email already registered' },
                { status: 409 }
            )
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password)
        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                email: email.toLowerCase(),
                password: hashedPassword,
                role: 'USER'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        })

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

