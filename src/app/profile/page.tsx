'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

interface User {
    id: string
    name: string
    email: string
    role: string
}

export default function ProfilePage() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => {
                if (!res.ok) {
                    throw new Error('Not authenticated')
                }
                return res.json()
            })
            .then(data => {
                if (data.user) {
                    setUser(data.user)
                } else {
                    router.push('/login')
                }
            })
            .catch(() => {
                router.push('/login')
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [router])

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            <Header />
            
            <main className="max-w-4xl mx-auto px-4 pt-32 pb-16">
                <div className="mb-10">
                    <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
                    <p className="text-white/50 text-base">Manage your account and preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: User Card */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="rounded-3xl p-8 text-center relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                            <div className="absolute top-0 left-0 w-full h-24" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' }}></div>
                            
                            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 mt-6 border-4 border-slate-900 shadow-2xl"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                <span className="text-4xl font-bold text-white">{user.name.charAt(0).toUpperCase()}</span>
                            </div>
                            
                            <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
                            <p className="text-white/50 text-sm mb-4">{user.email}</p>
                            
                            <div className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-6"
                                style={{
                                    background: user.role === 'ADMIN' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)',
                                    color: user.role === 'ADMIN' ? '#fbbf24' : '#a5b4fc',
                                    border: user.role === 'ADMIN' ? '1px solid rgba(251,191,36,0.3)' : '1px solid rgba(99,102,241,0.3)'
                                }}>
                                {user.role}
                            </div>
                            
                            {user.role === 'ADMIN' && (
                                <Link href="/admin/approvals" 
                                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>
                                    <span>⚙️</span> Go to Admin Dashboard
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Features & Stats */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <span>✨</span> Features & Details
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link href="/map?action=add-place" className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group block">
                                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">➕</div>
                                    <h4 className="text-white font-semibold mb-1">Add New Place</h4>
                                    <p className="text-white/40 text-xs">Help map the campus by adding new locations.</p>
                                </Link>
                                
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">📍</div>
                                    <h4 className="text-white font-semibold mb-1">Recent Routes</h4>
                                    <p className="text-white/40 text-xs">View your navigation history.</p>
                                </div>
                                
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">📝</div>
                                    <h4 className="text-white font-semibold mb-1">My Reviews</h4>
                                    <p className="text-white/40 text-xs">Places you have rated on campus.</p>
                                </div>
                                
                                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                                    <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🔒</div>
                                    <h4 className="text-white font-semibold mb-1">Account Security</h4>
                                    <p className="text-white/40 text-xs">Update your password or settings.</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                            <h3 className="text-xl font-bold text-white mb-4">Account Information</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-white/10">
                                    <span className="text-white/50 text-sm">Full Name</span>
                                    <span className="text-white font-medium">{user.name}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-white/10">
                                    <span className="text-white/50 text-sm">Email Address</span>
                                    <span className="text-white font-medium">{user.email}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-white/10">
                                    <span className="text-white/50 text-sm">Member Since</span>
                                    <span className="text-white font-medium">May 2026</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
