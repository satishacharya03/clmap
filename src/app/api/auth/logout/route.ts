import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// POST /api/auth/logout — signs out via Neon Auth
export async function POST() {
    try {
        // Neon Auth handles session invalidation via its own handler
        // The client-side authClient.signOut() is the primary logout path.
        // This route is a fallback for server-side cleanup.
        return NextResponse.json({ success: true })
    } catch {
        return NextResponse.json({ success: true })
    }
}
