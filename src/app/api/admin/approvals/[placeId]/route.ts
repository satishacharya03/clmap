

import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { getCurrentUser, isAdmin } from '@/lib/auth'

// POST /api/admin/approvals/[placeId] - Approve or reject a place
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ placeId: string }> }
) {
    try {
        const admin = await isAdmin()
        if (!admin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        }

        const { placeId } = await params
        const body = await request.json()
        const { action } = body // 'approve' or 'reject'

        if (!['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { error: 'Invalid action. Use "approve" or "reject"' },
                { status: 400 }
            )
        }

        const user = await getCurrentUser()
        const status = action === 'approve' ? 'APPROVED' : 'REJECTED'

        // Transaction for atomicity
        await pool.query('BEGIN')

        try {
            // Update place status
            const { rows: placeRows } = await pool.query(
                `UPDATE places SET "approvalStatus" = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *`,
                [status, placeId]
            )
            const place = placeRows[0]

            // Update approval record
            await pool.query(
                `UPDATE approvals 
                 SET status = $1, "adminId" = $2, "reviewedAt" = NOW(), "updatedAt" = NOW() 
                 WHERE "placeId" = $3`,
                [status, user!.id, placeId]
            )

            await pool.query('COMMIT')

            return NextResponse.json({
                message: `Place ${action}d successfully`,
                place
            })
        } catch (err) {
            await pool.query('ROLLBACK')
            throw err
        }
    } catch (error) {
        console.error('Error processing approval:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
