'use client'

import { useState, FormEvent, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn, emailOtp, authClient } from '@/lib/auth-client'

// ─── Google Icon ─────────────────────────────────────────────────────────────
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

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                {label}
            </label>
            <input
                {...props}
                className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
            />
        </div>
    )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const redirectTo = searchParams.get('redirect') || '/map'

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // ── Email / Password login ──────────────────────────────────────────────
    const handleEmailLogin = async (e: FormEvent) => {
        e.preventDefault()
        setError(''); setInfo('')
        setIsLoading(true)
        try {
            const { error: authError } = await signIn.email({
                email,
                password,
                callbackURL: redirectTo,
            })
            if (authError) {
                throw new Error(authError.message || 'Invalid email or password')
            }
            router.push(redirectTo)
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setIsLoading(false)
        }
    }

    // ── Google OAuth ────────────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        setError(''); setInfo('')
        setIsLoading(true)
        try {
            await signIn.social({
                provider: 'google',
                callbackURL: redirectTo,
            })
        } catch {
            setError('Google sign-in failed. Please try again.')
            setIsLoading(false)
        }
    }

    // ── Email OTP verification ──────────────────────────────────────────────
    const handleVerifyOtp = async (e: FormEvent) => {
        e.preventDefault()
        setError(''); setInfo('')
        setIsLoading(true)
        try {
            // Better Auth verifyEmail handles the OTP code verification
            const { error: authError } = await emailOtp.verifyEmail({
                email,
                otp,
            })
            if (authError) throw new Error(authError.message || 'Invalid or expired code')
            
            setInfo('Email verified! You can now sign in.')
            setTab('login')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Verification failed')
        } finally {
            setIsLoading(false)
        }
    }

    // ── Resend verification email ────────────────────────────────────────────
    const handleResendVerification = async () => {
        if (!email) { setError('Please enter your email first.'); return }
        setError(''); setInfo('')
        setIsLoading(true)
        try {
            const { error } = await emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
            if (error) throw error;
            setInfo('A new verification code has been sent to your email.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend code. Try again later.');
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
        >
            {/* Ambient glows */}
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)' }} />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)' }} />

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/map" className="inline-block transition-transform hover:scale-105 active:scale-95">
                        <img src="/logo.png" alt="De-tect"
                            className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover bg-white"
                            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }} />
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight">De-tect</h1>
                    <p className="text-white/40 mt-1 text-sm">Chandigarh University · Smart Map</p>
                </div>

                {/* Card */}
                <div className="rounded-3xl p-8"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)' }}>

                    {/* Error / Info banners */}
                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm">
                            <span className="mt-0.5 text-base">⚠️</span> {error}
                        </div>
                    )}
                    {info && (
                        <div className="mb-5 flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-indigo-300 text-sm">
                            <span className="mt-0.5 text-base">📧</span> {info}
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
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            autoComplete="current-password"
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

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-3 text-white/30" style={{ background: 'transparent' }}>Or continue with</span>
                        </div>
                    </div>

                    {/* Google */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        id="google-signin-btn"
                        className="w-full py-3.5 text-white/80 font-medium rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                    >
                        <GoogleIcon />
                        Continue with Google
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
