import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET /api/parking - Get parking availability
export async function GET() {
    try {
        const parkingAreas = await prisma.parkingArea.findMany({
            include: {
                block: true,
                slots: {
                    orderBy: { slotNumber: 'asc' }
                }
            }
        })

        // Calculate availability statistics
        const areasWithStats = parkingAreas.map((area: typeof parkingAreas[number]) => {
            const totalSlots = area.slots.length
            const availableSlots = area.slots.filter((s: typeof area.slots[number]) => s.status === 'AVAILABLE').length
            const occupiedSlots = area.slots.filter((s: typeof area.slots[number]) => s.status === 'OCCUPIED').length
            const reservedSlots = area.slots.filter((s: typeof area.slots[number]) => s.status === 'RESERVED').length

            return {
                ...area,
                stats: {
                    total: totalSlots,
                    available: availableSlots,
                    occupied: occupiedSlots,
                    reserved: reservedSlots,
                    availabilityPercent: totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0
                }
            }
        })

        return NextResponse.json({ parkingAreas: areasWithStats })
    } catch (error) {
        console.error('Error fetching parking data:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

