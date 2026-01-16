'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Chandigarh University Campus Center
const CU_CENTER: [number, number] = [76.5766, 30.7699]

// CU Campus Boundary (approximate polygon around the campus)
const CU_CAMPUS_BOUNDARY: [number, number][] = [
    [76.5680, 30.7750], // NW corner
    [76.5850, 30.7750], // NE corner
    [76.5850, 30.7630], // SE corner
    [76.5680, 30.7630], // SW corner
    [76.5680, 30.7750], // Close polygon
]

// Outer world bounds (large rectangle covering surrounding area)
const OUTER_BOUNDS: [number, number][] = [
    [76.40, 30.90],  // NW
    [76.80, 30.90],  // NE
    [76.80, 30.60],  // SE
    [76.40, 30.60],  // SW
    [76.40, 30.90],  // Close
]

// FORCED building height - 7 floors = 25 meters
const FORCED_BUILDING_HEIGHT = 25

interface Props {
    onBuildingClick?: (building: any) => void
    selectedBuilding?: string | null
    searchQuery?: string
}

export default function MapLibreCampusMap({ onBuildingClick, selectedBuilding, searchQuery = '' }: Props) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const [isFirstPerson, setIsFirstPerson] = useState(false)
    const [hoveredBuilding, setHoveredBuilding] = useState<any>(null)
    const keysPressed = useRef<Set<string>>(new Set())
    const animationRef = useRef<number | null>(null)

    // Initialize map with REAL OSM buildings but FORCED height
    useEffect(() => {
        if (!mapContainer.current || map.current) return

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: CU_CENTER,
            zoom: 16,
            pitch: 55,
            bearing: -17.6,
            maxPitch: 85,
            dragRotate: true
        })

        map.current.addControl(new maplibregl.NavigationControl({
            visualizePitch: true,
            showCompass: true,
            showZoom: true
        }), 'bottom-right')

        map.current.on('load', () => {
            if (!map.current) return

            const style = map.current.getStyle()
            const sources = style.sources
            const layers = style.layers

            // Find the vector tile source
            let vectorSource = 'openmaptiles'
            for (const sourceName of Object.keys(sources)) {
                if (sourceName.includes('openmaptiles') || sourceName.includes('maptiler') || sourceName === 'composite') {
                    vectorSource = sourceName
                    break
                }
            }

            console.log('Using source:', vectorSource)

            // Remove any existing flat building layers
            for (const layer of layers || []) {
                if (layer.id.includes('building') && layer.type === 'fill') {
                    try {
                        map.current?.removeLayer(layer.id)
                    } catch (e) { }
                }
            }

            // ============ CAMPUS BOUNDARY MASK ============
            // Create a polygon with a hole - outer bounds with CU campus cut out
            // This masks everything OUTSIDE the campus
            map.current.addSource('campus-mask', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'Polygon',
                        // First ring is outer bounds, second ring is the hole (campus)
                        coordinates: [OUTER_BOUNDS, CU_CAMPUS_BOUNDARY]
                    }
                }
            })

            // Dark mask layer covering everything outside campus
            map.current.addLayer({
                id: 'campus-mask-layer',
                type: 'fill',
                source: 'campus-mask',
                paint: {
                    'fill-color': '#1a1a2e',
                    'fill-opacity': 0.92
                }
            })

            // Campus boundary outline
            map.current.addSource('campus-boundary', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: CU_CAMPUS_BOUNDARY
                    }
                }
            })

            map.current.addLayer({
                id: 'campus-boundary-line',
                type: 'line',
                source: 'campus-boundary',
                paint: {
                    'line-color': '#3b82f6',
                    'line-width': 4,
                    'line-opacity': 0.9
                }
            })

            // Also restrict max bounds so user can't pan too far outside campus
            map.current.setMaxBounds([
                [76.5650, 30.7600],  // SW corner (slightly outside campus)
                [76.5880, 30.7780]   // NE corner (slightly outside campus)
            ])

            // ============ ENHANCED ROADS & STREETS ============
            // Make roads more visible with proper styling
            try {
                // All roads - main layer with fill
                map.current.addLayer({
                    id: 'campus-roads-fill',
                    source: vectorSource,
                    'source-layer': 'transportation',
                    type: 'line',
                    minzoom: 12,
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': [
                            'interpolate', ['exponential', 1.5], ['zoom'],
                            12, 1,
                            14, 3,
                            16, 8,
                            18, 16,
                            20, 30
                        ],
                        'line-opacity': 1
                    }
                })

                // Road outlines/borders
                map.current.addLayer({
                    id: 'campus-roads-border',
                    source: vectorSource,
                    'source-layer': 'transportation',
                    type: 'line',
                    minzoom: 12,
                    paint: {
                        'line-color': '#94a3b8',
                        'line-width': [
                            'interpolate', ['exponential', 1.5], ['zoom'],
                            12, 1.5,
                            14, 4,
                            16, 10,
                            18, 20,
                            20, 36
                        ],
                        'line-opacity': 0.8
                    }
                }, 'campus-roads-fill')

                // Road center line markings
                map.current.addLayer({
                    id: 'campus-roads-centerline',
                    source: vectorSource,
                    'source-layer': 'transportation',
                    type: 'line',
                    minzoom: 15,
                    paint: {
                        'line-color': '#fbbf24',
                        'line-width': 1,
                        'line-dasharray': [4, 4],
                        'line-opacity': 0.7
                    }
                })

                // Paths and footways (dashed)
                map.current.addLayer({
                    id: 'campus-paths',
                    source: vectorSource,
                    'source-layer': 'transportation',
                    type: 'line',
                    minzoom: 14,
                    filter: ['any',
                        ['==', ['get', 'class'], 'path'],
                        ['==', ['get', 'class'], 'footway'],
                        ['==', ['get', 'class'], 'pedestrian']
                    ],
                    paint: {
                        'line-color': '#d1d5db',
                        'line-width': [
                            'interpolate', ['linear'], ['zoom'],
                            14, 1,
                            18, 4
                        ],
                        'line-dasharray': [2, 2],
                        'line-opacity': 0.9
                    }
                })

                console.log('Road layers added successfully')
            } catch (e) {
                console.log('Could not add road layers:', e)
            }

            // ============ PARKS & GREEN AREAS ============
            try {
                map.current.addLayer({
                    id: 'campus-parks',
                    source: vectorSource,
                    'source-layer': 'landuse',
                    type: 'fill',
                    filter: ['in', ['get', 'class'], ['literal', ['park', 'grass', 'garden', 'meadow', 'recreation_ground']]],
                    paint: {
                        'fill-color': '#86efac',
                        'fill-opacity': 0.6
                    }
                }, 'campus-roads-outline')

                // Park outlines
                map.current.addLayer({
                    id: 'campus-parks-outline',
                    source: vectorSource,
                    'source-layer': 'landuse',
                    type: 'line',
                    filter: ['in', ['get', 'class'], ['literal', ['park', 'grass', 'garden']]],
                    paint: {
                        'line-color': '#22c55e',
                        'line-width': 2,
                        'line-opacity': 0.8
                    }
                })
            } catch (e) {
                console.log('Could not add park layers')
            }

            // ============ WATER FEATURES ============
            try {
                map.current.addLayer({
                    id: 'campus-water',
                    source: vectorSource,
                    'source-layer': 'water',
                    type: 'fill',
                    paint: {
                        'fill-color': '#7dd3fc',
                        'fill-opacity': 0.7
                    }
                }, 'campus-roads-outline')
            } catch (e) { }

            // ============ 3D BUILDINGS WITH FORCED HEIGHT ============
            try {
                map.current.addLayer({
                    id: '3d-buildings-forced',
                    source: vectorSource,
                    'source-layer': 'building',
                    type: 'fill-extrusion',
                    minzoom: 14,
                    paint: {
                        'fill-extrusion-color': [
                            'case',
                            ['has', 'colour'], ['get', 'colour'],
                            ['==', ['get', 'building'], 'university'], '#3b82f6',
                            ['==', ['get', 'building'], 'college'], '#8b5cf6',
                            ['==', ['get', 'building'], 'school'], '#22c55e',
                            ['==', ['get', 'building'], 'hospital'], '#ef4444',
                            ['==', ['get', 'building'], 'hotel'], '#f59e0b',
                            ['==', ['get', 'building'], 'commercial'], '#06b6d4',
                            ['==', ['get', 'building'], 'residential'], '#64748b',
                            ['==', ['get', 'building'], 'apartments'], '#ec4899',
                            '#6366f1'
                        ],
                        'fill-extrusion-height': [
                            'interpolate', ['linear'], ['zoom'],
                            14, 0,
                            15, ['max', FORCED_BUILDING_HEIGHT, ['coalesce', ['get', 'render_height'], ['get', 'height'], FORCED_BUILDING_HEIGHT]]
                        ],
                        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                        'fill-extrusion-opacity': 0.92
                    }
                })
            } catch (e) {
                console.error('Error adding 3D layer:', e)
            }

            // ============ BUILDING OUTLINES ============
            try {
                map.current.addLayer({
                    id: 'building-outlines',
                    source: vectorSource,
                    'source-layer': 'building',
                    type: 'line',
                    minzoom: 15,
                    paint: {
                        'line-color': '#ffffff',
                        'line-width': 1,
                        'line-opacity': 0.6
                    }
                })
            } catch (e) { }

            // Click on buildings
            map.current.on('click', '3d-buildings-forced', (e) => {
                if (e.features && e.features[0]) {
                    const props = e.features[0].properties || {}
                    if (onBuildingClick) {
                        onBuildingClick({
                            id: props.name || 'Building',
                            name: props.name || 'Campus Building',
                            dept: props.building || 'Building',
                            icon: '🏢',
                            floors: 7,
                            color: '#6366f1'
                        })
                    }
                }
            })

            // Hover effects
            map.current.on('mouseenter', '3d-buildings-forced', (e) => {
                if (map.current) map.current.getCanvas().style.cursor = 'pointer'
                if (e.features && e.features[0]) {
                    const props = e.features[0].properties || {}
                    setHoveredBuilding({
                        name: props.name || 'Building',
                        type: props.building || 'building',
                        height: FORCED_BUILDING_HEIGHT
                    })
                }
            })
            map.current.on('mouseleave', '3d-buildings-forced', () => {
                if (map.current) map.current.getCanvas().style.cursor = ''
                setHoveredBuilding(null)
            })
        })

        return () => {
            if (map.current) {
                map.current.remove()
                map.current = null
            }
        }
    }, [onBuildingClick])

    // Street View movement
    const moveCamera = useCallback(() => {
        if (!map.current || !isFirstPerson) return

        const speed = 0.00015
        const rotateSpeed = 2.0
        let moved = false

        const center = map.current.getCenter()
        const bearing = map.current.getBearing()
        const bearingRad = (bearing * Math.PI) / 180

        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
            center.lng += Math.sin(bearingRad) * speed
            center.lat += Math.cos(bearingRad) * speed
            moved = true
        }
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
            center.lng -= Math.sin(bearingRad) * speed
            center.lat -= Math.cos(bearingRad) * speed
            moved = true
        }
        if (keysPressed.current.has('a')) {
            center.lng -= Math.cos(bearingRad) * speed
            center.lat += Math.sin(bearingRad) * speed
            moved = true
        }
        if (keysPressed.current.has('d')) {
            center.lng += Math.cos(bearingRad) * speed
            center.lat -= Math.sin(bearingRad) * speed
            moved = true
        }
        if (keysPressed.current.has('arrowleft') || keysPressed.current.has('q')) {
            map.current.setBearing(bearing - rotateSpeed)
            moved = true
        }
        if (keysPressed.current.has('arrowright') || keysPressed.current.has('e')) {
            map.current.setBearing(bearing + rotateSpeed)
            moved = true
        }

        if (moved) map.current.setCenter(center)
        animationRef.current = requestAnimationFrame(moveCamera)
    }, [isFirstPerson])

    // Keyboard handlers
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase()
            if (key === ' ') {
                e.preventDefault()
                setIsFirstPerson(prev => !prev)
                return
            }
            if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
                e.preventDefault()
                keysPressed.current.add(key)
            }
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase())
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [])

    // Toggle street view mode
    useEffect(() => {
        if (isFirstPerson) {
            map.current?.easeTo({ pitch: 85, zoom: 19, duration: 1000 })
            animationRef.current = requestAnimationFrame(moveCamera)
        } else {
            map.current?.easeTo({ pitch: 55, zoom: 16, duration: 1000 })
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
    }, [isFirstPerson, moveCamera])

    // Search - fly to location
    useEffect(() => {
        if (!map.current || !searchQuery) return

        const locations: Record<string, [number, number]> = {
            'admin': [76.5770, 30.7721],
            'library': [76.5734, 30.7692],
            'hostel': [76.5725, 30.7665],
            'cafeteria': [76.5735, 30.7678],
            'sports': [76.5811, 30.7717],
            'gate': [76.5766, 30.7640],
            'a1': [76.5726, 30.7715],
            'b1': [76.5726, 30.7700],
            'c1': [76.5786, 30.7715],
            'd1': [76.5726, 30.7683],
        }

        const query = searchQuery.toLowerCase()
        for (const [key, coords] of Object.entries(locations)) {
            if (query.includes(key)) {
                map.current.flyTo({ center: coords, zoom: 18, pitch: 60, duration: 1500 })
                break
            }
        }
    }, [searchQuery])

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Street View Toggle */}
            <button
                onClick={() => setIsFirstPerson(!isFirstPerson)}
                className={`absolute top-4 right-4 z-10 px-5 py-3 rounded-2xl shadow-xl font-medium transition-all flex items-center gap-2 ${isFirstPerson ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
            >
                {isFirstPerson ? <>🚶 Street View</> : <>🦅 Bird Eye View</>}
            </button>

            {/* Hover Tooltip */}
            {hoveredBuilding && !isFirstPerson && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl shadow-2xl px-5 py-4 pointer-events-none">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-indigo-100">
                            🏢
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-lg">{hoveredBuilding.name}</p>
                            <p className="text-sm text-gray-500">{hoveredBuilding.type}</p>
                            <p className="text-xs text-gray-400 mt-1">~{hoveredBuilding.height}m (7 floors)</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Controls Panel */}
            {isFirstPerson && (
                <div className="absolute bottom-6 left-4 z-10 bg-black/85 text-white rounded-2xl p-5 backdrop-blur-sm shadow-2xl">
                    <p className="font-bold mb-3 text-lg">🚶 Street View Controls</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">W / ↑</span><span>Walk Forward</span>
                        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">S / ↓</span><span>Walk Back</span>
                        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">A / D</span><span>Strafe</span>
                        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">Q / E</span><span>Look Around</span>
                        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">🖱️ Drag</span><span>Free Look</span>
                        <span className="font-mono bg-white/20 px-2 py-0.5 rounded">SPACE</span><span>Exit</span>
                    </div>
                </div>
            )}

            {/* Campus Label */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-white/95 backdrop-blur-sm px-5 py-3 rounded-2xl shadow-lg">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🎓</span>
                        <div>
                            <p className="font-bold text-gray-800">Chandigarh University</p>
                            <p className="text-xs text-gray-500">3D Campus Map (OSM Buildings)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mode Indicator */}
            <div className="absolute bottom-6 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 text-sm text-gray-600 z-10 shadow-lg">
                {isFirstPerson ? '🚶 Street View' : '🦅 Bird Eye'} | SPACE to toggle
            </div>
        </div>
    )
}
