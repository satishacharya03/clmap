'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

function GoogleIcon() {
    return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    )
}

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

function Field({ label, onTogglePassword, showPassword, ...props }: { label: string; onTogglePassword?: () => void; showPassword?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                {label}
            </label>
            <div className="relative">
                <input
                    {...props}
                    className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                />
                {onTogglePassword && (
                    <button
                        type="button"
                        onClick={onTogglePassword}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
                    >
                        {showPassword ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.478 0-8.268-2.943-9.542-7z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.05 10.05 0 015.5-5.5m7.458-1.5A10.05 10.05 0 0112 5c4.478 0 8.268 2.943 9.542 7-.306.974-.75 1.88-1.3 2.675m-7.2-2.675v.01M3 3l18 18" />
                            </svg>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/map'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // ── Email/Password via Neon Auth ──────────────────────────────────────────
    const handleEmailLogin = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)
        try {
            const { error: authError } = await authClient.signIn.email({
                email,
                password,
                callbackURL: redirectTo,
            })
            if (authError) throw new Error(authError.message || 'Invalid email or password')
            router.push(redirectTo)
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setIsLoading(false)
        }
    }

    // ── Google via Neon Auth ──────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setError('')
        setIsLoading(true)
        try {
            await authClient.signIn.social({
                provider: 'google',
                callbackURL: redirectTo,
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.')
            setIsLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
        >
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)' }} />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)' }} />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/map" className="inline-block transition-transform hover:scale-105 active:scale-95">
                        <img src="/logo.png" alt="De-tect"
                            className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover bg-white"
                            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }} />
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight">De-tect</h1>
                    <p className="text-white/40 mt-1 text-sm">Chandigarh University · Smart Map</p>
                </div>

                <div className="rounded-3xl p-8"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)' }}>

                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm">
                            <span className="mt-0.5 text-base">⚠️</span> {error}
                        </div>
                    )}

                    <h2 className="text-xl font-bold text-white mb-6">Sign in to your account</h2>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <Field
                            label="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="you@campus.edu"
                            autoComplete="email"
                        />
                        <Field
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            autoComplete="current-password"
                            showPassword={showPassword}
                            onTogglePassword={() => setShowPassword(!showPassword)}
                        />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
                        >
                            {isLoading ? <><Spinner /> Signing in...</> : 'Sign In →'}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-3 text-white/30" style={{ background: 'transparent' }}>Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        type="button"
                        disabled={isLoading}
                        id="google-signin-btn"
                        className="w-full py-3.5 text-white/80 font-medium rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                    >
                        <GoogleIcon />
                        {isLoading ? <><Spinner /> Connecting...</> : 'Continue with Google'}
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-white/40 text-sm">
                            No account?{' '}
                            <Link href="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                                Create one free
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-white/20 text-xs mt-5">
                    Chandigarh University Campus Navigation System
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginForm />
        </Suspense>
    )
}
