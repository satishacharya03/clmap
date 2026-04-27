import { createNeonAuth } from '@neondatabase/auth/next/server';
import { cookies } from 'next/headers';
import { pool } from './edge-db';
import { verifyToken } from './auth-credentials';
// Next.js handles .env loading automatically.

// ============ Neon Managed Auth Instance ============
export const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
});

// ============ Server Helpers ============

export async function getSession() {
    const { data } = await auth.getSession();
    return data;
}

type AuthMethod = 'neon' | 'credentials'

interface DbUser {
    id: string
    name: string | null
    email: string
    image: string | null
    emailVerified: boolean
    role: 'USER' | 'ADMIN'
}

interface NeonAuthUser {
    id: string
    email: string
    name?: string | null
    image?: string | null
    picture?: string | null
    emailVerified?: boolean
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

export interface AppCurrentUser {
    id: string
    name: string
    email: string
    image: string | null
    emailVerified: boolean
    role: 'USER' | 'ADMIN'
    authMethod: AuthMethod
}

function mapDbUserToAppUser(
    dbUser: NonNullable<DbUser>,
    fallback: Partial<{
        id: string
        name: string | null
        email: string
        image: string | null
        emailVerified: boolean
    }> = {},
    authMethod: AuthMethod
): AppCurrentUser {
    return {
        id: dbUser.id,
        name: dbUser.name ?? fallback.name ?? dbUser.email.split('@')[0],
        email: dbUser.email,
        image: dbUser.image ?? fallback.image ?? null,
        emailVerified: dbUser.emailVerified,
        role: dbUser.role,
        authMethod,
    };
}

async function getCredentialsCurrentUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;

        const payload = await verifyToken(token);
        if (!payload?.email) return null;

        const { rows } = await pool.query(
            'SELECT id, name, email, image, "emailVerified", role FROM users WHERE email = $1 LIMIT 1',
            [normalizeEmail(payload.email)]
        )
        const dbUser = (rows[0] as DbUser | undefined) ?? null

        if (!dbUser) return null;
        return mapDbUserToAppUser(dbUser, {
            id: payload.userId,
            email: payload.email,
            emailVerified: false,
        }, 'credentials');
    } catch (error) {
        console.error('Credentials auth lookup failed:', error);
        return null;
    }
}

export async function getCurrentUser() {
    try {
        const session = await getSession();
        if (session?.user) {
            const sessionUser = session.user as NeonAuthUser;
            const dbUser = await getOrCreateDbUser(sessionUser);
            if (dbUser) {
                return mapDbUserToAppUser(dbUser, {
                    id: sessionUser.id,
                    name: sessionUser.name,
                    email: sessionUser.email,
                    image: sessionUser.image ?? sessionUser.picture ?? null,
                    emailVerified: sessionUser.emailVerified,
                }, 'neon');
            }
        }
    } catch (error) {
        console.error('Neon auth lookup failed:', error);
    }

    return await getCredentialsCurrentUser();
}

/**
 * isAdmin checks our own users table for the role,
 * because Neon Auth manages identity but our app manages roles.
 * Falls back to false if no matching user found.
 */
export async function isAdmin() {
    const user = await getCurrentUser();
    return user?.role === 'ADMIN';
}

/**
 * Sync the Neon user with our local database.
 * Auto-creates the DB record on first login if it doesn't exist yet.
 */
export async function getOrCreateDbUser(neonUser: NeonAuthUser) {
    if (!neonUser?.email) {
        console.warn("⚠️ getOrCreateDbUser: No email provided in neonUser object");
        return null;
    }

    try {
        const normalizedEmail = normalizeEmail(neonUser.email)

        const { rows } = await pool.query(
            'SELECT id, name, email, image, "emailVerified", role FROM users WHERE email = $1 OR id = $2 LIMIT 1',
            [normalizedEmail, neonUser.id]
        )
        const existing = (rows[0] as DbUser | undefined) ?? null

        if (existing) {
            console.log(`✅ Found existing user in DB: ${normalizedEmail}`);
            const nextName = neonUser.name ?? existing.name;
            const nextImage = neonUser.image ?? neonUser.picture ?? existing.image ?? null;
            const nextEmailVerified = neonUser.emailVerified ?? existing.emailVerified;

            if (
                existing.email !== normalizedEmail ||
                existing.emailVerified !== nextEmailVerified ||
                existing.name !== nextName ||
                existing.image !== nextImage
            ) {
                const updateResult = await pool.query(
                    'UPDATE users SET email = $1, name = $2, image = $3, "emailVerified" = $4, "updatedAt" = NOW() WHERE id = $5 RETURNING id, name, email, image, "emailVerified", role',
                    [normalizedEmail, nextName, nextImage, nextEmailVerified, existing.id]
                )
                return (updateResult.rows[0] as DbUser | undefined) ?? existing
            }
            return existing;
        }

        console.log(`🆕 Provisioning NEW user in DB: ${normalizedEmail}`);
        const insertResult = await pool.query(
            'INSERT INTO users (id, name, email, "emailVerified", image, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, name, email, image, "emailVerified", role',
            [
                neonUser.id,
                neonUser.name ?? neonUser.email.split('@')[0],
                normalizedEmail,
                neonUser.emailVerified ?? false,
                neonUser.image ?? neonUser.picture ?? null,
                'USER',
            ]
        )
        const newUser = (insertResult.rows[0] as DbUser | undefined) ?? null
        console.log(`✨ Successfully created DB user for: ${normalizedEmail}`);
        return newUser;
    } catch (err) {
        console.error("❌ Error in getOrCreateDbUser:", err);
        return null;
    }
}
