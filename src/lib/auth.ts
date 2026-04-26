import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
        secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
});

export async function getSession() {
    return await auth.getSession();
}

export async function getCurrentUser() {
    const session = await getSession();
    return session?.user ?? null;
}

export async function isAdmin() {
    const user = await getCurrentUser();
    // Neon Auth users have a role field if configured in the dashboard
    // or we can query the database directly if needed.
    // Assuming the user object from Neon Auth includes the role.
    return (user as any)?.role === "ADMIN";
}
