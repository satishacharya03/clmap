'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ImageUpload from '@/components/ImageUpload'

interface Category {
    id: string
    categoryName: string
    icon?: string
}

interface Block {
    id: string
    name: string
}

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
    const [image, setImage] = useState<File | null>(null)

    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        fetchFormData()
    }, [])

    const fetchFormData = async () => {
        try {
            const [catRes, blocksRes] = await Promise.all([
                fetch('/api/categories'),
                fetch('/api/blocks')
            ])

            const catData = await catRes.json()
            setCategories(catData.categories || [])

            if (blocksRes.ok) {
                const blocksData = await blocksRes.json()
                setBlocks(blocksData.blocks || [])
            }
        } catch (error) {
            console.error('Error fetching form data:', error)
        }
    }

    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser')
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toString())
                setLongitude(position.coords.longitude.toString())
            },
            (error) => {
                alert('Unable to get location: ' + error.message)
            }
        )
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const res = await fetch('/api/places', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    categoryId,
                    blockId: blockId || undefined,
                    latitude: latitude ? parseFloat(latitude) : undefined,
                    longitude: longitude ? parseFloat(longitude) : undefined
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || data.details?.[0] || 'Failed to submit place')
            }

            // TODO: Upload image if provided

            setSuccess(true)
            setTimeout(() => {
                router.push('/map')
            }, 2000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit place')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Header />
                <main className="pt-24 px-4">
                    <div className="max-w-md mx-auto text-center">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-4xl">✅</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Place Submitted!</h1>
                        <p className="text-gray-600">
                            Your place has been submitted for review. You&apos;ll be notified once it&apos;s approved.
                        </p>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-lg mx-auto">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Add New Place</h1>
                    <p className="text-gray-600 mb-6">
                        Help others discover new places on campus. Your submission will be reviewed before publishing.
                    </p>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Photo (optional)
                            </label>
                            <ImageUpload onImageSelect={setImage} />
                        </div>

                        {/* Place Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Place Name *
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                placeholder="e.g., Computer Science Lab"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                                placeholder="Brief description of the place..."
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                                Category *
                            </label>
                            <select
                                id="category"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                required
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white"
                            >
                                <option value="">Select category</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.icon} {cat.categoryName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Block */}
                        <div>
                            <label htmlFor="block" className="block text-sm font-medium text-gray-700 mb-1">
                                Block / Building
                            </label>
                            <select
                                id="block"
                                value={blockId}
                                onChange={(e) => setBlockId(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white"
                            >
                                <option value="">Select block (optional)</option>
                                {blocks.map((block) => (
                                    <option key={block.id} value={block.id}>
                                        {block.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Location Coordinates
                            </label>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <input
                                    type="number"
                                    step="any"
                                    value={latitude}
                                    onChange={(e) => setLatitude(e.target.value)}
                                    placeholder="Latitude"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                />
                                <input
                                    type="number"
                                    step="any"
                                    value={longitude}
                                    onChange={(e) => setLongitude(e.target.value)}
                                    placeholder="Longitude"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={getCurrentLocation}
                                className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                                📍 Use Current Location
                            </button>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Submitting...
                                </span>
                            ) : (
                                'Submit Place for Review'
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    )
}
