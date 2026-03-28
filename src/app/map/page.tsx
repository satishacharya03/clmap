'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Place, Category } from '@/components/MapLibreCampusMap'
import ImageUpload from '@/components/ImageUpload'

const MapLibreCampusMap = dynamic(() => import('@/components/MapLibreCampusMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
            <div className="text-center">
                <div className="relative mx-auto mb-5 w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-500/30 animate-ping" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-indigo-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    <div className="absolute inset-2 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <span className="text-xl">🗺️</span>
                    </div>
                </div>
                <p className="text-indigo-300 font-semibold text-base">Loading 3D Campus Map</p>
                <p className="text-indigo-500/60 text-xs mt-1">Chandigarh University</p>
            </div>
        </div>
    )
})

// Category color palette (synced with MapLibre component)
const CAT_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
    '#a855f7', '#eab308', '#22c55e', '#3b82f6', '#fb923c',
]

const COMMON_EMOJIS = ['📍', '🏫', '📚', '🍕', '☕', '🏋️', '🅿️', '🏥', '🚻', '💊',
    '🎭', '🖥️', '🔬', '⚗️', '🎨', '🏊', '⚽', '🛒', '🏦', '📬']

export default function MapPage() {
    const [places, setPlaces] = useState<Place[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [searchResults, setSearchResults] = useState<Place[]>([])
    const [showSearchResults, setShowSearchResults] = useState(false)
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
    const [flyToPlace, setFlyToPlace] = useState<Place | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null)
    const router = useRouter()

    // Add place state
    const [addMode, setAddMode] = useState<'idle' | 'pin-drop' | 'form'>('idle')
    const [pinnedCoords, setPinnedCoords] = useState<{ lat: number; lng: number } | null>(null)
    const [addForm, setAddForm] = useState({ name: '', description: '', categoryId: '', blockId: '', photo: '' as string | null })
    const [blocks, setBlocks] = useState<{ id: string; name: string }[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitSuccess, setSubmitSuccess] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [navigateToPlace, setNavigateToPlace] = useState<Place | null>(null)

    // New category state
    const [showNewCat, setShowNewCat] = useState(false)
    const [newCatName, setNewCatName] = useState('')
    const [newCatIcon, setNewCatIcon] = useState('📍')
    const [creatingCat, setCreatingCat] = useState(false)
    const [catError, setCatError] = useState('')

    // Review & Photo addition state
    const [reviewingPlaceId, setReviewingPlaceId] = useState<string | null>(null)
    const [reviewRating, setReviewRating] = useState(5)
    const [reviewComment, setReviewComment] = useState('')
    const [isSubmittingReview, setIsSubmittingReview] = useState(false)
    
    const [addingPhotoPlaceId, setAddingPhotoPlaceId] = useState<string | null>(null)
    const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null)
    const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false)

    const catColorMap = useRef<Map<string, string>>(new Map())
    const searchTimeout = useRef<NodeJS.Timeout | null>(null)

    const getColor = (catId: string) => {
        if (!catColorMap.current.has(catId)) {
            const idx = catColorMap.current.size % CAT_COLORS.length
            catColorMap.current.set(catId, CAT_COLORS[idx])
        }
        return catColorMap.current.get(catId)!
    }

    // Initial load
    useEffect(() => {
        const load = async () => {
            try {
                // Fetch independently to prevent auth fail from breaking places
                const [placesRes, catRes, blocksRes, meRes] = await Promise.allSettled([
                    fetch('/api/places').then(r => r.json()),
                    fetch('/api/categories').then(r => r.json()),
                    fetch('/api/blocks').then(r => r.ok ? r.json() : { blocks: [] }),
                    fetch('/api/auth/me').then(r => r.ok ? r.json() : { user: null })
                ])

                if (placesRes.status === 'fulfilled') setPlaces(placesRes.value.places || [])
                if (catRes.status === 'fulfilled') setCategories(catRes.value.categories || [])
                if (blocksRes.status === 'fulfilled') setBlocks(blocksRes.value.blocks || [])
                if (meRes.status === 'fulfilled') setCurrentUser(meRes.value.user || null)

            } catch (e) {
                console.error(e)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    // Live search
    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current)
        if (!searchInput.trim()) {
            setSearchResults([])
            setShowSearchResults(false)
            setSearchQuery('')
            return
        }
        searchTimeout.current = setTimeout(() => {
            const q = searchInput.toLowerCase()
            const results = places.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.category?.categoryName.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            ).slice(0, 6)
            setSearchResults(results)
            setShowSearchResults(true)
        }, 200)
        return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
    }, [searchInput, places])

    const toggleCategory = (id: string) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    const handlePlaceClick = async (place: Place) => {
        // Optimistically set the base place
        setSelectedPlace(place)
        setFlyToPlace(place)
        setShowSearchResults(false)

        // Fetch deep relations (photos, reviews) asynchronously
        try {
            const res = await fetch(`/api/places/${place.id}`)
            if (res.ok) {
                const data = await res.json()
                setSelectedPlace(data.place)
            }
        } catch (e) {
            console.error('Failed to fetch detailed place data', e)
        }
    }

    const handleSearchSelect = (place: Place) => {
        setSearchInput(place.name)
        setShowSearchResults(false)
        handlePlaceClick(place)
    }

    const enterPinDrop = () => {
        if (!currentUser) {
            router.push('/login?redirect=/map')
            return
        }
        setAddMode('pin-drop')
        setSelectedPlace(null)
        setPinnedCoords(null)
        setAddForm({ name: '', description: '', categoryId: '', blockId: '', photo: null })
        setSubmitSuccess(false)
        setSubmitError('')
    }

    const handleMapClick = useCallback((lat: number, lng: number) => {
        if (addMode !== 'pin-drop') return
        setPinnedCoords({ lat, lng })
        setAddMode('form')
    }, [addMode])

    const cancelAdd = () => {
        setAddMode('idle')
        setPinnedCoords(null)
        setShowNewCat(false)
        setNewCatName('')
        setNewCatIcon('📍')
        setCatError('')
    }

    const handleCreateCategory = async () => {
        if (!newCatName.trim()) return
        setCreatingCat(true)
        setCatError('')
        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName: newCatName.trim(), icon: newCatIcon })
            })
            const data = await res.json()
            if (!res.ok) { setCatError(data.error || 'Failed'); return }
            const newCat: Category = data.category
            setCategories(prev => [...prev, newCat])
            setAddForm(prev => ({ ...prev, categoryId: newCat.id }))
            setShowNewCat(false)
            setNewCatName('')
            setNewCatIcon('📍')
        } catch {
            setCatError('Network error')
        } finally {
            setCreatingCat(false)
        }
    }

    const handleSubmitPlace = async () => {
        if (!addForm.name.trim() || !addForm.categoryId) {
            setSubmitError('Name and category are required')
            return
        }
        setIsSubmitting(true)
        setSubmitError('')
        try {
            const res = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: addForm.name.trim(),
                    description: addForm.description.trim() || undefined,
                    categoryId: addForm.categoryId,
                    blockId: addForm.blockId || undefined,
                    latitude: pinnedCoords?.lat,
                    longitude: pinnedCoords?.lng,
                    photo: addForm.photo
                })
            })
            const data = await res.json()
            if (res.status === 401) {
                cancelAdd()
                router.push('/login?redirect=/map')
                return
            }
            if (!res.ok) { setSubmitError(data.error || data.details?.[0] || 'Failed'); return }
            setSubmitSuccess(true)
            setTimeout(() => {
                cancelAdd()
                // Reload places
                fetch('/api/places').then(r => r.json()).then(d => setPlaces(d.places || []))
            }, 2200)
        } catch {
            setSubmitError('Network error, please try again')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleSubmitReview = async () => {
        if (!selectedPlace || !currentUser) return
        if (!reviewComment.trim()) return
        setIsSubmittingReview(true)
        try {
            const res = await fetch(`/api/places/${selectedPlace.id}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: reviewRating, comment: reviewComment.trim() })
            })
            if (res.ok) {
                const data = await res.json()
                setReviewingPlaceId(null)
                setReviewComment('')
                setReviewRating(5)
                // Reload places to update
                fetch('/api/places').then(r => r.json()).then(d => {
                    setPlaces(d.places || [])
                    const updated = (d.places || []).find((p: Place) => p.id === selectedPlace.id)
                    if (updated) setSelectedPlace(updated)
                })
            }
        } finally {
            setIsSubmittingReview(false)
        }
    }

    const handleSubmitPhoto = async () => {
        if (!selectedPlace || !currentUser || !newPhotoBase64) return
        setIsSubmittingPhoto(true)
        try {
            const res = await fetch(`/api/places/${selectedPlace.id}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoUrl: newPhotoBase64 })
            })
            if (res.ok) {
                const data = await res.json()
                setAddingPhotoPlaceId(null)
                setNewPhotoBase64(null)
                // Reload places to update
                fetch('/api/places').then(r => r.json()).then(d => {
                    setPlaces(d.places || [])
                    const updated = (d.places || []).find((p: Place) => p.id === selectedPlace.id)
                    if (updated) setSelectedPlace(updated)
                })
            }
        } finally {
            setIsSubmittingPhoto(false)
        }
    }

    const placesWithCoords = places.filter(p => p.latitude && p.longitude)

    return (
        <div className="h-screen w-screen overflow-hidden relative" style={{ background: '#0f172a' }}>
            {/* Full Screen Map */}
            <div className="absolute inset-0">
                <MapLibreCampusMap
                    places={placesWithCoords}
                    categories={categories}
                    selectedCategoryIds={selectedCategoryIds}
                    searchQuery={searchQuery}
                    pinDropMode={addMode === 'pin-drop'}
                    flyToPlace={flyToPlace}
                    navigateToPlace={navigateToPlace}
                    pinnedCoords={pinnedCoords}
                    selectedPlace={selectedPlace}
                    onMapClick={handleMapClick}
                    onPlaceClick={handlePlaceClick}
                />
            </div>

            {/* ─── TOP SEARCH BAR ─── */}
            <div className="absolute top-4 left-4 right-4 md:right-auto z-30 md:w-[320px]">
                {/* Search box */}
                <div className="relative">
                    <div className="flex items-center bg-white/90 backdrop-blur-md rounded-full shadow-lg overflow-hidden border border-white/50 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/30">
                        <div className="pl-4 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search places..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                            className="flex-1 px-3 py-2.5 outline-none text-gray-800 text-sm font-medium placeholder-gray-500 bg-transparent"
                        />
                        {searchInput && (
                            <button onClick={() => { setSearchInput(''); setSearchResults([]); setShowSearchResults(false); setSearchQuery('') }}
                                className="pr-4 text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 z-50">
                            {searchResults.map((place, i) => (
                                <button
                                    key={place.id}
                                    onClick={() => handleSearchSelect(place)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
                                    style={{ borderBottom: i < searchResults.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                                >
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                                        style={{ background: place.category ? getColor(place.category.id) + '20' : '#f3f4f6' }}>
                                        <span>{place.category?.icon || '📍'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{place.name}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{place.category?.categoryName}</p>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Category Filter Chips */}
                {categories.length > 0 && addMode === 'idle' && (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        {categories.map(cat => {
                            const color = getColor(cat.id)
                            const active = selectedCategoryIds.includes(cat.id)
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => toggleCategory(cat.id)}
                                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                                    style={{
                                        background: active ? color : 'rgba(255,255,255,0.92)',
                                        color: active ? '#fff' : '#374151',
                                        border: `2px solid ${active ? color : 'rgba(255,255,255,0.6)'}`,
                                        boxShadow: active ? `0 4px 16px ${color}55` : '0 2px 8px rgba(0,0,0,0.12)',
                                        backdropFilter: 'blur(8px)',
                                    }}
                                >
                                    <span>{cat.icon || '📍'}</span>
                                    <span>{cat.categoryName}</span>
                                    {(cat.placeCount || 0) > 0 && (
                                        <span className="ml-0.5 opacity-70">({cat.placeCount})</span>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ─── CAMPUS BADGE ─── */}
            <div className="absolute top-4 right-4 z-20 hidden md:block">
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 shadow-lg">
                    <div className="flex items-center gap-2.5">
                        <span className="text-2xl">🎓</span>
                        <div>
                            <p className="font-bold text-white text-sm leading-tight">Chandigarh University</p>
                            <p className="text-white/50 text-xs">3D Campus Map</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── PIN DROP INSTRUCTION TOAST ─── */}
            {addMode === 'pin-drop' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                    <div className="bg-gray-900/95 backdrop-blur-sm text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-bounce-gentle">
                        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center animate-pulse flex-shrink-0">
                            <span className="text-base">📍</span>
                        </div>
                        <div>
                            <p className="font-semibold text-sm">Click anywhere on the map</p>
                            <p className="text-white/60 text-xs">to drop your pin and add a new place</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── PLACE DETAIL PANEL ─── */}
            {selectedPlace && addMode === 'idle' && (
                <div className="absolute bottom-0 left-0 right-0 md:left-4 md:bottom-4 md:right-auto z-40 md:w-96">
                    <div className="bg-white md:rounded-3xl rounded-t-3xl shadow-[0_-8px_40px_rgba(0,0,0,0.2)] md:shadow-2xl overflow-hidden"
                        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
                        {/* Drag handle (mobile) */}
                        <div className="flex justify-center pt-3 pb-1 md:hidden">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                        <div className="px-5 pb-6 pt-2 max-h-[75vh] overflow-y-auto overflow-x-hidden">
                            {/* Header */}
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                                    style={{ background: selectedPlace.category ? getColor(selectedPlace.category.id) + '18' : '#f3f4f6' }}>
                                    <span>{selectedPlace.category?.icon || '📍'}</span>
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h2 className="text-lg font-bold text-gray-900 leading-tight">{selectedPlace.name}</h2>
                                    {selectedPlace.category && (
                                        <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                                            style={{
                                                background: getColor(selectedPlace.category.id) + '18',
                                                color: getColor(selectedPlace.category.id)
                                            }}>
                                            {selectedPlace.category.categoryName}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => setSelectedPlace(null)}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Description */}
                            {selectedPlace.description && (
                                <p className="text-sm text-gray-500 mb-4 leading-relaxed line-clamp-3">
                                    {selectedPlace.description}
                                </p>
                            )}

                            {/* Info chips */}
                            <div className="flex flex-wrap gap-2 mb-5">
                                {selectedPlace.block && (
                                    <span className="flex items-center gap-1.5 bg-gray-50 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-100">
                                        🏢 <span>{selectedPlace.block.name}</span>
                                    </span>
                                )}
                                {selectedPlace.latitude && (
                                    <span className="flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl text-xs font-medium border border-blue-100">
                                        📌 <span>GPS Located</span>
                                    </span>
                                )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => {
                                        if (selectedPlace.latitude && selectedPlace.longitude) {
                                            // Use a new object reference to re-trigger the effect even if same place
                                            setNavigateToPlace({ ...selectedPlace })
                                            setFlyToPlace(null)
                                        }
                                    }}
                                    className="flex-1 py-3 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    Navigate
                                </button>
                                <button
                                    onClick={() => setSelectedPlace(null)}
                                    className="px-4 py-3 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95"
                                >
                                    Close
                                </button>
                            </div>

                            <hr className="my-5 border-gray-100" />

                            {/* Photos Section */}
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-bold text-gray-900 text-sm">Photos</h3>
                                    {currentUser && addingPhotoPlaceId !== selectedPlace.id && (
                                        <button onClick={() => setAddingPhotoPlaceId(selectedPlace.id)} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">+ Add Photo</button>
                                    )}
                                </div>
                                
                                {addingPhotoPlaceId === selectedPlace.id && (
                                    <div className="mb-4 bg-gray-50 rounded-xl p-3 border border-gray-100">
                                        <ImageUpload onImageSelect={(_, b64) => setNewPhotoBase64(b64)} className="w-full h-32 rounded-lg border-2 border-dashed bg-white overflow-hidden shadow-inner mb-3 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors" />
                                        <div className="flex gap-2">
                                            <button onClick={() => {setAddingPhotoPlaceId(null); setNewPhotoBase64(null)}} className="flex-1 py-2 rounded-lg text-xs font-semibold text-gray-600 bg-white border border-gray-200">Cancel</button>
                                            <button onClick={handleSubmitPhoto} disabled={!newPhotoBase64 || isSubmittingPhoto} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 disabled:opacity-50">Upload</button>
                                        </div>
                                    </div>
                                )}

                                {selectedPlace.photos && selectedPlace.photos.length > 0 ? (
                                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
                                        {selectedPlace.photos.map((photo, idx) => (
                                            <div key={idx} className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 shadow-sm border border-gray-100/50">
                                                <img src={photo.photoUrl} alt="Location" className="w-full h-full object-cover select-none" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">No photos yet.</p>
                                )}
                            </div>

                            {/* Reviews Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-gray-900 text-sm">Reviews</h3>
                                        {selectedPlace.reviews && selectedPlace.reviews.length > 0 && (
                                            <span className="flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                                                ⭐ {(selectedPlace.reviews.reduce((acc, r) => acc + r.rating, 0) / selectedPlace.reviews.length).toFixed(1)} 
                                                <span className="opacity-60 font-normal">({selectedPlace.reviews.length})</span>
                                            </span>
                                        )}
                                    </div>
                                    {currentUser && reviewingPlaceId !== selectedPlace.id && !selectedPlace.reviews?.some(r => r.user.id === currentUser.id) && (
                                        <button onClick={() => setReviewingPlaceId(selectedPlace.id)} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">Write a Review</button>
                                    )}
                                </div>

                                {reviewingPlaceId === selectedPlace.id && (
                                    <div className="mb-5 bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
                                        <div className="flex gap-1 mb-3">
                                            {[1,2,3,4,5].map(star => (
                                                <button key={star} onClick={() => setReviewRating(star)} className={`text-xl transition-all ${reviewRating >= star ? 'text-amber-400 drop-shadow-sm scale-110' : 'text-gray-300'}`}>⭐</button>
                                            ))}
                                        </div>
                                        <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Share details of your experience..." rows={3} className="w-full p-3 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 mb-3 resize-none bg-white placeholder-gray-400" />
                                        <div className="flex gap-2">
                                            <button onClick={() => {setReviewingPlaceId(null); setReviewComment(''); setReviewRating(5)}} className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                            <button onClick={handleSubmitReview} disabled={!reviewComment.trim() || isSubmittingReview} className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 disabled:opacity-50 transition-all hover:bg-indigo-700">Submit Review</button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {selectedPlace.reviews && selectedPlace.reviews.length > 0 ? (
                                        selectedPlace.reviews.map(review => (
                                            <div key={review.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                            {review.user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-semibold text-gray-800 text-sm">{review.user.name}</span>
                                                        {currentUser?.id === review.user.id && (
                                                            <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">You</span>
                                                        )}
                                                    </div>
                                                    <div className="flex text-[10px] text-amber-400 drop-shadow-sm gap-[1px]">
                                                        {Array(5).fill(0).map((_, i) => <span key={i} className={i < review.rating ? 'opacity-100' : 'opacity-30 grayscale'}>⭐</span>)}
                                                    </div>
                                                </div>
                                                <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">No reviews yet. Be the first to review!</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── ADD PLACE FORM MODAL (centered popup) ─── */}
            {addMode === 'form' && pinnedCoords && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelAdd} />
                    <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden"
                        style={{ background: '#1a1f3a', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', animation: 'fadeIn 0.25s ease-out' }}>

                        {/* Header */}
                        <div className="px-5 pt-4 pb-4 border-b border-white/8 flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-xl">📍</div>
                                    <div>
                                        <h3 className="font-bold text-white text-base">Add New Place</h3>
                                        <p className="text-white/70 text-xs">{pinnedCoords.lat.toFixed(5)}, {pinnedCoords.lng.toFixed(5)}</p>
                                    </div>
                                </div>
                                <button onClick={cancelAdd}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all text-white">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Form content */}
                        <div className="overflow-y-auto flex-1">
                            <div className="px-5 py-4 space-y-4">
                                {submitSuccess ? (
                                    <div className="py-10 text-center">
                                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-bounce-gentle">
                                            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <h4 className="font-bold text-white text-lg">Place Submitted!</h4>
                                        <p className="text-white/50 text-sm mt-1">Awaiting admin approval.</p>
                                    </div>
                                ) : (
                                    <>
                                        {submitError && (
                                            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-300">
                                                <span>⚠️</span> {submitError}
                                            </div>
                                        )}

                                        {/* Place Name */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Place Name *</label>
                                            <input
                                                type="text"
                                                value={addForm.name}
                                                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                                                placeholder="e.g. UIET Computer Lab"
                                                className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium transition-all text-white placeholder-white/25"
                                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Description</label>
                                            <textarea
                                                value={addForm.description}
                                                onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))}
                                                placeholder="Brief description of this place..."
                                                rows={2}
                                                className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all resize-none text-white placeholder-white/25"
                                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                            />
                                        </div>

                                        {/* Photo Upload */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Photo (Optional)</label>
                                            <ImageUpload 
                                                onImageSelect={(_, b64) => setAddForm(p => ({ ...p, photo: b64 }))}
                                                className="w-full rounded-xl overflow-hidden border border-white/12"
                                            />
                                        </div>

                                        {/* Category */}
                                        <div>
                                            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Category *</label>
                                            {!showNewCat ? (
                                                <div className="space-y-2">
                                                    <select
                                                        value={addForm.categoryId}
                                                        onChange={e => {
                                                            if (e.target.value === '__new__') { setShowNewCat(true); return }
                                                            setAddForm(p => ({ ...p, categoryId: e.target.value }))
                                                        }}
                                                        className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all text-white"
                                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                                    >
                                                        <option value="" className="bg-gray-900">Select a category...</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.icon} {cat.categoryName}</option>
                                                        ))}
                                                        <option value="__new__" className="bg-gray-900">✨ Create new category...</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                                                    <div className="flex items-center justify-between">
                                                        <p className="font-semibold text-indigo-300 text-sm">✨ New Category</p>
                                                        <button onClick={() => setShowNewCat(false)} className="text-indigo-400 hover:text-indigo-200 text-xs transition-colors">Cancel</button>
                                                    </div>
                                                    {catError && <p className="text-red-400 text-xs">{catError}</p>}
                                                    <input
                                                        type="text"
                                                        value={newCatName}
                                                        onChange={e => setNewCatName(e.target.value)}
                                                        placeholder="Category name"
                                                        className="w-full px-3 py-2.5 rounded-xl outline-none text-sm text-white placeholder-white/30"
                                                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(99,102,241,0.25)' }}
                                                    />
                                                    <div>
                                                        <p className="text-xs text-indigo-400 mb-2">Choose icon:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {COMMON_EMOJIS.map(emoji => (
                                                                <button
                                                                    key={emoji}
                                                                    onClick={() => setNewCatIcon(emoji)}
                                                                    className="w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all"
                                                                    style={{
                                                                        background: newCatIcon === emoji ? '#6366f1' : 'rgba(255,255,255,0.06)',
                                                                        border: `2px solid ${newCatIcon === emoji ? '#6366f1' : 'rgba(255,255,255,0.1)'}`,
                                                                        transform: newCatIcon === emoji ? 'scale(1.1)' : 'scale(1)'
                                                                    }}
                                                                >
                                                                    {emoji}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={handleCreateCategory}
                                                        disabled={!newCatName.trim() || creatingCat}
                                                        className="w-full py-2.5 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50"
                                                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                                                    >
                                                        {creatingCat ? 'Creating...' : 'Create Category'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Block (only if blocks exist) */}
                                        {blocks.length > 0 && (
                                            <div>
                                                <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Building / Block <span className="font-normal normal-case text-white/25">(optional)</span></label>
                                                <select
                                                    value={addForm.blockId}
                                                    onChange={e => setAddForm(p => ({ ...p, blockId: e.target.value }))}
                                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all text-white"
                                                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                                >
                                                    <option value="" className="bg-gray-900">No specific building</option>
                                                    {blocks.map(b => (
                                                        <option key={b.id} value={b.id} className="bg-gray-900">{b.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Coordinates display */}
                                        <div className="flex items-center gap-2 rounded-xl px-4 py-3" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                            <span className="text-green-400">📌</span>
                                            <div>
                                                <p className="text-xs font-semibold text-green-400">Location Pinned</p>
                                                <p className="text-xs text-green-400/60 font-mono mt-0.5">
                                                    {pinnedCoords.lat.toFixed(6)}, {pinnedCoords.lng.toFixed(6)}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Footer actions */}
                        {!submitSuccess && (
                            <div className="px-5 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                <button
                                    onClick={cancelAdd}
                                    className="flex-1 py-3 text-sm font-semibold text-white/50 hover:text-white rounded-xl hover:bg-white/8 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitPlace}
                                    disabled={isSubmitting || !addForm.name.trim() || !addForm.categoryId}
                                    className="flex-1 py-3 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.4)' }}
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Submitting...
                                        </span>
                                    ) : 'Submit for Review →'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── FLOATING ADD BUTTON ─── */}
            {addMode === 'idle' && (
                <button
                    onClick={enterPinDrop}
                    className="absolute right-5 bottom-8 z-30 w-14 h-14 flex items-center justify-center rounded-full text-white text-2xl font-light transition-all hover:scale-110 active:scale-95"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        boxShadow: '0 8px 32px rgba(99,102,241,0.55), 0 2px 8px rgba(0,0,0,0.2)'
                    }}
                    title="Add new place"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            )}

            {/* Cancel pin drop button */}
            {addMode === 'pin-drop' && (
                <button
                    onClick={cancelAdd}
                    className="absolute right-5 bottom-8 z-30 px-5 py-3 flex items-center gap-2 rounded-2xl text-white text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                    style={{
                        background: 'rgba(239,68,68,0.9)',
                        backdropFilter: 'blur(8px)',
                        boxShadow: '0 8px 24px rgba(239,68,68,0.4)'
                    }}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                </button>
            )}

            {/* No places yet info */}
            {!isLoading && placesWithCoords.length === 0 && addMode === 'idle' && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md text-white/80 px-5 py-3 rounded-2xl text-sm text-center border border-white/10">
                        <p className="font-medium">No places pinned yet</p>
                        <p className="text-white/50 text-xs mt-0.5">Tap + to add your first location</p>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(120%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes bounceGentle {
                    0%, 100% { transform: translateY(0) translateX(-50%); }
                    50% { transform: translateY(-6px) translateX(-50%); }
                }
                .animate-bounce-gentle {
                    animation: bounceGentle 2s ease-in-out infinite;
                }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .place-marker { will-change: transform; }
                .line-clamp-3 {
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
            `}</style>
        </div>
    )
}
