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
 * Query neon_auth.users directly — the authoritative source for email verification.
 * Neon Auth stores user data in a raw_json JSONB column; we try every known key name.
 */
async function getNeonAuthVerifiedStatus(userId: string): Promise<boolean | null> {
    try {
        // Fetch the full raw_json + any top-level columns that might exist
        const { rows } = await pool.query(
            `SELECT
                raw_json,
                raw_json->>'emailVerified'            AS ev1,
                raw_json->>'email_verified'           AS ev2,
                raw_json->>'primaryEmailVerified'     AS ev3,
                raw_json->'primaryEmail'->>'verified' AS ev4
             FROM neon_auth.users WHERE id = $1 LIMIT 1`,
            [userId]
        )

        if (rows.length === 0) {
            console.warn(`[AuthSync] neon_auth.users: no row for userId=${userId}`)
            return null
        }

        const r = rows[0]
        console.log(`[AuthSync] neon_auth.users raw for ${userId}:`, JSON.stringify({
            ev1: r.ev1, ev2: r.ev2, ev3: r.ev3, ev4: r.ev4,
            raw_json_keys: r.raw_json ? Object.keys(r.raw_json) : []
        }))

        // Return true if ANY of the known fields is truthy
        if (r.ev1 === 'true' || r.ev1 === true) return true
        if (r.ev2 === 'true' || r.ev2 === true) return true
        if (r.ev3 === 'true' || r.ev3 === true) return true
        if (r.ev4 === 'true' || r.ev4 === true) return true

        // Last resort: scan the entire raw_json for any verification-related key
        if (r.raw_json) {
            const json = r.raw_json as Record<string, unknown>
            for (const key of Object.keys(json)) {
                if (key.toLowerCase().includes('verif') && json[key] === true) {
                    console.log(`[AuthSync] Found verified via raw_json key: ${key}`)
                    return true
                }
            }
        }

        return false
    } catch (err) {
        console.warn('[AuthSync] Could not query neon_auth.users:', err)
        return null
    }
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

        const { rows } = await pool.query(
            'SELECT id, name, email, image, "emailVerified", role FROM users WHERE email = $1 OR id = $2 LIMIT 1',
            [normalizedEmail, neonUser.id]
        )
        const row = rows[0] as any
        const existing: DbUser | null = row ? {
            id: row.id,
            name: row.name,
            email: row.email,
            image: row.image,
            emailVerified: row.emailVerified ?? row.email_verified ?? row.emailverified ?? false,
            role: row.role
        } : null

        if (existing) {
            // Query neon_auth.users directly — most reliable source after email verification
            const neonDbVerified = await getNeonAuthVerifiedStatus(neonUser.id)
            // Fall back to session JWT fields if the neon_auth query failed
            const neonSessionRaw = (neonUser as any).emailVerified ?? (neonUser as any).email_verified
            const neonRaw = neonDbVerified !== null ? neonDbVerified : neonSessionRaw
            const nextEmailVerified = typeof neonRaw === 'boolean' ? neonRaw : existing.emailVerified;

            console.log(`[AuthSync] Found existing user: ${normalizedEmail}. DBVerified: ${existing.emailVerified}, NeonAuthDB: ${neonDbVerified}, NextVerified: ${nextEmailVerified}`);
            
            const nextName = neonUser.name ?? existing.name;
            const nextImage = neonUser.image ?? neonUser.picture ?? existing.image ?? null;

            if (
                existing.email !== normalizedEmail ||
                Boolean(existing.emailVerified) !== Boolean(nextEmailVerified) ||
                existing.name !== nextName ||
                existing.image !== nextImage
            ) {
                console.log(`[AuthSync] Updating user: ${normalizedEmail}. Changing verified from ${existing.emailVerified} to ${nextEmailVerified}`);
                const updateResult = await pool.query(
                    'UPDATE users SET email = $1, name = $2, image = $3, "emailVerified" = $4, "updatedAt" = NOW() WHERE id = $5 RETURNING id, name, email, image, "emailVerified", role',
                    [normalizedEmail, nextName, nextImage, nextEmailVerified, existing.id]
                )
                const updatedRow = updateResult.rows[0] as any
                return updatedRow ? {
                    ...updatedRow,
                    emailVerified: updatedRow.emailVerified ?? updatedRow.email_verified ?? updatedRow.emailverified ?? nextEmailVerified
                } as DbUser : existing
            }
            return existing;
        }

        console.log(`[AuthSync] Provisioning NEW user: ${normalizedEmail}`);
        const neonDbVerifiedNew = await getNeonAuthVerifiedStatus(neonUser.id)
        const neonVerified = neonDbVerifiedNew !== null
            ? neonDbVerifiedNew
            : ((neonUser as any).emailVerified ?? (neonUser as any).email_verified ?? false);
        const insertResult = await pool.query(
            'INSERT INTO users (id, name, email, "emailVerified", image, role, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id, name, email, image, "emailVerified", role',
            [
                neonUser.id,
                neonUser.name ?? neonUser.email.split('@')[0],
                normalizedEmail,
                neonVerified,
                neonUser.image ?? neonUser.picture ?? null,
                'USER',
            ]
        )
        const newRow = insertResult.rows[0] as any
        const newUser = newRow ? {
            ...newRow,
            emailVerified: newRow.emailVerified ?? newRow.email_verified ?? newRow.emailverified ?? neonVerified
        } as DbUser : null
        console.log(`[AuthSync] Successfully created user: ${normalizedEmail}`);
        return newUser;
    } catch (err) {
        console.error("[AuthSync] Error in getOrCreateDbUser:", err);
        return null;
    }
}

/**
 * Called after a user clicks their email verification link.
 * Forces emailVerified = true in the DB for the given userId.
 * Only called from the verified API route after Neon confirms the session is verified.
 */
export async function markEmailVerifiedInDb(userId: string): Promise<boolean> {
    try {
        const result = await pool.query(
            'UPDATE users SET "emailVerified" = true, "updatedAt" = NOW() WHERE id = $1 RETURNING id',
            [userId]
        )
        const updated = result.rows.length > 0;
        console.log(`[AuthSync] markEmailVerifiedInDb: userId=${userId}, updated=${updated}`);
        return updated;
    } catch (err) {
        console.error('[AuthSync] markEmailVerifiedInDb error:', err);
        return false;
    }
}
