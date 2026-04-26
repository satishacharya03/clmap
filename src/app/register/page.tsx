'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
    const router = useRouter()
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        if (password !== confirmPassword) { setError('Passwords do not match'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters'); return }
        setIsLoading(true)
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || data.details?.[0] || 'Registration failed')
            router.push('/map')
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            {/* BG decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/map" className="inline-block transition-transform hover:scale-105 active:scale-95">
                        <img src="/logo.png" alt="De-tect Logo" className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover shadow-[0_8px_32px_rgba(99,102,241,0.4)] bg-white" />
                    </Link>
                    <h1 className="text-3xl font-bold text-white">De-tect</h1>
                    <p className="text-white/50 mt-1 text-sm">Join the campus community</p>
                </div>

                {/* Card */}
                <div className="rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>
                    <h2 className="text-xl font-bold text-white mb-6">Create your account</h2>

                    {error && (
                        <div className="mb-5 flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="Your full name"
                                className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                placeholder="you@campus.edu"
                                className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                placeholder="Min. 6 characters"
                                className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-sm mt-2"
                            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating account...
                                </span>
                            ) : 'Create Account →'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-white/50 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* After registering, go to login to get admin */}
                <div className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <span className="text-indigo-400 text-lg">💡</span>
                    <p className="text-indigo-300/70 text-xs leading-relaxed">
                        After registering, go to the <Link href="/login" className="text-indigo-400 underline">login page</Link> to set yourself as Admin if you're the first user.
                    </p>
                </div>

                <p className="text-center text-white/20 text-xs mt-5">Chandigarh University · Campus Navigation</p>
            </div>
        </div>
    )
}
