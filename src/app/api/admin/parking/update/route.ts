

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
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

        const { rows: slotRows } = await pool.query(
            `UPDATE parking_slots SET status = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
            [status, slotId]
        )
        const slot = slotRows[0]

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

