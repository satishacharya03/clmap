'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { authClient } from '@/lib/auth-client'

interface User {
    id: string
    name: string
    email: string
    role: string
    emailVerified?: boolean
}

export default function Header() {
    const pathname = usePathname()
    const [user, setUser] = useState<User | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetch('/api/auth/me', { cache: 'no-store' })
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setUser(d.user) })
            .finally(() => setIsLoading(false))
    }, [])

    // Close menu on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleLogout = async () => {
        await authClient.signOut().catch(() => null)
        await fetch('/api/auth/logout', { method: 'POST' })
        setUser(null)
        window.location.href = '/login'
    }

    const handleResendVerification = async () => {
        if (!user) return
        setResendStatus('loading')
        try {
            const res = await fetch('/api/auth/send-verification-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callbackURL: window.location.href }),
            })
            const data = await res.json().catch(() => null)
            if (!res.ok) throw new Error(data?.error || 'Failed to send verification link')
            setResendStatus('sent')
            setTimeout(() => setResendStatus('idle'), 5000)
            alert('Verification link sent. Please check your email inbox.')
        } catch (err) {
            console.error('Failed to resend:', err)
            setResendStatus('error')
            setTimeout(() => setResendStatus('idle'), 5000)
        }
    }

    const navItems = [
        { href: '/map', label: 'Map', icon: '🗺️' },
        { href: '/map?action=add-place', label: 'Add Place', icon: '➕' },
        { href: '/parking', label: 'Parking', icon: '🅿️' },
    ]

    const adminItems = [
        { href: '/admin/approvals', label: 'Approvals', icon: '✅' },
        { href: '/admin/manage-parking', label: 'Parking Mgmt', icon: '🚗' },
    ]

    const isMap = pathname === '/map'

    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
            style={{
                background: isMap ? 'transparent' : 'rgba(15,23,42,0.9)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderBottom: isMap ? 'none' : '1px solid rgba(255,255,255,0.08)',
            }}
        >
            {/* Unverified Banner */}
            {user && user.emailVerified === false && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs md:text-sm font-medium z-50 relative animate-fade-in flex items-center justify-center gap-2">
                    <span className="text-amber-200">Your email is unverified. Adding places and reviews is disabled.</span>
                    <button
                        onClick={handleResendVerification}
                        disabled={resendStatus === 'loading' || resendStatus === 'sent'}
                        className="ml-2 text-amber-400 hover:text-amber-300 underline disabled:opacity-50 disabled:no-underline whitespace-nowrap bg-amber-500/10 px-2 py-0.5 rounded-md hover:bg-amber-500/20 transition-colors"
                    >
                        {resendStatus === 'loading' ? 'Sending...' : resendStatus === 'sent' ? 'Link Sent ✓' : resendStatus === 'error' ? 'Failed ✕' : 'Resend Link'}
                    </button>
                </div>
            )}
            
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/map" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg overflow-hidden bg-white"
                            style={{ boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                            <img src="/logo.png" alt="De-tect Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">
                            De-tect
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    {!isMap && (
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const active = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                                        style={{
                                            color: active ? '#a5b4fc' : 'rgba(255,255,255,0.65)',
                                            background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                                            border: active ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                                        }}
                                    >
                                        <span>{item.icon}</span>
                                        {item.label}
                                    </Link>
                                )
                            })}

                            {user?.role === 'ADMIN' && (
                                <>
                                    <div className="w-px h-5 bg-white/10 mx-1" />
                                    {adminItems.map((item) => {
                                        const active = pathname === item.href
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                                                style={{
                                                    color: active ? '#fbbf24' : 'rgba(255,255,255,0.65)',
                                                    background: active ? 'rgba(251,191,36,0.12)' : 'transparent',
                                                    border: active ? '1px solid rgba(251,191,36,0.25)' : '1px solid transparent',
                                                }}
                                            >
                                                <span>{item.icon}</span>
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </>
                            )}
                        </nav>
                    )}

                    {/* User Menu */}
                    <div className="flex items-center gap-2">
                        {isLoading ? (
                            <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse" />
                        ) : user ? (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/8 transition-all group"
                                >
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden md:inline text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                                        {user.name.split(' ')[0]}
                                    </span>
                                    <svg className={`w-4 h-4 text-white/40 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {isMenuOpen && (
                                    <div
                                        className="absolute right-0 mt-2 w-52 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in"
                                        style={{ background: 'rgba(15,23,42,0.96)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}
                                    >
                                        <div className="px-4 py-3 border-b border-white/8">
                                            <p className="text-sm font-semibold text-white">{user.name}</p>
                                            <p className="text-xs text-white/40 mt-0.5 truncate">{user.email}</p>
                                            {user.role === 'ADMIN' && (
                                                <span className="inline-block mt-1.5 px-2 py-0.5 bg-amber-500/15 text-amber-400 text-xs font-semibold rounded-full border border-amber-500/20">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <Link href="/profile" onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">
                                                <span>👤</span> Profile
                                            </Link>
                                            <Link href="/map" onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">
                                                <span>🗺️</span> Map
                                            </Link>
                                            <Link href="/map?action=add-place" onClick={() => setIsMenuOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all">
                                                <span>➕</span> Add Place
                                            </Link>
                                        </div>
                                        <div className="p-2 border-t border-white/8">
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : null}

                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/8 transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMenuOpen
                                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile nav drawer */}
                {isMenuOpen && (
                    <div className="md:hidden border-t border-white/8 py-3 animate-slide-down" ref={menuRef}>
                        <nav className="flex flex-col gap-1">
                            {navItems.map(item => {
                                const active = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                                        style={{
                                            color: active ? '#a5b4fc' : 'rgba(255,255,255,0.65)',
                                            background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                                        }}
                                    >
                                        <span>{item.icon}</span> {item.label}
                                    </Link>
                                )
                            })}
                            {user?.role === 'ADMIN' && adminItems.map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/8 transition-all"
                                >
                                    <span>{item.icon}</span> {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    )
}
