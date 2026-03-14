'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Chandigarh University Campus Center
const CU_CENTER: [number, number] = [76.5766, 30.7699]

// CU Campus Boundary
const CU_CAMPUS_BOUNDARY: [number, number][] = [
    [76.5680, 30.7750],
    [76.5850, 30.7750],
    [76.5850, 30.7630],
    [76.5680, 30.7630],
    [76.5680, 30.7750],
]

const OUTER_BOUNDS: [number, number][] = [
    [76.40, 30.90],
    [76.80, 30.90],
    [76.80, 30.60],
    [76.40, 30.60],
    [76.40, 30.90],
]

// 7 floors × 4 m per floor = 28 m minimum enforced height
const FORCED_BUILDING_HEIGHT = 28

// Category color palette - vibrant, distinct colors
const CATEGORY_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
    '#a855f7', '#eab308', '#22c55e', '#3b82f6', '#fb923c',
]

export interface Place {
    id: string
    name: string
    description?: string
    latitude?: number
    longitude?: number
    category?: {
        id: string
        categoryName: string
        icon?: string
    }
    block?: {
        id: string
        name: string
    }
    photos?: { photoUrl: string }[]
    approvalStatus: string
}

export interface Category {
    id: string
    categoryName: string
    icon?: string
    placeCount?: number
}

interface Props {
    places?: Place[]
    categories?: Category[]
    selectedCategoryIds?: string[]
    searchQuery?: string
    pinDropMode?: boolean
    flyToPlace?: Place | null
    selectedPlace?: Place | null
    onMapClick?: (lat: number, lng: number) => void
    onPlaceClick?: (place: Place) => void
}

