'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

interface User {
    id: string
    name: string
    email: string
    role: string
}

export default function Header() {
    const pathname = usePathname()
    const [user, setUser] = useState<User | null>(null)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check for user session
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me')
                if (res.ok) {
                    const data = await res.json()
                    setUser(data.user)
                }
            } catch {
                // Not logged in
            } finally {
                setIsLoading(false)
            }
        }
        checkAuth()
    }, [])

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            setUser(null)
            window.location.href = '/login'
        } catch {
            // Handle error
        }
    }

    const navItems = [
        { href: '/map', label: 'Map', icon: '🗺️' },
        { href: '/parking', label: 'Parking', icon: '🅿️' },
        { href: '/add-place', label: 'Add Place', icon: '➕' },
    ]

    const adminItems = [
        { href: '/admin/approvals', label: 'Approvals', icon: '✅' },
        { href: '/admin/manage-parking', label: 'Manage Parking', icon: '🚗' },
    ]

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/map" className="flex items-center gap-2">
                        <span className="text-2xl">🏫</span>
                        <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            CampusNav
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${pathname === item.href
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <span className="mr-1">{item.icon}</span>
                                {item.label}
                            </Link>
                        ))}

                        {user?.role === 'ADMIN' && (
                            <>
                                <div className="w-px h-6 bg-gray-300 mx-2" />
                                {adminItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${pathname === item.href
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <span className="mr-1">{item.icon}</span>
                                        {item.label}
                                    </Link>
                                ))}
                            </>
                        )}
                    </nav>

                    {/* User Menu / Auth Buttons */}
                    <div className="flex items-center gap-2">
                        {isLoading ? (
                            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                        ) : user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden md:inline text-sm font-medium text-gray-700">
                                        {user.name}
                                    </span>
                                </button>

                                {isMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </div>
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <Link
                                    href="/login"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full hover:opacity-90 transition-opacity"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )}

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden py-4 border-t border-gray-200">
                        <nav className="flex flex-col gap-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${pathname === item.href
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="mr-2">{item.icon}</span>
                                    {item.label}
                                </Link>
                            ))}

                            {user?.role === 'ADMIN' && (
                                <>
                                    <div className="h-px bg-gray-200 my-2" />
                                    <p className="px-4 py-1 text-xs text-gray-400 uppercase font-medium">Admin</p>
                                    {adminItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsMenuOpen(false)}
                                            className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${pathname === item.href
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span className="mr-2">{item.icon}</span>
                                            {item.label}
                                        </Link>
                                    ))}
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    )
}
