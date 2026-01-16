

import { NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'

// GET /api/parking - Get parking availability
export async function GET() {
    try {
        const query = `
            SELECT 
                pa.*,
                to_jsonb(b.*) as block,
                coalesce(
                    (SELECT jsonb_agg(ps.* ORDER BY ps."slotNumber" ASC) 
                     FROM parking_slots ps 
                     WHERE ps."parkingAreaId" = pa.id),
                    '[]'::jsonb
                ) as slots
            FROM parking_areas pa
            LEFT JOIN blocks b ON pa."blockId" = b.id
        `
        const { rows: parkingAreas } = await pool.query(query)

        interface ParkingSlot {
            id: string;
            slotNumber: string;
            status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
            parkingAreaId: string;
        }

        interface ParkingArea {
            id: string;
            name: string;
            block: unknown;
            slots: ParkingSlot[];
            stats?: unknown;
        }

        // Calculate availability statistics
        const areasWithStats = parkingAreas.map((area: ParkingArea) => {
            const totalSlots = area.slots.length
            const availableSlots = area.slots.filter((s) => s.status === 'AVAILABLE').length
            const occupiedSlots = area.slots.filter((s) => s.status === 'OCCUPIED').length
            const reservedSlots = area.slots.filter((s) => s.status === 'RESERVED').length

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

