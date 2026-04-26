'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp, signIn, emailOtp } from '@/lib/auth-client'

function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    )
}

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

export default function RegisterPage() {
    const router = useRouter()

    const [step, setStep] = useState<'register' | 'verify'>('register')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    // ── Step 1: Register ──────────────────────────────────────────────────────
    const handleRegister = async (e: FormEvent) => {
        e.preventDefault()
        setError(''); setInfo('')
        if (password !== confirmPassword) { setError('Passwords do not match'); return }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return }
        setIsLoading(true)
        try {
            const { error: authError } = await signUp.email({
                email,
                password,
                name,
                callbackURL: '/map',
            })
            if (authError) throw new Error(authError.message || 'Registration failed')
            
            // Registration succeeded — Better Auth sends a verification link automatically
            setInfo('Account created! A verification link has been sent to your email.')
            
            // Redirect to map immediately as requested
            setTimeout(() => {
                router.push('/map')
            }, 1000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed')
        } finally {
            setIsLoading(false)
        }
    }

    // ── Google sign-up ────────────────────────────────────────────────────────
    const handleGoogle = async () => {
        setError(''); setInfo('')
        setIsLoading(true)
        try {
            await signIn.social({ provider: 'google', callbackURL: '/map' })
        } catch {
            setError('Google sign-in failed.')
            setIsLoading(false)
        }
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}
        >
            <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)' }} />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15), transparent)' }} />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-8">
                    <Link href="/map" className="inline-block transition-transform hover:scale-105 active:scale-95">
                        <img src="/logo.png" alt="De-tect"
                            className="w-16 h-16 rounded-2xl mx-auto mb-4 object-cover bg-white"
                            style={{ boxShadow: '0 8px 32px rgba(99,102,241,0.4)' }} />
                    </Link>
                    <h1 className="text-3xl font-bold text-white tracking-tight">De-tect</h1>
                    <p className="text-white/40 mt-1 text-sm">Join the campus community</p>
                </div>

                <div className="rounded-3xl p-8"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(24px)' }}>

                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm">
                            <span className="mt-0.5">⚠️</span> {error}
                        </div>
                    )}
                    {info && (
                        <div className="mb-5 flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-indigo-300 text-sm">
                            <span className="mt-0.5">📧</span> {info}
                        </div>
                    )}

                    {/* ── Registration form ─────────────────────── */}
                    <h2 className="text-xl font-bold text-white mb-6">Create your account</h2>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <Field label="Full Name" type="text" value={name}
                            onChange={e => setName(e.target.value)} required
                            placeholder="Your full name" autoComplete="name" />
                        <Field label="Email" type="email" value={email}
                            onChange={e => setEmail(e.target.value)} required
                            placeholder="you@campus.edu" autoComplete="email" />
                        <Field label="Password" type="password" value={password}
                            onChange={e => setPassword(e.target.value)} required
                            placeholder="Min. 8 characters" autoComplete="new-password" />
                        <Field label="Confirm Password" type="password" value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)} required
                            placeholder="••••••••" autoComplete="new-password" />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }}
                        >
                            {isLoading ? <><Spinner /> Creating account...</> : 'Create Account →'}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="px-3 text-white/30">Or sign up with</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogle}
                        disabled={isLoading}
                        className="w-full py-3.5 text-white/80 font-medium rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-sm disabled:opacity-50"
                    >
                        <GoogleIcon />
                        Continue with Google
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-white/40 text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-white/20 text-xs mt-5">Chandigarh University · Campus Navigation</p>
            </div>
        </div>
    )
}