export default function MapLibreCampusMap({
    places = [],
    categories = [],
    selectedCategoryIds = [],
    searchQuery = '',
    pinDropMode = false,
    flyToPlace,
    selectedPlace,
    onMapClick,
    onPlaceClick,
}: Props) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)
    const markersRef = useRef<{ [id: string]: maplibregl.Marker }>({})
    const [isFirstPerson, setIsFirstPerson] = useState(false)
    const keysPressed = useRef<Set<string>>(new Set())
    const animationRef = useRef<number | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [isSatellite, setIsSatellite] = useState(false)
    const layersAdded = useRef(false)
    const userLocation = useRef<{ lat: number; lng: number } | null>(null)

    // Map from category id to stable color
    const categoryColorMap = useRef<Map<string, string>>(new Map())

    const getCategoryColor = useCallback((catId: string) => {
        if (!categoryColorMap.current.has(catId)) {
            const idx = categoryColorMap.current.size % CATEGORY_COLORS.length
            categoryColorMap.current.set(catId, CATEGORY_COLORS[idx])
        }
        return categoryColorMap.current.get(catId)!
    }, [])

    // ── Setup custom layers (campus mask, roads, 3D buildings) ──────────────
    const setupCustomLayers = useCallback((m: maplibregl.Map) => {
        if (layersAdded.current) return
        layersAdded.current = true

        const style = m.getStyle()
        const sources = style.sources || {}
        const layers = style.layers || []

        // For satellite mode we add an openmaptiles vector source ourselves for buildings
        let vectorSource = 'openmaptiles'
        for (const name of Object.keys(sources)) {
            if (name.includes('openmaptiles') || name.includes('maptiler') || name === 'composite') {
                vectorSource = name; break
            }
        }

        // If the vector source doesn't exist yet (satellite mode), add it
        if (!sources[vectorSource]) {
            try {
                m.addSource('openmaptiles', {
                    type: 'vector',
                    url: 'https://tiles.openfreemap.org/planet'
                })
                vectorSource = 'openmaptiles'
            } catch (e) { }
        }

        // Remove flat building layers (only applies on vector styles)
        for (const layer of layers) {
            if (layer.id.includes('building') && (layer.type === 'fill')) {
                try { m.removeLayer(layer.id) } catch (e) { }
            }
        }

        // Campus mask (only on non-satellite)
        if (!m.getSource('campus-mask')) {
            m.addSource('campus-mask', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [OUTER_BOUNDS, CU_CAMPUS_BOUNDARY] } }
            })
        }
        if (!m.getLayer('campus-mask-layer')) {
            m.addLayer({
                id: 'campus-mask-layer', type: 'fill', source: 'campus-mask',
                paint: { 'fill-color': '#0f172a', 'fill-opacity': isSatellite ? 0 : 0.88 }
            })
        }

        // Campus boundary
        if (!m.getSource('campus-boundary')) {
            m.addSource('campus-boundary', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: CU_CAMPUS_BOUNDARY } }
            })
        }
        if (!m.getLayer('campus-boundary-glow')) {
            m.addLayer({ id: 'campus-boundary-glow', type: 'line', source: 'campus-boundary', paint: { 'line-color': '#6366f1', 'line-width': 8, 'line-opacity': 0.4, 'line-blur': 4 } })
            m.addLayer({ id: 'campus-boundary-line', type: 'line', source: 'campus-boundary', paint: { 'line-color': '#818cf8', 'line-width': 2.5, 'line-opacity': 0.95 } })
        }

        // Roads (only on non-satellite, satellite already shows roads)
        if (!isSatellite) {
            try {
                if (!m.getLayer('campus-roads-border')) {
                    m.addLayer({ id: 'campus-roads-border', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 12, paint: { 'line-color': '#94a3b8', 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1.5, 14, 4, 16, 10, 18, 20, 20, 36], 'line-opacity': 0.7 } })
                    m.addLayer({ id: 'campus-roads-fill', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 12, paint: { 'line-color': '#e2e8f0', 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1, 14, 3, 16, 8, 18, 16, 20, 30], 'line-opacity': 1 } })
                    m.addLayer({ id: 'campus-paths', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 14, filter: ['any', ['==', ['get', 'class'], 'path'], ['==', ['get', 'class'], 'footway'], ['==', ['get', 'class'], 'pedestrian']], paint: { 'line-color': '#cbd5e1', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1, 18, 3], 'line-dasharray': [2, 2], 'line-opacity': 0.8 } })
                }
            } catch (e) { }
            try {
                if (!m.getLayer('campus-parks')) m.addLayer({ id: 'campus-parks', source: vectorSource, 'source-layer': 'landuse', type: 'fill', filter: ['in', ['get', 'class'], ['literal', ['park', 'grass', 'garden', 'meadow', 'recreation_ground']]], paint: { 'fill-color': '#4ade80', 'fill-opacity': 0.25 } })
            } catch (e) { }
            try {
                if (!m.getLayer('campus-water')) m.addLayer({ id: 'campus-water', source: vectorSource, 'source-layer': 'water', type: 'fill', paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.4 } })
            } catch (e) { }
        }

        // 3D Buildings
        try {
            if (!m.getLayer('3d-buildings')) {
                m.addLayer({
                    id: '3d-buildings', source: vectorSource, 'source-layer': 'building',
                    type: 'fill-extrusion', minzoom: 14,
                    paint: {
                        'fill-extrusion-color': ['case',
                            ['has', 'colour'], ['get', 'colour'],
                            ['==', ['get', 'building'], 'university'], '#3b82f6',
                            ['==', ['get', 'building'], 'college'], '#8b5cf6',
                            ['==', ['get', 'building'], 'school'], '#22c55e',
                            ['==', ['get', 'building'], 'hospital'], '#ef4444',
                            ['==', ['get', 'building'], 'hotel'], '#f59e0b',
                            ['==', ['get', 'building'], 'commercial'], '#06b6d4',
                            ['==', ['get', 'building'], 'retail'], '#f97316',
                            ['==', ['get', 'building'], 'residential'], '#64748b',
                            '#6366f1'
                        ],
                        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['max', FORCED_BUILDING_HEIGHT, ['coalesce', ['get', 'render_height'], ['*', ['coalesce', ['get', 'building:levels'], 7], 4], ['get', 'height'], FORCED_BUILDING_HEIGHT]]],
                        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                        'fill-extrusion-opacity': isSatellite ? 0.75 : 0.9,
                    }
                })
            }
        } catch (e) { console.error('3D buildings error:', e) }

        // Building outlines
        try {
            if (!m.getLayer('building-outlines')) {
                m.addLayer({ id: 'building-outlines', source: vectorSource, 'source-layer': 'building', type: 'line', minzoom: 15, paint: { 'line-color': '#a5b4fc', 'line-width': 1, 'line-opacity': 0.5 } })
            }
        } catch (e) { }

        setMapLoaded(true)
    }, [isSatellite])

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || map.current) return

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: CU_CENTER,
            zoom: 16,
            minZoom: 14,
            maxZoom: 20,
            pitch: 55,
            bearing: -17.6,
            maxPitch: 85,
            dragRotate: true,
            maxBounds: [[76.5620, 30.7580], [76.5920, 30.7800]]
        })

        map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }), 'bottom-right')

        const gc = new maplibregl.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: true,
            showAccuracyCircle: false
        })
        map.current.addControl(gc, 'bottom-right')

        gc.on('geolocate', (e: any) => {
            userLocation.current = { lat: e.coords.latitude, lng: e.coords.longitude }
            window.dispatchEvent(new CustomEvent('userLocationUpdate'))
        })

        // Handle missing style images (like "sports_centre") to prevent console warnings
        map.current.on('styleimagemissing', (e) => {
            const id = e.id;
            // Create a transparent 1x1 pixel image
            const width = 1;
            const height = 1;
            const data = new Uint8Array(width * height * 4);
            map.current?.addImage(id, { width, height, data });
        });

        map.current.on('load', () => {
            if (!map.current) return
            setupCustomLayers(map.current)
        })

        return () => {
            if (map.current) { map.current.remove(); map.current = null }
        }
    }, [])

    // Satellite toggle handler
    const toggleSatellite = useCallback(() => {
        if (!map.current) return
        const next = !isSatellite
        setIsSatellite(next)
        layersAdded.current = false
        setMapLoaded(false)

        if (next) {
            // Satellite: Esri World Imagery raster + OpenFreeMap vector for buildings
            map.current.setStyle({
                version: 8,
                glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
                sources: {
                    'esri-satellite': {
                        type: 'raster',
                        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                        tileSize: 256,
                        attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics'
                    }
                },
                layers: [{ id: 'esri-satellite', type: 'raster', source: 'esri-satellite' }]
            } as maplibregl.StyleSpecification)
        } else {
            map.current.setStyle('https://tiles.openfreemap.org/styles/liberty')
        }

        // Re-add custom layers once the new style is loaded
        map.current.once('styledata', () => {
            if (map.current && map.current.isStyleLoaded()) {
                setupCustomLayers(map.current)
            } else {
                map.current?.once('idle', () => {
                    if (map.current) setupCustomLayers(map.current)
                })
            }
        })
    }, [isSatellite, setupCustomLayers])

    // Handle map click for pin-drop mode
    useEffect(() => {
        if (!map.current) return
        const handleClick = (e: maplibregl.MapMouseEvent) => {
            if (pinDropMode && onMapClick) {
                onMapClick(e.lngLat.lat, e.lngLat.lng)
            }
        }
        map.current.on('click', handleClick)
        return () => {
            map.current?.off('click', handleClick)
        }
    }, [pinDropMode, onMapClick])

    // Update cursor for pin-drop mode
    useEffect(() => {
        if (!map.current) return
        map.current.getCanvas().style.cursor = pinDropMode ? 'crosshair' : ''
    }, [pinDropMode])

    // Render place markers
    useEffect(() => {
        if (!map.current || !mapLoaded) return

        // Determine visible places
        const visiblePlaces = places.filter(p => {
            if (!p.latitude || !p.longitude) return false
            if (selectedCategoryIds.length > 0 && p.category) {
                return selectedCategoryIds.includes(p.category.id)
            }
            return true
        })

        const visibleIds = new Set(visiblePlaces.map(p => p.id))

        // Remove markers not in visible set
        for (const [id, marker] of Object.entries(markersRef.current)) {
            if (!visibleIds.has(id)) {
                marker.remove()
                delete markersRef.current[id]
            }
        }

        // Add/update markers
        for (const place of visiblePlaces) {
            if (markersRef.current[place.id]) continue

            const color = place.category ? getCategoryColor(place.category.id) : '#6366f1'
            const icon = place.category?.icon || '📍'

            // Custom marker element
            const el = document.createElement('div')
            el.className = 'place-marker'
            el.style.cssText = `
                width: 40px;
                height: 48px;
                cursor: pointer;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
            `
            const inner = document.createElement('div')
            inner.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
            `
            inner.innerHTML = `
                <div style="
                    width: 36px;
                    height: 36px;
                    background: ${color};
                    border-radius: 50% 50% 50% 4px;
                    transform: rotate(-45deg);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2.5px solid white;
                    box-shadow: 0 2px 12px ${color}66;
                    transition: all 0.2s ease;
                ">
                    <span style="transform: rotate(45deg); font-size: 16px; line-height: 1;">${icon}</span>
                </div>
                <div style="
                    width: 4px;
                    height: 4px;
                    background: ${color};
                    border-radius: 50%;
                    margin-top: 2px;
                    opacity: 0.6;
                "></div>
            `
            el.appendChild(inner)

            el.addEventListener('mouseenter', () => {
                inner.style.transform = 'scale(1.25) translateY(-4px)'
            })
            el.addEventListener('mouseleave', () => {
                inner.style.transform = 'scale(1) translateY(0)'
            })
            el.addEventListener('click', (e) => {
                e.stopPropagation()
                if (onPlaceClick) onPlaceClick(place)
                map.current?.flyTo({
                    center: [place.longitude!, place.latitude!],
                    zoom: Math.max(map.current.getZoom(), 17),
                    duration: 800,
                    essential: true
                })
            })

            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
                .setLngLat([place.longitude!, place.latitude!])
                .addTo(map.current!)

            markersRef.current[place.id] = marker
        }
    }, [places, selectedCategoryIds, mapLoaded, getCategoryColor, onPlaceClick])

    // Fly to selected place
    useEffect(() => {
        if (!map.current || !flyToPlace?.latitude || !flyToPlace?.longitude) return
        map.current.flyTo({
            center: [flyToPlace.longitude, flyToPlace.latitude],
            zoom: 18,
            pitch: 60,
            duration: 1200,
            essential: true
        })
    }, [flyToPlace])

    // Search - filter/fly to matching place
    useEffect(() => {
        if (!map.current || !searchQuery) return
        const q = searchQuery.toLowerCase()
        const match = places.find(p =>
            p.name.toLowerCase().includes(q) ||
            p.category?.categoryName.toLowerCase().includes(q)
        )
        if (match?.latitude && match?.longitude) {
            map.current.flyTo({
                center: [match.longitude, match.latitude],
                zoom: 18, pitch: 60, duration: 1200
            })
        }
    }, [searchQuery, places])

    // Street view keyboard movement
    const moveCamera = useCallback(() => {
        if (!map.current || !isFirstPerson) return
        const speed = 0.000035       // ~natural walking pace
        const rotateSpeed = 1.0      // slower, controlled turn
        let moved = false
        const center = map.current.getCenter()
        const bearing = map.current.getBearing()
        const bearingRad = (bearing * Math.PI) / 180

        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) {
            center.lng += Math.sin(bearingRad) * speed; center.lat += Math.cos(bearingRad) * speed; moved = true
        }
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) {
            center.lng -= Math.sin(bearingRad) * speed; center.lat -= Math.cos(bearingRad) * speed; moved = true
        }
        if (keysPressed.current.has('a')) {
            center.lng -= Math.cos(bearingRad) * speed; center.lat += Math.sin(bearingRad) * speed; moved = true
        }
        if (keysPressed.current.has('d')) {
            center.lng += Math.cos(bearingRad) * speed; center.lat -= Math.sin(bearingRad) * speed; moved = true
        }
        if (keysPressed.current.has('arrowleft') || keysPressed.current.has('q')) {
            map.current.setBearing(bearing - rotateSpeed); moved = true
        }
        if (keysPressed.current.has('arrowright') || keysPressed.current.has('e')) {
            map.current.setBearing(bearing + rotateSpeed); moved = true
        }
        if (moved) map.current.setCenter(center)
        animationRef.current = requestAnimationFrame(moveCamera)
    }, [isFirstPerson])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't intercept keys when user is typing in an input, textarea, or select
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select'
            if (isTyping) return

            const key = e.key.toLowerCase()
            if (key === ' ' && !pinDropMode) {
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
    }, [pinDropMode])

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

    const handleRemoveRoute = useCallback(() => {
        if (!map.current) return
        if (map.current.getSource('route')) {
            (map.current.getSource('route') as maplibregl.GeoJSONSource).setData({
                type: 'Feature',
                properties: {},
                geometry: { type: 'LineString', coordinates: [] }
            })
        }
    }, [])

    const drawRoute = useCallback(async (endLat: number, endLng: number) => {
        if (!map.current || !userLocation.current) return
        try {
            const start = userLocation.current
            const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${endLng},${endLat}?geometries=geojson`)
            if (!res.ok) return
            const data = await res.json()
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0].geometry
                
                if (map.current.getSource('route')) {
                    (map.current.getSource('route') as maplibregl.GeoJSONSource).setData({
                        type: 'Feature',
                        properties: {},
                        geometry: route
                    })
                } else {
                    map.current.addSource('route', {
                        type: 'geojson',
                        data: {
                            type: 'Feature',
                            properties: {},
                            geometry: route
                        }
                    })
                    map.current.addLayer({
                        id: 'route-line-outline',
                        type: 'line',
                        source: 'route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 }
                    })
                    map.current.addLayer({
                        id: 'route-line',
                        type: 'line',
                        source: 'route',
                        layout: { 'line-join': 'round', 'line-cap': 'round' },
                        paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 1 }
                    })
                }
            }
        } catch (err) {
            console.error('Routing error', err)
        }
    }, [])

    useEffect(() => {
        const checkAndDraw = () => {
            // We use flyToPlace as the trigger source so it also triggers when user hits "Fly To" in UI
            const targetPlace = flyToPlace || selectedPlace;
            if (targetPlace?.latitude && targetPlace?.longitude) {
                if (userLocation.current) {
                    drawRoute(targetPlace.latitude, targetPlace.longitude)
                } else {
                    navigator.geolocation.getCurrentPosition((pos) => {
                        userLocation.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                        drawRoute(targetPlace.latitude!, targetPlace.longitude!)
                    }, () => {
                        console.log('Location not available')
                    }, { enableHighAccuracy: true })
                }
            } else {
                handleRemoveRoute()
            }
        }
        checkAndDraw()
        const onUpdate = () => checkAndDraw()
        window.addEventListener('userLocationUpdate', onUpdate)
        return () => window.removeEventListener('userLocationUpdate', onUpdate)
    }, [selectedPlace, flyToPlace, drawRoute, handleRemoveRoute])

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Map Controls - top right cluster */}
            {!pinDropMode && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    {/* Satellite Toggle */}
                    <button
                        onClick={toggleSatellite}
                        className={`px-4 py-2.5 rounded-2xl shadow-xl font-semibold text-sm transition-all flex items-center gap-2 backdrop-blur-md border ${isSatellite
                            ? 'bg-indigo-500/90 border-indigo-400 text-white'
                            : 'bg-white/90 border-white/60 text-gray-700 hover:bg-white'
                            }`}
                        title="Toggle satellite view"
                    >
                        {isSatellite ? <><span>🗺️</span> Map</> : <><span>🛰️</span> Satellite</>}
                    </button>

                    {/* Street View Toggle */}
                    <button
                        onClick={() => setIsFirstPerson(!isFirstPerson)}
                        className={`px-4 py-2.5 rounded-2xl shadow-xl font-semibold text-sm transition-all flex items-center gap-2 backdrop-blur-md border ${isFirstPerson
                            ? 'bg-indigo-500/90 border-indigo-400 text-white'
                            : 'bg-white/90 border-white/60 text-gray-700 hover:bg-white'
                            }`}
                    >
                        {isFirstPerson ? <><span>🚶</span> Street View</> : <><span>🦅</span> Aerial</>}
                    </button>
                </div>
            )}

            {/* Street View Controls */}
            {isFirstPerson && (
                <div className="absolute bottom-20 left-4 z-10 bg-gray-900/90 text-white rounded-2xl p-4 backdrop-blur-sm shadow-2xl border border-white/10">
                    <p className="font-bold mb-3 text-sm text-indigo-300">🚶 Street View Controls</p>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
                        <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-center">W / ↑</span><span className="text-gray-300">Forward</span>
                        <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-center">S / ↓</span><span className="text-gray-300">Backward</span>
                        <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-center">A / D</span><span className="text-gray-300">Strafe</span>
                        <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-center">Q / E</span><span className="text-gray-300">Rotate</span>
                        <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-center">SPACE</span><span className="text-gray-300">Exit</span>
                    </div>
                </div>
            )}
        </div>
    )
}
