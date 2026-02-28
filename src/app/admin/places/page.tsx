'use client'

import { useState, useEffect } from 'react'

interface Place {
    id: string; name: string; description?: string
    approvalStatus: string; createdAt: string
    latitude?: number; longitude?: number
    category?: { categoryName: string; icon?: string }
    block?: { name: string }
    createdBy: { name: string; email: string }
}

const STATUS = { APPROVED: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.12)' }, PENDING: { label: 'Pending', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }, REJECTED: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' } }

export default function PlacesAdminPage() {
    const [places, setPlaces] = useState<Place[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL')
    const [search, setSearch] = useState('')
    const [processing, setProcessing] = useState<string | null>(null)

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/admin/places')
            .then(r => {
                if (r.status === 403) {
                    setError('Access Denied. You do not have permission to manage places.')
                    return null
                }
                return r.json()
            })
            .then(d => d && setPlaces(d.places || []))
            .catch(() => setError('Failed to load places.'))
            .finally(() => setLoading(false))
    }, [])

    const changeStatus = async (placeId: string, approvalStatus: string) => {
        setProcessing(placeId)
        await fetch('/api/admin/places', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId, approvalStatus }) })
        setPlaces(p => p.map(x => x.id === placeId ? { ...x, approvalStatus } : x))
        setProcessing(null)
    }

    const deletePlace = async (placeId: string) => {
        if (!confirm('Delete this place permanently?')) return
        setProcessing(placeId)
        await fetch('/api/admin/places', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId }) })
        setPlaces(p => p.filter(x => x.id !== placeId))
        setProcessing(null)
    }

    const filtered = places.filter(p => {
        if (filter !== 'ALL' && p.approvalStatus !== filter) return false
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">All Places</h1>
                    <p className="text-white/40 text-sm mt-1">{places.length} total places</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search places..."
                    className="flex-1 min-w-48 px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map(s => (
                    <button key={s} onClick={() => setFilter(s)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                            background: filter === s ? '#6366f1' : 'rgba(255,255,255,0.05)',
                            color: filter === s ? '#fff' : 'rgba(255,255,255,0.5)',
                            border: `1px solid ${filter === s ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {error ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p className="text-5xl mb-4">🚫</p>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Access Denied</h3>
                    <p className="text-red-400/60">{error}</p>
                </div>
            ) : loading ? (
                <div className="space-y-2">{Array(5).fill(null).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
            ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                    {filtered.length === 0 ? (
                        <div className="py-16 text-center text-white/40">No places found</div>
                    ) : filtered.map((place, i) => {
                        const st = STATUS[place.approvalStatus as keyof typeof STATUS] || STATUS.PENDING
                        return (
                            <div key={place.id} className="flex items-center gap-4 px-5 py-4 transition-all hover:bg-white/4"
                                style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                <span className="text-xl">{place.category?.icon || '📍'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{place.name}</p>
                                    <p className="text-xs text-white/30 mt-0.5">{place.category?.categoryName} • {place.createdBy.name} • {new Date(place.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                                    style={{ background: st.bg, color: st.color }}>
                                    {st.label}
                                </span>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    {place.approvalStatus !== 'APPROVED' && (
                                        <button onClick={() => changeStatus(place.id, 'APPROVED')} disabled={processing === place.id}
                                            className="px-2.5 py-1.5 text-xs font-bold text-white rounded-lg disabled:opacity-50"
                                            style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                            Approve
                                        </button>
                                    )}
                                    {place.approvalStatus !== 'REJECTED' && (
                                        <button onClick={() => changeStatus(place.id, 'REJECTED')} disabled={processing === place.id}
                                            className="px-2.5 py-1.5 text-xs font-bold text-red-300 rounded-lg disabled:opacity-50"
                                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                            Reject
                                        </button>
                                    )}
                                    <button onClick={() => deletePlace(place.id)} disabled={processing === place.id}
                                        className="px-2.5 py-1.5 text-xs font-bold text-white/40 hover:text-red-400 rounded-lg transition-all disabled:opacity-50"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        🗑
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
