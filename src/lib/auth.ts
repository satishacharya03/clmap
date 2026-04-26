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
    if (!session?.user) return null;

    // Automatically sync/provision the user in our local database
    // Pass the session user directly to avoid recursion
    const dbUser = await getOrCreateDbUser(session.user);
    
    return {
        ...session.user,
        emailVerified: session.user.emailVerified,
        role: dbUser?.role ?? 'USER'
    };
}

/**
 * isAdmin checks our OWN Prisma users table for the role,
 * because Neon Auth manages identity but our app manages roles.
 * Falls back to false if no matching user found.
 */
export async function isAdmin() {
    const neonUser = await getCurrentUser();
    if (!neonUser?.email) return false;
    return (neonUser as any).role === 'ADMIN';
}

/**
 * Sync the Neon user with our local Prisma database.
 * Auto-creates the DB record on first login if it doesn't exist yet.
 */
export async function getOrCreateDbUser(neonUser: any) {
    if (!neonUser?.email) return null;

    try {
        const existing = await prisma.user.findUnique({
            where: { email: neonUser.email },
        });

        if (existing) {
            // Optional: update emailVerified if it changed
            if (existing.emailVerified !== neonUser.emailVerified) {
                return await prisma.user.update({
                    where: { email: neonUser.email },
                    data: { emailVerified: neonUser.emailVerified }
                });
            }
            return existing;
        }

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
    } catch (err) {
        console.error("Error in getOrCreateDbUser:", err);
        return null;
    }
}
