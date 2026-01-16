'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const MapLibreCampusMap = dynamic(() => import('@/components/MapLibreCampusMap'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-blue-600 font-medium">Loading 3D Campus Map...</p>
            </div>
        </div>
    )
})

interface Building {
    id: string
    name: string
    dept: string
    icon: string
    floors: number
    color: string
}

export default function MapPage() {
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    return (
        <div className="h-screen w-screen overflow-hidden bg-gray-100">
            {/* Full Screen Map */}
            <div className="absolute inset-0">
                <MapLibreCampusMap
                    onBuildingClick={(building: any) => setSelectedBuilding(building)}
                    selectedBuilding={selectedBuilding?.id}
                    searchQuery={searchQuery}
                />
            </div>

            {/* Search Bar */}
            <div className="absolute top-4 left-4 z-30 w-72">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="flex items-center px-4 py-3">
                        <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search blocks, departments..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 outline-none text-gray-800 placeholder-gray-400 text-sm"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 ml-2">
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Login Button */}
            <div className="absolute top-4 right-20 z-30">
                <Link
                    href="/login"
                    className="bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                >
                    Login
                </Link>
            </div>

            {/* Selected Building Bottom Sheet */}
            {selectedBuilding && (
                <div className="absolute bottom-0 left-0 right-0 z-40">
                    <div className="bg-white rounded-t-3xl shadow-2xl animate-slide-up">
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1.5 bg-gray-300 rounded-full"></div>
                        </div>

                        <div className="px-5 pb-6">
                            {/* Header */}
                            <div className="flex items-start gap-4 mb-4">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                                    style={{ background: selectedBuilding.color + '20' }}
                                >
                                    {selectedBuilding.icon}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-gray-900">{selectedBuilding.name}</h2>
                                    <p className="text-blue-600 text-sm font-medium">{selectedBuilding.dept}</p>
                                    <p className="text-gray-400 text-xs mt-1">{selectedBuilding.floors} floors • Chandigarh University</p>
                                </div>
                                <button
                                    onClick={() => setSelectedBuilding(null)}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Quick Info */}
                            <div className="flex gap-3 mb-5">
                                <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-gray-900">{selectedBuilding.floors}</p>
                                    <p className="text-xs text-gray-500">Floors</p>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-gray-900">A/C</p>
                                    <p className="text-xs text-gray-500">Climate</p>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-lg font-bold text-gray-900">WiFi</p>
                                    <p className="text-xs text-gray-500">Connected</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button className="flex-1 py-3.5 bg-blue-500 text-white text-center rounded-xl font-medium hover:bg-blue-600 transition-colors">
                                    📍 Get Directions
                                </button>
                                <button className="flex-1 py-3.5 border-2 border-gray-200 text-gray-700 text-center rounded-xl font-medium hover:bg-gray-50 transition-colors">
                                    📷 View Photos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Place FAB */}
            <Link
                href="/add-place"
                className="absolute right-4 bottom-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-600 transition-all hover:scale-110 z-30"
            >
                +
            </Link>

            <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
        </div>
    )
}
