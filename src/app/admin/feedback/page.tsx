'use client'

import { useEffect, useState } from 'react'

interface FeedbackItem {
    id: string
    name: string
    email: string | null
    message: string
    rating: number
    createdAt: string
}

const STARS = (n: number) => Array(5).fill(0).map((_, i) => (
    <span key={i} className={i < n ? 'text-amber-400' : 'text-gray-200'}>★</span>
))

export default function AdminFeedbackPage() {
    const [feedback, setFeedback] = useState<FeedbackItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState<number | null>(null)

    useEffect(() => {
        fetch('/api/feedback')
            .then(r => r.ok ? r.json() : Promise.reject('Failed'))
            .then(d => setFeedback(d.feedback || []))
            .catch(() => setError('Failed to load feedback.'))
            .finally(() => setLoading(false))
    }, [])

    const displayed = filter ? feedback.filter(f => f.rating === filter) : feedback
    const avgRating = feedback.length > 0
        ? (feedback.reduce((s, f) => s + f.rating, 0) / feedback.length).toFixed(1)
        : '—'

    return (
        <div>
            {/* Header */}
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">User Feedback</h1>
                    <p className="text-white/40 mt-1 text-sm">All feedback submitted from the About page</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>
                        ⭐ Avg {avgRating} / 5
                    </div>
                    <div className="px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#a5b4fc' }}>
                        💬 {feedback.length} total
                    </div>
                </div>
            </div>

            {/* Rating filter */}
            <div className="flex gap-2 mb-6 flex-wrap">
                <button onClick={() => setFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!filter ? 'bg-indigo-500 text-white' : 'text-white/50 hover:text-white'}`} style={!filter ? {} : { background: 'rgba(255,255,255,0.05)' }}>All</button>
                {[5, 4, 3, 2, 1].map(r => (
                    <button key={r} onClick={() => setFilter(filter === r ? null : r)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === r ? 'bg-amber-500 text-white' : 'text-white/50 hover:text-white'}`} style={filter === r ? {} : { background: 'rgba(255,255,255,0.05)' }}>
                        {'⭐'.repeat(r)} ({feedback.filter(f => f.rating === r).length})
                    </button>
                ))}
            </div>

            {error && (
                <div className="text-center py-16 rounded-2xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p className="text-4xl mb-3">⚠️</p>
                    <p className="text-red-400">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array(6).fill(null).map((_, i) => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}
                </div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-4xl mb-3">💬</p>
                    <p className="text-white/40 text-sm">No feedback found{filter ? ` for ${filter} stars` : ''}.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {displayed.map(item => (
                        <div key={item.id} className="rounded-2xl p-5 transition-all hover:scale-[1.01]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                        {item.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">{item.name}</p>
                                        {item.email && <p className="text-white/40 text-xs">{item.email}</p>}
                                    </div>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-0.5 text-sm">{STARS(item.rating)}</div>
                            </div>

                            {/* Message */}
                            <p className="text-white/70 text-sm leading-relaxed mb-3">{item.message}</p>

                            {/* Date */}
                            <p className="text-white/25 text-xs">
                                {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
