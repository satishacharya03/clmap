'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'

interface ParkingArea {
    id: string
    name: string
    block: { name: string }
    slots: ParkingSlot[]
    stats: {
        total: number
        available: number
        occupied: number
        reserved: number
        availabilityPercent: number
    }
}

interface ParkingSlot {
    id: string
    slotNumber: string
    status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
}

export default function ParkingPage() {
    const [parkingAreas, setParkingAreas] = useState<ParkingArea[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [selectedArea, setSelectedArea] = useState<string | null>(null)

    useEffect(() => {
        fetchParkingData()
    }, [])

    const fetchParkingData = async () => {
        try {
            const res = await fetch('/api/parking')
            const data = await res.json()
            setParkingAreas(data.parkingAreas || [])
            if (data.parkingAreas?.length > 0) {
                setSelectedArea(data.parkingAreas[0].id)
            }
        } catch (error) {
            console.error('Error fetching parking data:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-green-500'
            case 'OCCUPIED': return 'bg-red-500'
            case 'RESERVED': return 'bg-yellow-500'
            default: return 'bg-gray-500'
        }
    }

    const currentArea = parkingAreas.find(a => a.id === selectedArea)

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            <main className="pt-20 pb-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">🅿️ Parking Availability</h1>
                    <p className="text-gray-600 mb-6">
                        Real-time parking slot availability across campus
                    </p>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                        </div>
                    ) : parkingAreas.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">🚗</span>
                            <p className="text-gray-500">No parking areas found</p>
                        </div>
                    ) : (
                        <>
                            {/* Area Selector */}
                            <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                                {parkingAreas.map((area) => (
                                    <button
                                        key={area.id}
                                        onClick={() => setSelectedArea(area.id)}
                                        className={`flex-shrink-0 px-4 py-3 rounded-xl transition-all ${selectedArea === area.id
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="font-medium">{area.name}</div>
                                        <div className={`text-sm ${selectedArea === area.id ? 'text-blue-100' : 'text-gray-500'}`}>
                                            {area.stats.available}/{area.stats.total} available
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {currentArea && (
                                <>
                                    {/* Stats Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                                            <div className="text-3xl font-bold text-gray-900">{currentArea.stats.total}</div>
                                            <div className="text-sm text-gray-500">Total Slots</div>
                                        </div>
                                        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                            <div className="text-3xl font-bold text-green-600">{currentArea.stats.available}</div>
                                            <div className="text-sm text-green-600">Available</div>
                                        </div>
                                        <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                                            <div className="text-3xl font-bold text-red-600">{currentArea.stats.occupied}</div>
                                            <div className="text-sm text-red-600">Occupied</div>
                                        </div>
                                        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                            <div className="text-3xl font-bold text-yellow-600">{currentArea.stats.reserved}</div>
                                            <div className="text-sm text-yellow-600">Reserved</div>
                                        </div>
                                    </div>

                                    {/* Availability Bar */}
                                    <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-700">Availability</span>
                                            <span className="text-2xl font-bold text-blue-600">
                                                {currentArea.stats.availabilityPercent}%
                                            </span>
                                        </div>
                                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                                                style={{ width: `${currentArea.stats.availabilityPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Slot Grid */}
                                    <div className="bg-white rounded-xl p-4 border border-gray-200">
                                        <h2 className="font-semibold text-gray-900 mb-4">Slot Overview</h2>
                                        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                                            {currentArea.slots.map((slot) => (
                                                <div
                                                    key={slot.id}
                                                    className={`aspect-square rounded-lg ${getStatusColor(slot.status)} flex items-center justify-center text-white text-xs font-medium transition-transform hover:scale-110`}
                                                    title={`${slot.slotNumber} - ${slot.status}`}
                                                >
                                                    {slot.slotNumber.replace('P', '')}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Legend */}
                                        <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="w-4 h-4 rounded bg-green-500"></div>
                                                <span>Available</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="w-4 h-4 rounded bg-red-500"></div>
                                                <span>Occupied</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                <div className="w-4 h-4 rounded bg-yellow-500"></div>
                                                <span>Reserved</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}
