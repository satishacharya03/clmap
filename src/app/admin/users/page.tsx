'use client'

import { useState, useEffect } from 'react'

interface User { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; createdAt: string }

export default function UsersAdminPage() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)
    const [search, setSearch] = useState('')

    useEffect(() => {
        fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.users || [])).finally(() => setLoading(false))
    }, [])

    const changeRole = async (userId: string, role: 'USER' | 'ADMIN') => {
        if (!confirm(`Change this user's role to ${role}?`)) return
        setProcessing(userId)
        const res = await fetch('/api/admin/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
        const data = await res.json()
        if (res.ok) setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x))
        setProcessing(null)
    }

    const filtered = users.filter(u =>
        !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Users</h1>
                    <p className="text-white/40 text-sm mt-1">{users.length} registered accounts</p>
                </div>
            </div>

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
                className="w-full mb-5 px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-indigo-500/50"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

            {loading ? (
                <div className="space-y-2">{Array(5).fill(null).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
            ) : (
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                    {filtered.map((user, i) => (
                        <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/4 transition-all"
                            style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                                style={{ background: user.role === 'ADMIN' ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                {user.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                                    {user.role === 'ADMIN' && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                            style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                                            ADMIN
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-white/30 mt-0.5 truncate">{user.email}</p>
                            </div>
                            <p className="text-xs text-white/25 flex-shrink-0 hidden sm:block">{new Date(user.createdAt).toLocaleDateString()}</p>
                            <div className="flex gap-2 flex-shrink-0">
                                {user.role !== 'ADMIN' ? (
                                    <button onClick={() => changeRole(user.id, 'ADMIN')} disabled={processing === user.id}
                                        className="px-3 py-1.5 text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                                        style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>
                                        {processing === user.id ? '...' : '👑 Make Admin'}
                                    </button>
                                ) : (
                                    <button onClick={() => changeRole(user.id, 'USER')} disabled={processing === user.id}
                                        className="px-3 py-1.5 text-xs font-bold text-white/40 hover:text-white/70 rounded-xl transition-all disabled:opacity-50"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        {processing === user.id ? '...' : 'Demote'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
