import { NextResponse, NextRequest } from 'next/server'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import prisma from '@/lib/db'

/**
 * POST /api/admin/set-role
 * Body: { targetEmail: string, role: 'ADMIN' | 'USER' }
 *
 * Only existing ADMINs can call this.
 * Special case: if NO admins exist yet, the authenticated user
 * can promote themselves to ADMIN (first-time setup).
 */
export async function POST(req: NextRequest) {
    try {
        const neonUser = await getCurrentUser()
        if (!neonUser) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const body = await req.json()
        const { targetEmail, role } = body as { targetEmail?: string; role?: string }

        if (!targetEmail || !role || !['ADMIN', 'USER'].includes(role)) {
            return NextResponse.json({ error: 'targetEmail and role (ADMIN|USER) are required' }, { status: 400 })
        }

        const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
        const callerIsAdmin = await isAdmin()

        // First-time setup: no admin exists → caller can self-promote if email matches
        if (!adminExists) {
            if (neonUser.email !== targetEmail) {
                return NextResponse.json(
                    { error: 'First-time setup: you can only promote yourself' },
                    { status: 403 }
                )
            }
        } else if (!callerIsAdmin) {
            return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
        }

        // Upsert user in our DB then set role
        const updated = await prisma.user.upsert({
            where: { email: targetEmail },
            create: {
                name: targetEmail.split('@')[0],
                email: targetEmail,
                role: role as 'ADMIN' | 'USER',
            },
            update: {
                role: role as 'ADMIN' | 'USER',
            },
        })

        return NextResponse.json({
            message: `${updated.email} is now ${updated.role}`,
            user: { email: updated.email, role: updated.role }
        })
    } catch (error) {
        console.error('Set role error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
