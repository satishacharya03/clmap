export const runtime = 'edge'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { isAdmin } from '@/lib/auth'

// POST /api/admin/parking/update - Update parking slot status
export async function POST(request: NextRequest) {
    try {
        const admin = await isAdmin()
        if (!admin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { slotId, status } = body

        if (!slotId || !status) {
            return NextResponse.json(
                { error: 'slotId and status are required' },
                { status: 400 }
            )
        }

        if (!['AVAILABLE', 'OCCUPIED', 'RESERVED'].includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Use AVAILABLE, OCCUPIED, or RESERVED' },
                { status: 400 }
            )
        }

        const slot = await prisma.parkingSlot.update({
            where: { id: slotId },
            data: { status }
        })

        return NextResponse.json({
            message: 'Parking slot updated',
            slot
        })
    } catch (error) {
        console.error('Error updating parking slot:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

