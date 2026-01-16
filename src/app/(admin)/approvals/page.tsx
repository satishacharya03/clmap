'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import PlaceCard from '@/components/PlaceCard'

interface Place {
    id: string
    name: string
    description?: string
    latitude?: number
    longitude?: number
    approvalStatus: string
    category?: {
        categoryName: string
        icon?: string
    }
    block?: { name: string }
    floor?: { floorNumber: number }
    photos?: { photoUrl: string }[]
    createdBy: {
        name: string
        email: string
    }
    createdAt: string
}

export default function ApprovalsPage() {
    const router = useRouter()
    const [places, setPlaces] = useState<Place[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)

    useEffect(() => {
        fetchPendingApprovals()
    }, [])

    const fetchPendingApprovals = async () => {
        try {
            const res = await fetch('/api/admin/approvals')
            if (res.status === 403) {
                router.push('/map')
                return
            }
            const data = await res.json()
            setPlaces(data.places || [])
        } catch (error) {
            console.error('Error fetching approvals:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAction = async (placeId: string, action: 'approve' | 'reject') => {
        setProcessingId(placeId)
        try {
            const res = await fetch(`/api/admin/approvals/${placeId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            })

            if (res.ok) {
                setPlaces(places.filter(p => p.id !== placeId))
                setSelectedPlace(null)
            }
        } catch (error) {
            console.error('Error processing approval:', error)
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">✅ Pending Approvals</h1>
                            <p className="text-gray-600">Review and approve user-submitted places</p>
                        </div>
                        <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-full font-medium">
                            {places.length} pending
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : places.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <span className="text-4xl mb-4 block">🎉</span>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
                            <p className="text-gray-500">No pending approvals at the moment</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {places.map((place) => (
                                <div
                                    key={place.id}
                                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                                >
                                    <div className="p-4">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <PlaceCard
                                                    {...place}
                                                    compact
                                                    onClick={() => setSelectedPlace(place)}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(place.id, 'approve')}
                                                    disabled={processingId === place.id}
                                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {processingId === place.id ? '...' : '✓ Approve'}
                                                </button>
                                                <button
                                                    onClick={() => handleAction(place.id, 'reject')}
                                                    disabled={processingId === place.id}
                                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {processingId === place.id ? '...' : '✗ Reject'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                                            Submitted by {place.createdBy.name} ({place.createdBy.email})
                                            <span className="mx-2">•</span>
                                            {new Date(place.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Detail Modal */}
            {selectedPlace && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setSelectedPlace(null)}
                    />
                    <div className="relative bg-white rounded-t-3xl md:rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Place Details</h3>
                            <button
                                onClick={() => setSelectedPlace(null)}
                                className="p-2 hover:bg-gray-100 rounded-full"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4">
                            <h4 className="text-lg font-semibold mb-2">{selectedPlace.name}</h4>

                            {selectedPlace.category && (
                                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mb-4">
                                    {selectedPlace.category.icon} {selectedPlace.category.categoryName}
                                </span>
                            )}

                            {selectedPlace.description && (
                                <p className="text-gray-600 mb-4">{selectedPlace.description}</p>
                            )}

                            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                                {selectedPlace.block && <p>📍 Block: {selectedPlace.block.name}</p>}
                                {selectedPlace.floor && <p>🏢 Floor: {selectedPlace.floor.floorNumber}</p>}
                                {selectedPlace.latitude && selectedPlace.longitude && (
                                    <p>🗺️ Coordinates: {selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAction(selectedPlace.id, 'approve')}
                                    disabled={processingId === selectedPlace.id}
                                    className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
                                >
                                    ✓ Approve
                                </button>
                                <button
                                    onClick={() => handleAction(selectedPlace.id, 'reject')}
                                    disabled={processingId === selectedPlace.id}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 font-medium transition-colors"
                                >
                                    ✗ Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
