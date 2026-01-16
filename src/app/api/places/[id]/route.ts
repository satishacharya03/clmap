import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getCurrentUser, isAdmin } from '@/lib/auth'

// GET /api/places/[id] - Get place details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const place = await prisma.place.findUnique({
            where: { id },
            include: {
                category: true,
                block: {
                    include: { campus: true }
                },
                floor: true,
                room: true,
                photos: true,
                createdBy: {
                    select: { id: true, name: true }
                }
            }
        })

        if (!place) {
            return NextResponse.json(
                { error: 'Place not found' },
                { status: 404 }
            )
        }

        // Only return approved places to non-admin users
        const user = await getCurrentUser()
        if (place.approvalStatus !== 'APPROVED' && user?.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Place not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({ place })
    } catch (error) {
        console.error('Error fetching place:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT /api/places/[id] - Update place (admin only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const admin = await isAdmin()
        if (!admin) {
            return NextResponse.json(
                { error: 'Admin access required' },
                { status: 403 }
            )
        }

        const { id } = await params
        const body = await request.json()
        const { name, description, categoryId, latitude, longitude, blockId, floorId, roomId } = body

        const place = await prisma.place.update({
            where: { id },
            data: {
                ...(name && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
                ...(categoryId && { categoryId }),
                ...(latitude !== undefined && { latitude }),
                ...(longitude !== undefined && { longitude }),
                ...(blockId !== undefined && { blockId }),
                ...(floorId !== undefined && { floorId }),
                ...(roomId !== undefined && { roomId })
            },
            include: {
                category: true,
                block: true
            }
        })

        return NextResponse.json({
            message: 'Place updated successfully',
            place
        })
    } catch (error) {
        console.error('Error updating place:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
