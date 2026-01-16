export const runtime = 'edge'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/blocks - List all blocks
export async function GET() {
    try {
        const blocks = await prisma.block.findMany({
            include: {
                campus: true,
                _count: { select: { floors: true, places: true } }
            },
            orderBy: { name: 'asc' }
        })

        return NextResponse.json({ blocks })
    } catch (error) {
        console.error('Error fetching blocks:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

