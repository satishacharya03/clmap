import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
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

        // Update place status
        const place = await prisma.place.update({
            where: { id: placeId },
            data: { approvalStatus: status }
        })

        // Update approval record
        await prisma.approval.update({
            where: { placeId },
            data: {
                status,
                adminId: user!.id,
                reviewedAt: new Date()
            }
        })

        return NextResponse.json({
            message: `Place ${action}d successfully`,
            place
        })
    } catch (error) {
        console.error('Error processing approval:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
