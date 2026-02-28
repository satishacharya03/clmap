import Link from 'next/link'
import { headers } from 'next/headers'

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { href: '/admin/approvals', label: 'Approvals', icon: '✅' },
    { href: '/admin/places', label: 'All Places', icon: '📍' },
    { href: '/admin/categories', label: 'Categories', icon: '🏷️' },
    { href: '/admin/users', label: 'Users', icon: '👥' },
    { href: '/admin/parking', label: 'Parking', icon: '🅿️' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-60 z-40 flex flex-col"
                style={{ background: 'rgba(15,23,42,0.96)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/5">
                    <Link href="/map" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}>
                            🏫
                        </div>
                        <div>
                            <p className="font-bold text-sm text-white leading-tight group-hover:text-indigo-300 transition-colors">CampusNav</p>
                            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Admin Panel</p>
                        </div>
                    </Link>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {navItems.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/6 transition-all group"
                        >
                            <span className="text-base">{item.icon}</span>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-4 py-4 border-t border-white/5 space-y-2">
                    <Link href="/map"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/6 transition-all">
                        <span>🗺️</span> View Map
                    </Link>
                    <Link href="/api/auth/logout"
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400/70 hover:text-red-300 hover:bg-red-500/8 transition-all">
                        <span>🚪</span> Sign Out
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <main className="pl-60 min-h-screen">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
