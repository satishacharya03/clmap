import { createNeonAuth } from '@neondatabase/auth/next/server';
import prisma from './db';

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

export async function getCurrentUser() {
    const session = await getSession();
    return session?.user ?? null;
}

/**
 * isAdmin checks our OWN Prisma users table for the role,
 * because Neon Auth manages identity but our app manages roles.
 * Falls back to false if no matching user found.
 */
export async function isAdmin() {
    const neonUser = await getCurrentUser();
    if (!neonUser?.email) return false;

    try {
        const dbUser = await prisma.user.findUnique({
            where: { email: neonUser.email },
            select: { role: true },
        });
        return dbUser?.role === 'ADMIN';
    } catch {
        return false;
    }
}

/**
 * Get the full user record from our DB synced with Neon Auth user.
 * Auto-creates the DB record on first login if it doesn't exist yet.
 */
export async function getOrCreateDbUser() {
    const neonUser = await getCurrentUser();
    if (!neonUser) return null;

    try {
        const existing = await prisma.user.findUnique({
            where: { email: neonUser.email },
        });

        if (existing) return existing;

        // Auto-provision on first login
        return await prisma.user.create({
            data: {
                id: neonUser.id,
                name: neonUser.name ?? neonUser.email.split('@')[0],
                email: neonUser.email,
                emailVerified: neonUser.emailVerified ?? false,
                image: neonUser.image ?? null,
                role: 'USER',
            },
        });
    } catch {
        return null;
    }
}
