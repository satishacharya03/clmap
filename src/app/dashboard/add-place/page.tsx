'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Category {
    id: string
    categoryName: string
    icon?: string
}

interface Block {
    id: string
    name: string
}

const COMMON_EMOJIS = ['📍', '🏫', '📚', '🍕', '☕', '🏋️', '🅿️', '🏥', '🚻', '💊',
    '🎭', '🖥️', '🔬', '⚗️', '🎨', '🏊', '⚽', '🛒', '🏦', '📬']

export default function AddPlacePage() {
    const router = useRouter()
    const [categories, setCategories] = useState<Category[]>([])
    const [blocks, setBlocks] = useState<Block[]>([])

    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [categoryId, setCategoryId] = useState('')
    const [blockId, setBlockId] = useState('')
    const [latitude, setLatitude] = useState('')
    const [longitude, setLongitude] = useState('')

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // New category inline
    const [showNewCat, setShowNewCat] = useState(false)
    const [newCatName, setNewCatName] = useState('')
    const [newCatIcon, setNewCatIcon] = useState('📍')
    const [creatingCat, setCreatingCat] = useState(false)
    const [catError, setCatError] = useState('')

    useEffect(() => {
        Promise.all([fetch('/api/categories'), fetch('/api/blocks')]).then(async ([c, b]) => {
            const cd = await c.json()
            setCategories(cd.categories || [])
            if (b.ok) {
                const bd = await b.json()
                setBlocks(bd.blocks || [])
            }
        })
    }, [])

    const getCurrentLocation = () => {
        if (!navigator.geolocation) return
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setLatitude(coords.latitude.toString())
                setLongitude(coords.longitude.toString())
            },
            (err) => alert('Could not get location: ' + err.message)
        )
    }

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return
        setCreatingCat(true); setCatError('')
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: newCatName.trim(), icon: newCatIcon })
            })
            const data = await res.json()
            if (!res.ok) { setCatError(data.error || 'Failed'); return }
            setCategories(prev => [...prev, data.category])
            setCategoryId(data.category.id)
            setShowNewCat(false); setNewCatName(''); setNewCatIcon('📍')
        } catch { setCatError('Network error') }
        finally { setCreatingCat(false) }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(''); setIsLoading(true)
        try {
            const res = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name, description, categoryId,
                    blockId: blockId || undefined,
                    latitude: latitude ? parseFloat(latitude) : undefined,
                    longitude: longitude ? parseFloat(longitude) : undefined
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || data.details?.[0] || 'Failed')
            setSuccess(true)
            setTimeout(() => router.push('/map'), 2500)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)' }}>
                <div className="text-center px-8">
                    <div className="w-24 h-24 rounded-3xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
                        <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Place Submitted!</h1>
                    <p className="text-white/60 text-base mb-6">Your place is pending admin review. You'll be redirected to the map shortly.</p>
                    <Link href="/map" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold transition-all">
                        Back to Map
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 backdrop-blur-xl border-b border-white/10" style={{ background: 'rgba(15,23,42,0.85)' }}>
                <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/map" className="w-9 h-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="font-bold text-white text-sm leading-tight">Add New Place</h1>
                            <p className="text-white/40 text-xs">Campus Navigator</p>
                        </div>
                    </div>
                    <span className="text-2xl">📍</span>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm mb-6">
                    <div className="px-6 pt-6 pb-4 border-b border-white/10">
                        <h2 className="font-bold text-white text-xl">Place Details</h2>
                        <p className="text-white/50 text-sm mt-1">Your submission will be reviewed before appearing on the map.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
                        {error && (
                            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm">
                                <span className="text-lg">⚠️</span> {error}
                            </div>
                        )}

                        {/* Name */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Place Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="e.g. UIET Main Lab"
                                className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm font-medium transition-all"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                rows={3}
                                placeholder="Brief description of this place..."
                                className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all resize-none"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Category *</label>
                            {!showNewCat ? (
                                <select
                                    value={categoryId}
                                    onChange={e => { if (e.target.value === '__new__') { setShowNewCat(true); return } setCategoryId(e.target.value) }}
                                    required
                                    className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                                >
                                    <option value="" className="bg-gray-900">Select category...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.icon} {cat.categoryName}</option>
                                    ))}
                                    <option value="__new__" className="bg-gray-900">✨ Create new category...</option>
                                </select>
                            ) : (
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold text-indigo-300 text-sm">✨ New Category</p>
                                        <button type="button" onClick={() => setShowNewCat(false)} className="text-indigo-400 hover:text-indigo-200 text-xs transition-colors">Cancel</button>
                                    </div>
                                    {catError && <p className="text-red-400 text-xs">{catError}</p>}
                                    <input
                                        type="text"
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                        placeholder="Category name"
                                        className="w-full px-4 py-3 rounded-xl border border-indigo-500/20 bg-white/5 text-white placeholder-white/30 outline-none text-sm focus:ring-2 focus:ring-indigo-500/30"
                                    />
                                    <div>
                                        <p className="text-xs text-indigo-400 mb-2">Choose icon:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {COMMON_EMOJIS.map(emoji => (
                                                <button
                                                    type="button"
                                                    key={emoji}
                                                    onClick={() => setNewCatIcon(emoji)}
                                                    className="w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all"
                                                    style={{
                                                        background: newCatIcon === emoji ? '#6366f1' : 'rgba(255,255,255,0.05)',
                                                        border: `2px solid ${newCatIcon === emoji ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                                        transform: newCatIcon === emoji ? 'scale(1.12)' : 'scale(1)'
                                                    }}
                                                >
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={!newCatName.trim() || creatingCat}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                                    >
                                        {creatingCat ? 'Creating...' : 'Create Category'}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Block */}
                        {blocks.length > 0 && (
                            <div>
                                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                    Building / Block <span className="normal-case font-normal text-white/30">(optional)</span>
                                </label>
                                <select
                                    value={blockId}
                                    onChange={e => setBlockId(e.target.value)}
                                    className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                                >
                                    <option value="" className="bg-gray-900">No specific building</option>
                                    {blocks.map(b => (
                                        <option key={b.id} value={b.id} className="bg-gray-900">{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Location */}
                        <div>
                            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Location</label>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <input
                                    type="number" step="any" value={latitude}
                                    onChange={e => setLatitude(e.target.value)}
                                    placeholder="Latitude"
                                    className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                                />
                                <input
                                    type="number" step="any" value={longitude}
                                    onChange={e => setLongitude(e.target.value)}
                                    placeholder="Longitude"
                                    className="w-full px-4 py-3.5 rounded-2xl border border-white/10 bg-white/5 text-white placeholder-white/25 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 outline-none text-sm transition-all"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={getCurrentLocation}
                                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 rounded-2xl transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Use My Current Location
                            </button>
                        </div>

                        {/* Tip about pin-drop */}
                        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl px-4 py-3.5">
                            <span className="text-blue-400 text-lg mt-0.5">💡</span>
                            <div>
                                <p className="text-blue-300 text-sm font-medium">Pro tip</p>
                                <p className="text-blue-300/60 text-xs mt-0.5">
                                    For precise location, use the <Link href="/map" className="underline underline-offset-2 hover:text-blue-200">map's pin-drop tool</Link> instead — just tap the + button on the map.
                                </p>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-sm"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
                            }}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Submitting...
                                </span>
                            ) : 'Submit Place for Review ✓'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
