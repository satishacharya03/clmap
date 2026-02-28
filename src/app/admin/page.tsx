'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Stats {
    approvedPlaces: number
    pendingPlaces: number
    categories: number
    users: number
}

const StatCard = ({ icon, label, value, color, href }: { icon: string, label: string, value: number | string, color: string, href: string }) => (
    <Link href={href} className="block rounded-2xl p-6 transition-all hover:scale-[1.02] active:scale-[0.98] group"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: color + '20' }}>{icon}</div>
            <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-white/40">{label}</p>
    </Link>
)

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(true)

    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch('/api/admin/stats')
            .then(r => {
                if (r.status === 403) {
                    setError('Access Denied. You do not have permission to view the admin dashboard.')
                    return null
                }
                return r.json()
            })
            .then(d => d && setStats(d))
            .catch(e => setError('Failed to load dashboard stats.'))
            .finally(() => setLoading(false))
    }, [])

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-white/40 mt-1">CampusNav — Chandigarh University</p>
            </div>

            {/* Stats grid */}
            {error ? (
                <div className="text-center py-20 rounded-3xl mb-8" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p className="text-5xl mb-4">🚫</p>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Access Denied</h3>
                    <p className="text-red-400/60">{error}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {loading ? (
                        Array(4).fill(null).map((_, i) => (
                            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        ))
                    ) : <>
                        <StatCard icon="📍" label="Approved Places" value={stats?.approvedPlaces ?? 0} color="#10b981" href="/admin/places" />
                        <StatCard icon="⏳" label="Pending Review" value={stats?.pendingPlaces ?? 0} color="#f59e0b" href="/admin/approvals" />
                        <StatCard icon="🏷️" label="Categories" value={stats?.categories ?? 0} color="#6366f1" href="/admin/categories" />
                        <StatCard icon="👥" label="Users" value={stats?.users ?? 0} color="#8b5cf6" href="/admin/users" />
                    </>}
                </div>
            )}

            {/* Quick actions */}
            <div className="mb-6">
                <h2 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { href: '/admin/approvals', label: 'Review Pending Places', icon: '✅', desc: 'Approve or reject submissions' },
                        { href: '/admin/categories', label: 'Manage Categories', icon: '🏷️', desc: 'Add or remove place categories' },
                        { href: '/admin/users', label: 'Manage Users', icon: '👥', desc: 'Change roles, view accounts' },
                    ].map(a => (
                        <Link key={a.href} href={a.href}
                            className="flex items-start gap-4 p-4 rounded-2xl transition-all hover:bg-white/8 group"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <span className="text-2xl mt-0.5">{a.icon}</span>
                            <div>
                                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{a.label}</p>
                                <p className="text-xs text-white/40 mt-0.5">{a.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Links to other pages */}
            <div className="flex gap-3">
                <Link href="/map"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-300 hover:text-indigo-200 transition-all"
                    style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    🗺️ View Map
                </Link>
                <Link href="/admin/manage-parking"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    🅿️ Parking Management
                </Link>
            </div>
        </div>
    )
}
