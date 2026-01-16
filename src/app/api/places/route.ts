import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { validatePlace } from '@/utils/validators'

// GET /api/places - List all approved places
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const categoryId = searchParams.get('categoryId')
        const blockId = searchParams.get('blockId')
        const search = searchParams.get('search')

        const places = await prisma.place.findMany({
            where: {
                approvalStatus: 'APPROVED',
                ...(categoryId && { categoryId }),
                ...(blockId && { blockId }),
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                })
            },
            include: {
                category: true,
                block: true,
                floor: true,
                room: true,
                photos: true,
                createdBy: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ places })
    } catch (error) {
        console.error('Error fetching places:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST /api/places - Submit a new place (authenticated users)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()
        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { name, description, categoryId, latitude, longitude, blockId, floorId, roomId } = body

        // Validate input
        const errors = validatePlace({ name, description, categoryId, latitude, longitude, blockId, floorId, roomId })
        if (errors.length > 0) {
            return NextResponse.json(
                { error: 'Validation failed', details: errors },
                { status: 400 }
            )
        }

        // Create place with pending approval status
        const place = await prisma.place.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                categoryId,
                latitude,
                longitude,
                blockId,
                floorId,
                roomId,
                createdById: user.id,
                approvalStatus: 'PENDING'
            },
            include: {
                category: true,
                block: true
            }
        })

        // Create approval record
        await prisma.approval.create({
            data: {
                placeId: place.id,
                status: 'PENDING'
            }
        })

        return NextResponse.json(
            {
                message: 'Place submitted for approval',
                place
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating place:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

