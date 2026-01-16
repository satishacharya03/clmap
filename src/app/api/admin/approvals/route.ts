import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/auth'

// GET /api/admin/approvals - List pending approvals
export async function GET() {
    try {
        const admin = await isAdmin()
        if (!admin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        }

        const pendingPlaces = await prisma.place.findMany({
            where: { approvalStatus: 'PENDING' },
            include: {
                category: true,
                block: true,
                floor: true,
                room: true,
                photos: true,
                createdBy: {
                    select: { id: true, name: true, email: true }
                },
                approval: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ places: pendingPlaces })
    } catch (error) {
        console.error('Error fetching pending approvals:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

