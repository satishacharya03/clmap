export const runtime = 'edge'

import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/categories - List all categories
export async function GET() {
    try {
        const categories = await prisma.placeCategory.findMany({
            orderBy: { categoryName: 'asc' },
            include: {
                _count: {
                    select: { places: true }
                }
            }
        })

        return NextResponse.json({ categories })
    } catch (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

