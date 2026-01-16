import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import prisma from './db'

type User = Awaited<ReturnType<typeof prisma.user.findUnique>>

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me'
const TOKEN_EXPIRY = '7d'

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
}

// JWT token management
export interface TokenPayload {
    userId: string
    email: string
    role: string
}

export function generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token: string): TokenPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload
    } catch {
        return null
    }
}

// Get current user from cookies (for server components and API routes)
export async function getCurrentUser(): Promise<User | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) return null

        const payload = verifyToken(token)
        if (!payload) return null

        const user = await prisma.user.findUnique({
            where: { id: payload.userId }
        })

        return user
    } catch {
        return null
    }
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
    const user = await getCurrentUser()
    return user?.role === 'ADMIN'
}

// Token cookie helpers
export async function setAuthCookie(token: string) {
    const cookieStore = await cookies()
    cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    })
}

export async function removeAuthCookie() {
    const cookieStore = await cookies()
    cookieStore.delete('auth-token')
}
