'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Place {
    id: string; name: string; description?: string
    latitude?: number; longitude?: number; approvalStatus: string
    category?: { categoryName: string; icon?: string }
    block?: { name: string }
    createdBy: { name: string; email: string }
    createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: '#f59e0b', APPROVED: '#10b981', REJECTED: '#ef4444'
}

export default function ApprovalsPage() {
    const router = useRouter()
    const [places, setPlaces] = useState<Place[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [selected, setSelected] = useState<Place | null>(null)

    useEffect(() => {
        fetch('/api/admin/approvals')
            .then(r => { if (r.status === 403) { router.push('/map'); return null } return r.json() })
            .then(d => d && setPlaces(d.places || []))
            .finally(() => setLoading(false))
    }, [router])

    const act = async (placeId: string, action: 'approve' | 'reject') => {
        setProcessingId(placeId)
        await fetch(`/api/admin/approvals/${placeId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        })
        setPlaces(p => p.filter(x => x.id !== placeId))
        setSelected(null)
        setProcessingId(null)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
                    <p className="text-white/40 text-sm mt-1">Review and approve user-submitted places</p>
                </div>
                <span className="px-4 py-2 rounded-full text-sm font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                    {places.length} pending
                </span>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array(3).fill(null).map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
                </div>
            ) : places.length === 0 ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-5xl mb-4">🎉</p>
                    <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
                    <p className="text-white/40">No pending approvals at the moment.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {places.map(place => (
                        <div key={place.id} className="rounded-2xl p-5 flex items-center gap-5 transition-all hover:bg-white/5"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                style={{ background: 'rgba(99,102,241,0.2)' }}>
                                {place.category?.icon || '📍'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white text-sm">{place.name}</p>
                                <p className="text-white/40 text-xs mt-0.5">
                                    {place.category?.categoryName} • By {place.createdBy.name} • {new Date(place.createdAt).toLocaleDateString()}
                                </p>
                                {place.description && <p className="text-white/50 text-xs mt-1 line-clamp-1">{place.description}</p>}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => setSelected(place)}
                                    className="px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white rounded-xl transition-all"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    Details
                                </button>
                                <button onClick={() => act(place.id, 'approve')} disabled={processingId === place.id}
                                    className="px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                    {processingId === place.id ? '...' : '✓ Approve'}
                                </button>
                                <button onClick={() => act(place.id, 'reject')} disabled={processingId === place.id}
                                    className="px-3 py-1.5 text-xs font-bold text-white rounded-xl transition-all disabled:opacity-50 hover:opacity-90"
                                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                    {processingId === place.id ? '...' : '✗ Reject'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
                    <div className="relative w-full max-w-lg rounded-3xl p-6" style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-white">Place Details</h3>
                            <button onClick={() => setSelected(null)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-white rounded-xl hover:bg-white/10 transition-all">✕</button>
                        </div>
                        <div className="space-y-3 mb-6">
                            <div>
                                <p className="text-xs text-white/40 mb-1">Name</p>
                                <p className="text-white font-semibold">{selected.name}</p>
                            </div>
                            {selected.description && <div>
                                <p className="text-xs text-white/40 mb-1">Description</p>
                                <p className="text-white/80 text-sm">{selected.description}</p>
                            </div>}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-white/40 mb-1">Category</p>
                                    <p className="text-white text-sm">{selected.category?.icon} {selected.category?.categoryName || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 mb-1">Block</p>
                                    <p className="text-white text-sm">{selected.block?.name || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 mb-1">Submitted by</p>
                                    <p className="text-white text-sm">{selected.createdBy.name}</p>
                                </div>
                                {selected.latitude && <div>
                                    <p className="text-xs text-white/40 mb-1">Coordinates</p>
                                    <p className="text-white text-sm">{selected.latitude.toFixed(4)}, {selected.longitude?.toFixed(4)}</p>
                                </div>}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => act(selected.id, 'approve')} disabled={processingId === selected.id}
                                className="flex-1 py-3 text-sm font-bold text-white rounded-2xl disabled:opacity-50 hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
                                ✓ Approve
                            </button>
                            <button onClick={() => act(selected.id, 'reject')} disabled={processingId === selected.id}
                                className="flex-1 py-3 text-sm font-bold text-white rounded-2xl disabled:opacity-50 hover:opacity-90 transition-all"
                                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                                ✗ Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
