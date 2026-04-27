import { createNeonAuth } from '@neondatabase/auth/next/server';
import { pool } from './edge-db';

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

export interface AppCurrentUser {
    id: string
    name: string
    email: string
    image: string | null
    emailVerified: boolean
    role: 'USER' | 'ADMIN'
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

function mapDbUserToAppUser(dbUser: DbUser): AppCurrentUser {
    return {
        id: dbUser.id,
        name: dbUser.name ?? dbUser.email.split('@')[0],
        email: dbUser.email,
        image: dbUser.image ?? null,
        emailVerified: dbUser.emailVerified,
        role: dbUser.role,
    };
}

// ============ getCurrentUser — Neon Auth is the ONLY auth source ============

export async function getCurrentUser(): Promise<AppCurrentUser | null> {
    try {
        const session = await getSession();
        if (!session?.user) return null;

        const sessionUser = session.user as NeonAuthUser;
        const dbUser = await getOrCreateDbUser(sessionUser);
        if (dbUser) return mapDbUserToAppUser(dbUser);
    } catch (error) {
        console.error('[Auth] getCurrentUser failed:', error);
    }
    return null;
}

export async function isAdmin() {
    const user = await getCurrentUser();
    return user?.role === 'ADMIN';
}

// ============ neon_auth.users — Source of truth for emailVerified ============

/**
 * Query neon_auth.users directly — the DB that Neon Auth updates immediately
 * when a user clicks a verification link. The session JWT may lag behind.
 * We try every known key name since Neon Auth stores data in raw_json JSONB.
 */
async function getNeonAuthVerifiedStatus(userId: string): Promise<boolean | null> {
    try {
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
        console.log(`[AuthSync] neon_auth.users for ${userId}:`, JSON.stringify({
            ev1: r.ev1, ev2: r.ev2, ev3: r.ev3, ev4: r.ev4,
            raw_json_keys: r.raw_json ? Object.keys(r.raw_json) : []
        }))

        if (r.ev1 === 'true' || r.ev1 === true) return true
        if (r.ev2 === 'true' || r.ev2 === true) return true
        if (r.ev3 === 'true' || r.ev3 === true) return true
        if (r.ev4 === 'true' || r.ev4 === true) return true

        // Scan raw_json for any key that looks like a verification field
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

// ============ users table sync — for places, reviews, roles, etc. ============

/**
 * Syncs Neon Auth user into our own users table.
 * The users table is ONLY for app data (places, reviews, roles).
 * Login/auth is handled entirely by Neon Auth.
 * Always reads emailVerified from neon_auth.users (source of truth).
 */
export async function getOrCreateDbUser(neonUser: NeonAuthUser): Promise<DbUser | null> {
    if (!neonUser?.email) {
        console.warn('⚠️ getOrCreateDbUser: No email in neonUser');
        return null;
    }

    try {
        const normalizedEmail = normalizeEmail(neonUser.email)

        // Always get the authoritative verification status from neon_auth
        const neonVerified = await getNeonAuthVerifiedStatus(neonUser.id)
        // Fall back to session claim if neon_auth query failed
        const sessionVerified = (neonUser as any).emailVerified ?? (neonUser as any).email_verified
        const emailVerified: boolean = neonVerified !== null
            ? neonVerified
            : (typeof sessionVerified === 'boolean' ? sessionVerified : false)

        const { rows } = await pool.query(
            'SELECT id, name, email, image, "emailVerified", role FROM users WHERE id = $1 OR email = $2 LIMIT 1',
            [neonUser.id, normalizedEmail]
        )
        const row = rows[0] as any

        if (row) {
            // User exists — sync name, image, emailVerified from Neon Auth
            const dbVerified: boolean = row.emailVerified ?? row.email_verified ?? row.emailverified ?? false
            const nextName = neonUser.name ?? row.name
            const nextImage = neonUser.image ?? neonUser.picture ?? row.image ?? null

            const needsUpdate =
                row.email !== normalizedEmail ||
                Boolean(dbVerified) !== Boolean(emailVerified) ||
                row.name !== nextName ||
                row.image !== nextImage

            if (needsUpdate) {
                console.log(`[AuthSync] Updating user ${normalizedEmail}: emailVerified ${dbVerified} → ${emailVerified}`)
                const updated = await pool.query(
                    'UPDATE users SET email=$1, name=$2, image=$3, "emailVerified"=$4, "updatedAt"=NOW() WHERE id=$5 RETURNING id, name, email, image, "emailVerified", role',
                    [normalizedEmail, nextName, nextImage, emailVerified, row.id]
                )
                const u = updated.rows[0] as any
                return u ? {
                    ...u,
                    emailVerified: u.emailVerified ?? u.email_verified ?? emailVerified
                } as DbUser : { ...row, emailVerified }
            }

            return { ...row, emailVerified: dbVerified } as DbUser
        }

        // New user — insert into users table
        console.log(`[AuthSync] Creating new user: ${normalizedEmail}, emailVerified=${emailVerified}`)
        const inserted = await pool.query(
            'INSERT INTO users (id, name, email, "emailVerified", image, role, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) RETURNING id, name, email, image, "emailVerified", role',
            [
                neonUser.id,
                neonUser.name ?? normalizedEmail.split('@')[0],
                normalizedEmail,
                emailVerified,
                neonUser.image ?? neonUser.picture ?? null,
                'USER',
            ]
        )
        const newRow = inserted.rows[0] as any
        return newRow ? {
            ...newRow,
            emailVerified: newRow.emailVerified ?? emailVerified
        } as DbUser : null

    } catch (err) {
        console.error('[AuthSync] getOrCreateDbUser error:', err);
        return null;
    }
}

export async function markEmailVerifiedInDb(userId: string): Promise<boolean> {
    try {
        const result = await pool.query(
            'UPDATE users SET "emailVerified" = true, "updatedAt" = NOW() WHERE id = $1 RETURNING id',
            [userId]
        )
        return result.rows.length > 0
    } catch (err) {
        console.error('[AuthSync] markEmailVerifiedInDb error:', err);
        return false;
    }
}
