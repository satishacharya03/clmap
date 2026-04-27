import { createNeonAuth } from '@neondatabase/auth/next/server';
import { cookies } from 'next/headers';
import prisma from './db';
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

        const dbUser = await prisma.user.findUnique({
            where: { email: normalizeEmail(payload.email) },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                emailVerified: true,
                role: true,
            }
        })

        if (!dbUser) return null;
        return mapDbUserToAppUser(dbUser as DbUser, {
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
        console.log(`[AuthSync] Syncing user: ${normalizedEmail}. NeonVerified: ${neonUser.emailVerified}`);

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: normalizedEmail },
                    { id: neonUser.id }
                ]
            }
        })

        if (existing) {
            console.log(`[AuthSync] Found existing user: ${normalizedEmail}. DBVerified: ${existing.emailVerified}`);
            
            const nextName = neonUser.name ?? existing.name;
            const nextImage = neonUser.image ?? neonUser.picture ?? existing.image ?? null;
            const nextEmailVerified = neonUser.emailVerified ?? existing.emailVerified;

            if (
                existing.email !== normalizedEmail ||
                existing.emailVerified !== nextEmailVerified ||
                existing.name !== nextName ||
                existing.image !== nextImage
            ) {
                console.log(`[AuthSync] Updating user: ${normalizedEmail}. Changing verified to: ${nextEmailVerified}`);
                const updated = await prisma.user.update({
                    where: { id: existing.id },
                    data: {
                        email: normalizedEmail,
                        name: nextName,
                        image: nextImage,
                        emailVerified: nextEmailVerified,
                        updatedAt: new Date()
                    }
                })
                return updated as DbUser;
            }
            return existing as DbUser;
        }

        console.log(`[AuthSync] Provisioning NEW user: ${normalizedEmail}`);
        const newUser = await prisma.user.create({
            data: {
                id: neonUser.id,
                name: neonUser.name ?? neonUser.email.split('@')[0],
                email: normalizedEmail,
                emailVerified: neonUser.emailVerified ?? false,
                image: neonUser.image ?? neonUser.picture ?? null,
                role: 'USER'
            }
        })
        console.log(`[AuthSync] Successfully created user: ${normalizedEmail}`);
        return newUser as DbUser;
    } catch (err) {
        console.error("[AuthSync] Error in getOrCreateDbUser:", err);
        return null;
    }
}
