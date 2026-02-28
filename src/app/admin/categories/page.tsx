'use client'

import { useState, useEffect, FormEvent } from 'react'

interface Category { id: string; categoryName: string; icon?: string; placeCount?: number }

const COMMON_EMOJIS = ['📍', '🏫', '📚', '🍕', '☕', '🏋️', '🅿️', '🏥', '🚻', '💊', '🎭', '🖥️', '🔬', '⚗️', '🎨', '🏊', '⚽', '🛒', '🏦', '📬', '🏛️', '⚡', '🔧', '🎤', '🌱']

export default function CategoriesAdminPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [name, setName] = useState('')
    const [icon, setIcon] = useState('📍')
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const load = () => {
        fetch('/api/categories')
            .then(r => {
                if (r.status === 403) {
                    setError('Access Denied. You do not have permission to manage categories.')
                    return null
                }
                return r.json()
            })
            .then(d => d && setCategories(d.categories || []))
            .catch(() => setError('Failed to load categories.'))
            .finally(() => setLoading(false))
    }
    useEffect(() => { load() }, [])

    const createCat = async (e: FormEvent) => {
        e.preventDefault(); setError(''); setCreating(true)
        try {
            const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryName: name, icon }) })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed')
            setCategories(p => [...p, data.category])
            setName(''); setIcon('📍'); setShowAdd(false)
        } catch (err) { setError(err instanceof Error ? err.message : 'Failed') }
        finally { setCreating(false) }
    }

    const deleteCat = async (id: string) => {
        setDeletingId(id)
        const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
        const data = await res.json()
        if (!res.ok) { alert(data.error); setDeletingId(null); return }
        setCategories(p => p.filter(c => c.id !== id))
        setDeletingId(null)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Categories</h1>
                    <p className="text-white/40 text-sm mt-1">{categories.length} categories</p>
                </div>
                <button onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-2xl transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}>
                    + New Category
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h3 className="font-bold text-indigo-300 mb-4">Create New Category</h3>
                    {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                    <form onSubmit={createCat} className="space-y-4">
                        <input value={name} onChange={e => setName(e.target.value)} required placeholder="Category name"
                            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:ring-1 focus:ring-indigo-500"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div>
                            <p className="text-xs text-indigo-400 mb-2">Icon: <span className="text-lg">{icon}</span></p>
                            <div className="flex flex-wrap gap-2">
                                {COMMON_EMOJIS.map(e => (
                                    <button type="button" key={e} onClick={() => setIcon(e)}
                                        className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                                        style={{ background: icon === e ? '#6366f1' : 'rgba(255,255,255,0.06)', border: `2px solid ${icon === e ? '#6366f1' : 'rgba(255,255,255,0.1)'}`, transform: icon === e ? 'scale(1.1)' : 'scale(1)' }}>
                                        {e}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" disabled={creating}
                                className="px-6 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                {creating ? 'Creating...' : 'Create'}
                            </button>
                            <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2.5 text-sm font-medium text-white/50 hover:text-white rounded-xl hover:bg-white/8 transition-all">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Category grid */}
            {error && !categories.length ? (
                <div className="text-center py-20 rounded-3xl" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <p className="text-5xl mb-4">🚫</p>
                    <h3 className="text-xl font-bold text-red-400 mb-2">Access Denied</h3>
                    <p className="text-red-400/60">{error}</p>
                </div>
            ) : loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{Array(6).fill(null).map((_, i) => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />)}</div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categories.map(cat => (
                        <div key={cat.id} className="relative rounded-2xl p-4 group"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl">{cat.icon || '📍'}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white truncate">{cat.categoryName}</p>
                                    <p className="text-xs text-white/30">{cat.placeCount || 0} places</p>
                                </div>
                            </div>
                            <button onClick={() => deleteCat(cat.id)} disabled={deletingId === cat.id}
                                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10 disabled:opacity-30"
                                title="Delete category">
                                {deletingId === cat.id ? '...' : '🗑'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
