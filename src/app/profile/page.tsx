'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/lib/useTheme'

interface User { id: string; name: string; email: string; role: string }

export default function ProfilePage() {
    const router = useRouter()
    const { toggleTheme, isDark, mounted } = useTheme()
    const [user, setUser] = useState<User | null>(null)
    const [stats, setStats] = useState<{ places: number; reviews: number } | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => { if (!r.ok) throw new Error(); return r.json() })
            .then(d => {
                if (d.user) {
                    setUser(d.user)
                    fetch('/api/auth/stats').then(r => r.ok ? r.json() : null).then(d => d?.stats && setStats(d.stats))
                } else router.push('/login')
            })
            .catch(() => router.push('/login'))
            .finally(() => setIsLoading(false))
    }, [router])

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    if (isLoading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cn-bg)' }}>
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )
    if (!user) return null

    return (
        <div className="min-h-screen" style={{ background: 'var(--cn-bg)', color: 'var(--cn-text-1)', transition: 'background 0.3s, color 0.3s' }}>

            {/* ── STICKY NAV ── */}
            <nav className="sticky top-0 z-50 backdrop-blur-md" style={{ background: 'var(--cn-nav-bg)', borderBottom: '1px solid var(--cn-nav-border)', boxShadow: 'var(--cn-nav-shadow)' }}>
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
                    <Link href="/map" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>🗺️</div>
                        <span className="font-bold text-sm" style={{ color: 'var(--cn-text-1)' }}>CampusNav</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        {/* Theme toggle */}
                        {mounted && (
                            <button onClick={toggleTheme} title="Toggle theme"
                                className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-all hover:scale-110 active:scale-95"
                                style={{ background: 'var(--cn-toggle-bg)' }}>
                                {isDark ? '☀️' : '🌙'}
                            </button>
                        )}
                        <Link href="/map" className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold transition-all hover:opacity-80" style={{ background: 'var(--cn-toggle-bg)', color: 'var(--cn-text-2)' }}>
                            🗺️ Map
                        </Link>
                        <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-red-500 transition-all hover:opacity-80" style={{ background: 'rgba(239,68,68,0.08)' }}>
                            🚪 <span className="hidden sm:inline">Sign Out</span>
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-16">
                <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--cn-text-1)' }}>My Profile</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--cn-text-3)' }}>Manage your account and preferences</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">

                    {/* ── LEFT COLUMN ── */}
                    <div className="md:col-span-4 flex flex-col gap-5">

                        {/* User Card */}
                        <div className="rounded-2xl overflow-hidden flex-1" style={{ background: 'var(--cn-surface)', border: '1px solid var(--cn-border)' }}>
                            <div className="h-20 sm:h-24 w-full" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
                            <div className="px-5 pb-6 text-center -mt-10">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl border-4 mb-3 shadow-lg" style={{ borderColor: 'var(--cn-bg)', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                    <span className="text-3xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <h2 className="text-lg font-bold mb-0.5" style={{ color: 'var(--cn-text-1)' }}>{user.name}</h2>
                                <p className="text-sm mb-3" style={{ color: 'var(--cn-text-3)' }}>{user.email}</p>
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4"
                                    style={{ background: user.role === 'ADMIN' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)', color: user.role === 'ADMIN' ? '#f59e0b' : '#6366f1', border: user.role === 'ADMIN' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(99,102,241,0.25)' }}>
                                    {user.role}
                                </span>
                                {user.role === 'ADMIN' && (
                                    <Link href="/admin" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90"
                                        style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 14px rgba(245,158,11,0.25)' }}>
                                        ⚙️ Admin Dashboard
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Places Added', value: stats?.places ?? 0, color: '#6366f1' },
                                { label: 'Reviews', value: stats?.reviews ?? 0, color: '#8b5cf6' },
                            ].map(s => (
                                <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background: 'var(--cn-surface)', border: '1px solid var(--cn-border)' }}>
                                    <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: s.color }}>{s.value}</p>
                                    <p className="text-xs mt-1" style={{ color: 'var(--cn-text-3)' }}>{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── RIGHT COLUMN ── */}
                    <div className="md:col-span-8 flex flex-col gap-5">

                        {/* Quick Actions */}
                        <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--cn-surface)', border: '1px solid var(--cn-border)' }}>
                            <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--cn-text-1)' }}>✨ Quick Actions</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                                {[
                                    { href: '/map?action=add-place', emoji: '➕', label: 'Add New Place', desc: 'Help map the campus', color: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' },
                                    { href: '/about#feedback', emoji: '💬', label: 'Give Feedback', desc: 'Help us improve', color: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
                                    { href: '/map', emoji: '🗺️', label: 'Explore Map', desc: 'Find places on campus', color: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                                    { href: '/admin', emoji: '⚙️', label: 'Admin Panel', desc: 'Manage campus data', color: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', adminOnly: true },
                                ].filter(a => !a.adminOnly || user.role === 'ADMIN').map(a => (
                                    <Link key={a.href} href={a.href}
                                        className="p-4 sm:p-5 rounded-2xl block transition-all hover:-translate-y-0.5 hover:shadow-md group"
                                        style={{ background: a.color, border: `1px solid ${a.border}` }}>
                                        <div className="text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">{a.emoji}</div>
                                        <p className="font-semibold text-sm mb-0.5" style={{ color: 'var(--cn-text-1)' }}>{a.label}</p>
                                        <p className="text-xs" style={{ color: 'var(--cn-text-3)' }}>{a.desc}</p>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Account Info */}
                        <div className="rounded-2xl p-5 sm:p-6 flex-1" style={{ background: 'var(--cn-surface)', border: '1px solid var(--cn-border)' }}>
                            <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--cn-text-1)' }}>Account Information</h3>
                            <div className="divide-y" style={{ borderColor: 'var(--cn-border-soft)' }}>
                                {[
                                    { label: 'Full Name', value: user.name },
                                    { label: 'Email Address', value: user.email },
                                    { label: 'Role', value: user.role },
                                ].map(row => (
                                    <div key={row.label} className="flex justify-between items-center py-3.5">
                                        <span className="text-sm" style={{ color: 'var(--cn-text-3)' }}>{row.label}</span>
                                        <span className="text-sm font-medium" style={{ color: 'var(--cn-text-1)' }}>{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Appearance */}
                        <div className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--cn-surface)', border: '1px solid var(--cn-border)' }}>
                            <h3 className="font-bold text-sm mb-4" style={{ color: 'var(--cn-text-1)' }}>🎨 Appearance</h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm" style={{ color: 'var(--cn-text-1)' }}>{isDark ? 'Dark Mode' : 'Light Mode'}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'var(--cn-text-3)' }}>Click to switch theme</p>
                                </div>
                                {mounted && (
                                    <button onClick={toggleTheme}
                                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
                                        style={{ background: isDark ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.08)', color: isDark ? '#fbbf24' : '#6366f1', border: isDark ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(99,102,241,0.2)' }}>
                                        <span>{isDark ? '☀️' : '🌙'}</span>
                                        <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
