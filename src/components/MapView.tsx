'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icon
const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

L.Marker.prototype.options.icon = defaultIcon

// Chandigarh University Campus Bounds - Tight focus
const CU_CAMPUS = {
    center: [30.7699, 76.5766] as [number, number],
    bounds: {
        north: 30.7750,
        south: 30.7650,
        east: 76.5830,
        west: 76.5700
    }
}

// Campus boundary polygon (approximate)
const CAMPUS_BOUNDARY: [number, number][] = [
    [30.7750, 76.5700],
    [30.7750, 76.5830],
    [30.7650, 76.5830],
    [30.7650, 76.5700],
]

// Outer mask to hide everything outside campus
const OUTER_MASK: [number, number][] = [
    [31.0, 76.3],
    [31.0, 76.9],
    [30.5, 76.9],
    [30.5, 76.3],
]

interface Place {
    id: string
    name: string
    description?: string
    latitude: number
    longitude: number
    category?: {
        categoryName: string
        icon?: string
    }
}

interface MapViewProps {
    places?: Place[]
    onPlaceClick?: (place: Place) => void
    onMapClick?: (lat: number, lng: number) => void
}

// Create marker icons with emojis
const createMarkerIcon = (emoji: string) => L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-pin">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
})

// Map controller for bounds
function MapController() {
    const map = useMap()

    useEffect(() => {
        const bounds = L.latLngBounds(
            [CU_CAMPUS.bounds.south, CU_CAMPUS.bounds.west],
            [CU_CAMPUS.bounds.north, CU_CAMPUS.bounds.east]
        )

        map.setMaxBounds(bounds.pad(0.05))
        map.setMinZoom(16)
        map.setMaxZoom(19)
        map.fitBounds(bounds)
    }, [map])

    return null
}

export default function MapView({
    places = [],
    onPlaceClick,
    onMapClick
}: MapViewProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-blue-600 font-medium">Loading Campus Map...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full relative">
            <style jsx global>{`
        .custom-marker {
          background: none;
          border: none;
        }
        .marker-pin {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 12px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          border: 2px solid #3b82f6;
        }
        .marker-pin > * {
          transform: rotate(45deg);
        }
        .leaflet-container {
          background: #e8f4f8;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content {
          margin: 0;
        }
        .leaflet-popup-close-button {
          display: none;
        }
        .leaflet-control-attribution {
          display: none;
        }
        .leaflet-control-zoom {
          display: none;
        }
      `}</style>

            <MapContainer
                center={CU_CAMPUS.center}
                zoom={17}
                className="w-full h-full"
                zoomControl={false}
                attributionControl={false}
            >
                <MapController />

                {/* Clean, minimal map tiles */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {/* Mask outside campus - makes external area faded */}
                <Polygon
                    positions={[OUTER_MASK, CAMPUS_BOUNDARY]}
                    pathOptions={{
                        fillColor: '#f0f4f8',
                        fillOpacity: 0.85,
                        stroke: false
                    }}
                />

                {/* Campus boundary highlight */}
                <Polygon
                    positions={CAMPUS_BOUNDARY}
                    pathOptions={{
                        color: '#3b82f6',
                        weight: 3,
                        fillColor: 'transparent',
                        fillOpacity: 0,
                        dashArray: '10, 5'
                    }}
                />

                {/* Place markers */}
                {places.map((place) => (
                    <Marker
                        key={place.id}
                        position={[place.latitude, place.longitude]}
                        icon={createMarkerIcon(place.category?.icon || '📍')}
                        eventHandlers={{
                            click: () => onPlaceClick?.(place)
                        }}
                    >
                        <Popup>
                            <div className="min-w-[200px]">
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-2xl">{place.category?.icon || '📍'}</span>
                                        <h3 className="font-bold text-gray-900">{place.name}</h3>
                                    </div>
                                    {place.description && (
                                        <p className="text-sm text-gray-600 mb-3">{place.description}</p>
                                    )}
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                        {place.category?.categoryName}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onPlaceClick?.(place)}
                                    className="w-full py-3 bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
                                >
                                    View Details
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Simple zoom controls */}
            <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-1">
                <button
                    onClick={() => {
                        const map = document.querySelector('.leaflet-container') as any
                        map?._leaflet_map?.zoomIn()
                    }}
                    className="w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 text-xl font-light border border-gray-200"
                >
                    +
                </button>
                <button
                    onClick={() => {
                        const map = document.querySelector('.leaflet-container') as any
                        map?._leaflet_map?.zoomOut()
                    }}
                    className="w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 text-xl font-light border border-gray-200"
                >
                    −
                </button>
            </div>

            {/* Campus label */}
            <div className="absolute top-4 left-4 z-[1000]">
                <div className="bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🎓</span>
                        <span className="font-semibold text-gray-800">Chandigarh University</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
