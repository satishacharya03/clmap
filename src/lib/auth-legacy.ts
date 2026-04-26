import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { pool } from './edge-db'

// Types matching database schema
export interface User {
    id: string
    name: string | null
    email: string
    role: 'USER' | 'ADMIN'
    createdAt: Date
    updatedAt: Date
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me')
const TOKEN_EXPIRY = '7d'

// Password hashing using Web Crypto API (edge-compatible)
export async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const salt = crypto.getRandomValues(new Uint8Array(16))

    const keyMaterial = await crypto.subtle.importKey(
        'raw', data, 'PBKDF2', false, ['deriveBits']
    )

    const hash = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        256
    )

    // Combine salt and hash, encode as base64
    const combined = new Uint8Array(salt.length + hash.byteLength)
    combined.set(salt)
    combined.set(new Uint8Array(hash), salt.length)

    return btoa(String.fromCharCode(...combined))
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
        const combined = Uint8Array.from(atob(hashedPassword), c => c.charCodeAt(0))
        const salt = combined.slice(0, 16)
        const storedHash = combined.slice(16)

        const encoder = new TextEncoder()
        const data = encoder.encode(password)

        const keyMaterial = await crypto.subtle.importKey(
            'raw', data, 'PBKDF2', false, ['deriveBits']
        )

        const hash = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            256
        )

        const newHash = new Uint8Array(hash)

        // Constant-time comparison
        if (newHash.length !== storedHash.length) return false
        let result = 0
        for (let i = 0; i < newHash.length; i++) {
            result |= newHash[i] ^ storedHash[i]
        }
        return result === 0
    } catch {
        return false
    }
}

// JWT token management using jose (edge-compatible)
export interface TokenPayload {
    userId: string
    email: string
    role: string
    [key: string]: unknown  // Index signature for JWTPayload compatibility
}

export async function generateToken(payload: TokenPayload): Promise<string> {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(TOKEN_EXPIRY)
        .setIssuedAt()
        .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return payload as unknown as TokenPayload
    } catch {
        return null
    }
}

// Get current user from cookies
export async function getCurrentUser(): Promise<User | null> {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get('auth-token')?.value

        if (!token) return null

        const payload = await verifyToken(token)
        if (!payload) return null

        const { rows } = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [payload.userId]
        )

        return rows[0] as User || null
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
        maxAge: 7 * 24 * 60 * 60,
        path: '/'
    })
}

export async function removeAuthCookie() {
    const cookieStore = await cookies()
    cookieStore.delete('auth-token')
}
