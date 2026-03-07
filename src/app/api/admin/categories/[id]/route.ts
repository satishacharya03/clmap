import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/edge-db'
import { isAdmin } from '@/lib/auth'

// DELETE /api/admin/categories/[id] - Delete a category
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    try {
        const { id } = await params
        // Check if places use this category
        const { rows: check } = await pool.query(
            `SELECT COUNT(*) FROM places WHERE "categoryId" = $1`, [id]
        )
        if (parseInt(check[0].count) > 0) {
            return NextResponse.json({ error: 'Cannot delete category that has places assigned to it' }, { status: 400 })
        }
        await pool.query(`DELETE FROM place_categories WHERE id = $1`, [id])
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
}

export const runtime = 'edge';
