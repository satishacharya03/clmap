'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Chandigarh University Campus Center
const CU_CENTER: [number, number] = [76.5766, 30.7699]

const GATE_2_COORDS = { lat: 30.772796, lng: 76.576387 }

function isWithinCU(lat: number, lng: number) {
    return lat >= 30.7600 && lat <= 30.7800 && lng >= 76.5600 && lng <= 76.5900;
}

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

const FORCED_BUILDING_HEIGHT = 28

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
    reviews?: { id: string; rating: number; comment: string; createdAt: string; user: { name: string, id: string } }[]
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
    navigateToPlace?: Place | null
    pinnedCoords?: { lat: number; lng: number } | null
    selectedPlace?: Place | null
    onMapClick?: (lat: number, lng: number) => void
    onPlaceClick?: (place: Place) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Draw a pin into the map's image registry using Canvas.
//
// WHY CANVAS INSTEAD OF HTML MARKERS?
// HTML markers are positioned as CSS overlays on top of the WebGL canvas.
// MapLibre projects their lat/lng → screen pixel using a 2D Mercator formula,
// which does NOT account for the 3D perspective offset introduced by the
// pitch angle. With pitch=55° and 28 m tall buildings, a building's visual
// face can be ~30-50 screen pixels higher than its ground coordinate, so
// HTML markers appear to "drift" relative to buildings when you drag.
//
// Symbol layers (type:'symbol') are rendered INSIDE the WebGL pipeline, so
// they share the exact same 3D view matrix as the building extrusions.
// They will NEVER drift, regardless of pitch, zoom, bearing, or drag.
// ─────────────────────────────────────────────────────────────────────────────
const REGISTERED_IMAGES = new Set<string>()
function ensurePinImage(
    m: maplibregl.Map,
    imageId: string,
    color: string,
    emoji: string,
    selected = false,
) {
    if (m.hasImage(imageId)) return

    // Pin canvas: viewBox (0,0,40,52) at 2× pixel ratio
    const W = 40, H = 52, PR = 2
    const canvas = document.createElement('canvas')
    canvas.width = W * PR
    canvas.height = H * PR
    const ctx = canvas.getContext('2d')!
    ctx.scale(PR, PR)

    // ── Tail (draw under the circle so circle overlaps its top edge) ──
    ctx.beginPath()
    ctx.moveTo(9, 29)
    ctx.quadraticCurveTo(13, 42, 20, 52)
    ctx.quadraticCurveTo(27, 42, 31, 29)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()

    // ── Circle body ──
    ctx.beginPath()
    ctx.arc(20, 18, 17, 0, Math.PI * 2)
    ctx.fillStyle = 'white'
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = selected ? 3.5 : 2.5
    ctx.stroke()

    // ── Inner gloss ──
    ctx.beginPath()
    ctx.arc(20, 18, 11, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.fill()

    // ── Extra ring for selected ──
    if (selected) {
        ctx.beginPath()
        ctx.arc(20, 18, 17, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'
        ctx.lineWidth = 2.5
        ctx.stroke()
    }

    // ── Emoji icon ──
    ctx.font = `${15}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(emoji, 20, selected ? 17 : 18)

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    m.addImage(
        imageId,
        { width: canvas.width, height: canvas.height, data: new Uint8Array(imgData.data.buffer) },
        { pixelRatio: PR },
    )
    REGISTERED_IMAGES.add(imageId)
}

export default function MapLibreCampusMap({
    places = [],
    categories = [],
    selectedCategoryIds = [],
    searchQuery = '',
    pinDropMode = false,
    flyToPlace,
    navigateToPlace,
    pinnedCoords,
    selectedPlace,
    onMapClick,
    onPlaceClick,
}: Props) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<maplibregl.Map | null>(null)

    // Refs for values used inside MapLibre event handlers
    // (avoids stale closures without re-adding listeners constantly)
    const placesRef = useRef<Place[]>(places)
    const onPlaceClickRef = useRef<((p: Place) => void) | undefined>(onPlaceClick)
    placesRef.current = places
    onPlaceClickRef.current = onPlaceClick

    const pinnedMarkerRef = useRef<maplibregl.Marker | null>(null)
    const lineAnimRef = useRef<number | null>(null)
    const geolocateControlRef = useRef<maplibregl.GeolocateControl | null>(null)
    const [isFirstPerson, setIsFirstPerson] = useState(false)
    const keysPressed = useRef<Set<string>>(new Set())
    const animationRef = useRef<number | null>(null)
    const [mapLoaded, setMapLoaded] = useState(false)
    const [isSatellite, setIsSatellite] = useState(false)
    const layersAdded = useRef(false)
    const userLocation = useRef<{ lat: number; lng: number } | null>(null)
    const [navStatus, setNavStatus] = useState<'idle' | 'locating' | 'routing' | 'walking' | 'error'>('idle')

    const categoryColorMap = useRef<Map<string, string>>(new Map())
    const getCategoryColor = useCallback((catId: string) => {
        if (!categoryColorMap.current.has(catId)) {
            const idx = categoryColorMap.current.size % CATEGORY_COLORS.length
            categoryColorMap.current.set(catId, CATEGORY_COLORS[idx])
        }
        return categoryColorMap.current.get(catId)!
    }, [])

    // ── Setup map layers ────────────────────────────────────────────────────
    const setupCustomLayers = useCallback((m: maplibregl.Map) => {
        if (layersAdded.current) return
        layersAdded.current = true

        const style = m.getStyle()
        const sources = style.sources || {}
        const layers = style.layers || []

        let vectorSource = 'openmaptiles'
        for (const name of Object.keys(sources)) {
            if (name.includes('openmaptiles') || name.includes('maptiler') || name === 'composite') {
                vectorSource = name; break
            }
        }
        if (!sources[vectorSource]) {
            try {
                m.addSource('openmaptiles', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' })
                vectorSource = 'openmaptiles'
            } catch (e) { }
        }

        for (const layer of layers) {
            if (layer.id.includes('building') && (layer.type === 'fill')) {
                try { m.removeLayer(layer.id) } catch (e) { }
            }
        }

        if (!m.getSource('campus-mask')) {
            m.addSource('campus-mask', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [OUTER_BOUNDS, CU_CAMPUS_BOUNDARY] } }
            })
        }
        if (!m.getLayer('campus-mask-layer')) {
            m.addLayer({ id: 'campus-mask-layer', type: 'fill', source: 'campus-mask', paint: { 'fill-color': '#0f172a', 'fill-opacity': isSatellite ? 0 : 0.88 } })
        }
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
        if (!isSatellite) {
            try {
                if (!m.getLayer('campus-roads-border')) {
                    m.addLayer({ id: 'campus-roads-border', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 12, paint: { 'line-color': '#94a3b8', 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1.5, 14, 4, 16, 10, 18, 20, 20, 36], 'line-opacity': 0.7 } })
                    m.addLayer({ id: 'campus-roads-fill', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 12, paint: { 'line-color': '#e2e8f0', 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, 1, 14, 3, 16, 8, 18, 16, 20, 30], 'line-opacity': 1 } })
                    m.addLayer({ id: 'campus-paths', source: vectorSource, 'source-layer': 'transportation', type: 'line', minzoom: 14, filter: ['any', ['==', ['get', 'class'], 'path'], ['==', ['get', 'class'], 'footway'], ['==', ['get', 'class'], 'pedestrian']], paint: { 'line-color': '#cbd5e1', 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 1, 18, 3], 'line-dasharray': [2, 2], 'line-opacity': 0.8 } })
                }
            } catch (e) { }
            try { if (!m.getLayer('campus-parks')) m.addLayer({ id: 'campus-parks', source: vectorSource, 'source-layer': 'landuse', type: 'fill', filter: ['in', ['get', 'class'], ['literal', ['park', 'grass', 'garden', 'meadow', 'recreation_ground']]], paint: { 'fill-color': '#4ade80', 'fill-opacity': 0.25 } }) } catch (e) { }
            try { if (!m.getLayer('campus-water')) m.addLayer({ id: 'campus-water', source: vectorSource, 'source-layer': 'water', type: 'fill', paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.4 } }) } catch (e) { }
        }
        try {
            if (!m.getLayer('3d-buildings')) {
                m.addLayer({
                    id: '3d-buildings', source: vectorSource, 'source-layer': 'building',
                    type: 'fill-extrusion', minzoom: 14,
                    paint: {
                        'fill-extrusion-color': ['case', ['has', 'colour'], ['get', 'colour'], ['==', ['get', 'building'], 'university'], '#3b82f6', ['==', ['get', 'building'], 'college'], '#8b5cf6', ['==', ['get', 'building'], 'school'], '#22c55e', ['==', ['get', 'building'], 'hospital'], '#ef4444', ['==', ['get', 'building'], 'hotel'], '#f59e0b', ['==', ['get', 'building'], 'commercial'], '#06b6d4', ['==', ['get', 'building'], 'retail'], '#f97316', ['==', ['get', 'building'], 'residential'], '#64748b', '#6366f1'],
                        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, ['max', FORCED_BUILDING_HEIGHT, ['coalesce', ['get', 'render_height'], ['*', ['coalesce', ['get', 'building:levels'], 7], 4], ['get', 'height'], FORCED_BUILDING_HEIGHT]]],
                        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                        'fill-extrusion-opacity': isSatellite ? 0.75 : 0.9,
                    }
                })
            }
        } catch (e) { console.error('3D buildings error:', e) }
        try { if (!m.getLayer('building-outlines')) m.addLayer({ id: 'building-outlines', source: vectorSource, 'source-layer': 'building', type: 'line', minzoom: 15, paint: { 'line-color': '#a5b4fc', 'line-width': 1, 'line-opacity': 0.5 } }) } catch (e) { }

        // ── GeoJSON source + Symbol layer for place pins ──────────────────
        // This is the key fix: symbol layers are rendered in WebGL and share
        // the exact 3D projection with buildings — zero drift on pitch/drag.
        if (!m.getSource('places-source')) {
            m.addSource('places-source', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] },
            })
        }
        if (!m.getLayer('places-layer')) {
            m.addLayer({
                id: 'places-layer',
                type: 'symbol',
                source: 'places-source',
                layout: {
                    'icon-image': ['get', 'iconId'],
                    'icon-anchor': 'bottom',
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'icon-size': ['interpolate', ['linear'], ['zoom'], 14, 0.7, 17, 1.0, 20, 1.3],
                    'icon-padding': 0,
                },
            })
        }

        // Click on a place pin
        m.on('click', 'places-layer', (e) => {
            if (!e.features?.length) return
            const id = e.features[0].properties?.id
            const place = placesRef.current.find(p => p.id === id)
            if (!place) return
            onPlaceClickRef.current?.(place)
            m.flyTo({
                center: [place.longitude!, place.latitude!],
                zoom: Math.max(m.getZoom(), 17),
                duration: 800,
                essential: true,
            })
        })

        // Pointer cursor on hover
        m.on('mouseenter', 'places-layer', () => {
            m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', 'places-layer', () => {
            if (!pinDropMode) m.getCanvas().style.cursor = ''
        })

        setMapLoaded(true)
    }, [isSatellite]) // eslint-disable-line react-hooks/exhaustive-deps

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
            bearing: 180,
            maxPitch: 85,
            dragRotate: true,
            maxBounds: [
                [76.56, 30.76],
                [76.59, 30.78]
            ],
        })
        map.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showCompass: true, showZoom: true }), 'bottom-right')
        
        const gc = new maplibregl.GeolocateControl({ 
            positionOptions: { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 }, 
            trackUserLocation: true, 
            showAccuracyCircle: true,
            showUserLocation: true 
        })
        geolocateControlRef.current = gc
        map.current.addControl(gc, 'bottom-right')
        
        gc.on('geolocate', (e: any) => {
            let lat = e.coords.latitude;
            let lng = e.coords.longitude;
            if (!isWithinCU(lat, lng)) {
                lat = GATE_2_COORDS.lat;
                lng = GATE_2_COORDS.lng;
            }
            userLocation.current = { lat, lng }
            window.dispatchEvent(new CustomEvent('userLocationUpdate'))
        })
        map.current.on('styleimagemissing', (e) => {
            const data = new Uint8Array(4)
            map.current?.addImage(e.id, { width: 1, height: 1, data })
        })
        map.current.on('load', () => {
            if (!map.current) return
            setupCustomLayers(map.current)
        })
        return () => { if (map.current) { map.current.remove(); map.current = null } }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Satellite toggle
    const toggleSatellite = useCallback(() => {
        if (!map.current) return
        const next = !isSatellite
        setIsSatellite(next)
        layersAdded.current = false
        setMapLoaded(false)
        REGISTERED_IMAGES.clear()
        if (next) {
            map.current.setStyle({
                version: 8,
                glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
                sources: { 'esri-satellite': { type: 'raster', tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], tileSize: 256, attribution: 'Tiles © Esri' } },
                layers: [{ id: 'esri-satellite', type: 'raster', source: 'esri-satellite' }]
            } as maplibregl.StyleSpecification)
        } else {
            map.current.setStyle('https://tiles.openfreemap.org/styles/liberty')
        }
        map.current.once('styledata', () => {
            if (map.current?.isStyleLoaded()) setupCustomLayers(map.current)
            else map.current?.once('idle', () => { if (map.current) setupCustomLayers(map.current) })
        })
    }, [isSatellite, setupCustomLayers])

    // Map click for pin-drop mode
    useEffect(() => {
        if (!map.current) return
        const handleClick = (e: maplibregl.MapMouseEvent) => {
            if (pinDropMode && onMapClick) onMapClick(e.lngLat.lat, e.lngLat.lng)
        }
        map.current.on('click', handleClick)
        return () => { map.current?.off('click', handleClick) }
    }, [pinDropMode, onMapClick])

    // Cursor for pin-drop
    useEffect(() => {
        if (!map.current) return
        map.current.getCanvas().style.cursor = pinDropMode ? 'crosshair' : ''
    }, [pinDropMode])

    // ── Update places symbol layer ─────────────────────────────────────────
    // Runs whenever places / filter / selected changes.
    // Draws canvas pin images into the map registry, then updates the
    // GeoJSON FeatureCollection — no HTML DOM manipulation involved.
    useEffect(() => {
        if (!map.current || !mapLoaded) return
        const m = map.current
        if (!m.getSource('places-source')) return

        const visible = places.filter(p => {
            if (!p.latitude || !p.longitude) return false
            if (selectedCategoryIds.length > 0 && p.category) return selectedCategoryIds.includes(p.category.id)
            return true
        })

        // Register canvas images for each unique category (normal + selected variant)
        for (const place of visible) {
            const color = place.category ? getCategoryColor(place.category.id) : '#6366f1'
            const emoji = place.category?.icon || '📍'
            const catKey = place.category?.id || 'default'
            ensurePinImage(m, `pin-${catKey}`, color, emoji, false)
            ensurePinImage(m, `pin-${catKey}-sel`, color, emoji, true)
        }

        const geojson: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features: visible.map(p => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [p.longitude!, p.latitude!] },
                properties: {
                    id: p.id,
                    name: p.name,
                    iconId: p.id === selectedPlace?.id
                        ? `pin-${p.category?.id || 'default'}-sel`
                        : `pin-${p.category?.id || 'default'}`,
                },
            })),
        }
        ;(m.getSource('places-source') as maplibregl.GeoJSONSource).setData(geojson)
    }, [places, selectedCategoryIds, mapLoaded, selectedPlace, getCategoryColor])

    // Fly to selected place
    useEffect(() => {
        if (!map.current || !flyToPlace?.latitude || !flyToPlace?.longitude) return
        map.current.flyTo({ center: [flyToPlace.longitude, flyToPlace.latitude], zoom: 18, pitch: 60, duration: 1200, essential: true })
    }, [flyToPlace])

    // Pin-drop temporary marker (stays as HTML — it's ephemeral, one at a time)
    useEffect(() => {
        if (!map.current || !mapLoaded) return
        if (pinnedCoords) {
            const makeEl = () => {
                const wrap = document.createElement('div')
                wrap.style.cssText = 'pointer-events:none;'
                const inner = document.createElement('div')
                inner.style.cssText = 'transform-origin:center bottom;animation:pinBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1);'
                inner.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" width="44" height="57">
                  <path d="M9,29 Q13,42 20,52 Q27,42 31,29 Z" fill="#6366f1"/>
                  <circle cx="20" cy="18" r="17" fill="#6366f1" stroke="white" stroke-width="3"/>
                  <circle cx="20" cy="18" r="11" fill="rgba(255,255,255,0.25)"/>
                  <circle cx="20" cy="18" r="17" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="2.5"/>
                  <text x="20" y="23" text-anchor="middle" font-size="14" font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">📍</text>
                </svg>`
                wrap.appendChild(inner)
                return wrap
            }
            if (!pinnedMarkerRef.current) {
                pinnedMarkerRef.current = new maplibregl.Marker({ element: makeEl(), anchor: 'bottom' })
                    .setLngLat([pinnedCoords.lng, pinnedCoords.lat])
                    .addTo(map.current!)
            } else {
                pinnedMarkerRef.current.setLngLat([pinnedCoords.lng, pinnedCoords.lat])
            }
        } else {
            pinnedMarkerRef.current?.remove()
            pinnedMarkerRef.current = null
        }
    }, [pinnedCoords, mapLoaded])

    // Search fly-to
    useEffect(() => {
        if (!map.current || !searchQuery) return
        const q = searchQuery.toLowerCase()
        const match = places.find(p => p.name.toLowerCase().includes(q) || p.category?.categoryName.toLowerCase().includes(q))
        if (match?.latitude && match?.longitude) map.current.flyTo({ center: [match.longitude, match.latitude], zoom: 18, pitch: 60, duration: 1200 })
    }, [searchQuery, places])

    // Street view keyboard movement
    const moveCamera = useCallback(() => {
        if (!map.current || !isFirstPerson) return
        const speed = 0.000035, rotateSpeed = 1.0
        let moved = false
        const center = map.current.getCenter()
        const bearing = map.current.getBearing()
        const bearingRad = (bearing * Math.PI) / 180
        if (keysPressed.current.has('w') || keysPressed.current.has('arrowup')) { center.lng += Math.sin(bearingRad) * speed; center.lat += Math.cos(bearingRad) * speed; moved = true }
        if (keysPressed.current.has('s') || keysPressed.current.has('arrowdown')) { center.lng -= Math.sin(bearingRad) * speed; center.lat -= Math.cos(bearingRad) * speed; moved = true }
        if (keysPressed.current.has('a')) { center.lng -= Math.cos(bearingRad) * speed; center.lat += Math.sin(bearingRad) * speed; moved = true }
        if (keysPressed.current.has('d')) { center.lng += Math.cos(bearingRad) * speed; center.lat -= Math.sin(bearingRad) * speed; moved = true }
        if (keysPressed.current.has('arrowleft') || keysPressed.current.has('q')) { map.current.setBearing(bearing - rotateSpeed); moved = true }
        if (keysPressed.current.has('arrowright') || keysPressed.current.has('e')) { map.current.setBearing(bearing + rotateSpeed); moved = true }
        if (moved) map.current.setCenter(center)
        animationRef.current = requestAnimationFrame(moveCamera)
    }, [isFirstPerson])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return
            const key = e.key.toLowerCase()
            if (key === ' ' && !pinDropMode) { e.preventDefault(); setIsFirstPerson(prev => !prev); return }
            if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) { e.preventDefault(); keysPressed.current.add(key) }
        }
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current.delete(e.key.toLowerCase()) }
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp) }
    }, [pinDropMode])

    useEffect(() => {
        if (isFirstPerson) {
            map.current?.easeTo({ pitch: 85, zoom: 19, duration: 1000 })
            animationRef.current = requestAnimationFrame(moveCamera)
        } else {
            map.current?.easeTo({ pitch: 55, zoom: 16, duration: 1000 })
            if (animationRef.current) cancelAnimationFrame(animationRef.current)
        }
        return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
    }, [isFirstPerson, moveCamera])

    const handleRemoveRoute = useCallback(() => {
        if (!map.current) return
        if (map.current.getSource('route-main')) {
            (map.current.getSource('route-main') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] })
        }
        if (map.current.getSource('route-walk')) {
            (map.current.getSource('route-walk') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features: [] })
        }
    }, [])

    const stopWalker = useCallback(() => {
        if (lineAnimRef.current) { cancelAnimationFrame(lineAnimRef.current); lineAnimRef.current = null }
        // Turn off navigation tracking if active
        if (geolocateControlRef.current && geolocateControlRef.current._watchState !== 'OFF') {
            geolocateControlRef.current.trigger() // Togging trigger when ON turns it OFF
        }
        setNavStatus('idle')
    }, [])

    const drawRoute = useCallback(async (endLat: number, endLng: number, animate = false) => {
        if (!map.current || !userLocation.current) return
        if (animate) setNavStatus('routing')
        try {
            const start = userLocation.current
            const res = await fetch(`https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${endLng},${endLat}?geometries=geojson`)
            if (!res.ok) { if (animate) setNavStatus('error'); return }
            const data = await res.json()
            if (data.routes?.length > 0) {
                const route = data.routes[0].geometry
                
                // OSRM snaps to the nearest mapped road, which can be ~100m away on a campus. 
                // We manually prepend the user's EXACT raw GPS coordinate, and append the EXACT 
                // building pin coordinate to the line so there is zero gap or misplacement shown.
                const coords: [number, number][] = [
                    [start.lng, start.lat],
                    ...route.coordinates,
                    [endLng, endLat]
                ]
                
                if (!map.current.getSource('route-main')) {
                    map.current.addSource('route-main', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
                    map.current.addSource('route-walk', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
                    
                    map.current.addLayer({ id: 'route-walk-outline', type: 'line', source: 'route-walk', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 0, 'line-opacity': 0 } })
                    map.current.addLayer({ id: 'route-walk-line', type: 'line', source: 'route-walk', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#3b82f6', 'line-width': 2.5, 'line-dasharray': [0.1, 2.5], 'line-opacity': 0.8 } })

                    map.current.addLayer({ id: 'route-main-outline', type: 'line', source: 'route-main', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 } })
                    map.current.addLayer({ id: 'route-main-line', type: 'line', source: 'route-main', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 1 } })
                }
                
                // 1. Animate line drawing
                const totalPoints = coords.length
                const routeMainSource = map.current.getSource('route-main') as maplibregl.GeoJSONSource
                const routeWalkSource = map.current.getSource('route-walk') as maplibregl.GeoJSONSource
                
                const drawDuration = 1200
                const startDrawTime = performance.now()
                
                map.current.flyTo({ center: coords[0], zoom: 17, pitch: 50, duration: 1500, essential: true })
                
                const animateLine = (now: number) => {
                    const progress = Math.max(0, Math.min((now - startDrawTime) / drawDuration, 1))
                    const currentFloatIndex = progress * (totalPoints - 1)
                    const currentIntIndex = Math.floor(currentFloatIndex)
                    
                    const currentCoords = coords.slice(0, currentIntIndex + 1)
                    if (currentIntIndex < totalPoints - 1) {
                        const ratio = currentFloatIndex - currentIntIndex
                        const p1 = coords[currentIntIndex]
                        const p2 = coords[currentIntIndex + 1]
                        currentCoords.push([
                            p1[0] + (p2[0] - p1[0]) * ratio,
                            p1[1] + (p2[1] - p1[1]) * ratio
                        ])
                    }
                    
                    const rdStart = 1;
                    const rdEnd = totalPoints - 2;
                    
                    const w1 = currentCoords.slice(0, 2);
                    const rd = currentCoords.length > rdStart ? currentCoords.slice(rdStart, Math.min(currentCoords.length, rdEnd + 1)) : [];
                    const w2 = currentCoords.length > rdEnd ? currentCoords.slice(rdEnd) : [];
                    
                    const walkFeatures: any[] = []
                    if (w1.length >= 2) walkFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: w1 } })
                    if (w2.length >= 2) walkFeatures.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: w2 } })
                    
                    routeWalkSource.setData({ type: 'FeatureCollection', features: walkFeatures })
                    routeMainSource.setData({ type: 'FeatureCollection', features: rd.length >= 2 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: rd } }] : [] })
                    
                        if (progress < 1) {
                            lineAnimRef.current = requestAnimationFrame(animateLine)
                        } else {
                            // 2. Start Real GPS Tracking using MapLibre's built-in 'perfect' blue dot
                            setNavStatus('walking')
                            
                            // Trigger MapLibre's native GeolocateControl which perfectly 
                            // handles the blue dot, accuracy circle, and camera tracking!
                            if (geolocateControlRef.current && geolocateControlRef.current._watchState === 'OFF') {
                                geolocateControlRef.current.trigger()
                            }
                        }
                    }
                    lineAnimRef.current = requestAnimationFrame(animateLine)
            }
        } catch (err) { console.error('Routing error', err); if (animate) setNavStatus('error') }
    }, [stopWalker])

    useEffect(() => {
        if (!selectedPlace?.latitude || !selectedPlace?.longitude) { handleRemoveRoute(); stopWalker(); return }
        const draw = () => drawRoute(selectedPlace.latitude!, selectedPlace.longitude!, false)
        if (userLocation.current) draw()
        else navigator.geolocation.getCurrentPosition(pos => {
            let lat = pos.coords.latitude;
            let lng = pos.coords.longitude;
            if (!isWithinCU(lat, lng)) {
                lat = GATE_2_COORDS.lat;
                lng = GATE_2_COORDS.lng;
            }
            userLocation.current = { lat, lng };
            draw() 
        }, () => { }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
        const onLoc = () => draw()
        window.addEventListener('userLocationUpdate', onLoc)
        return () => window.removeEventListener('userLocationUpdate', onLoc)
    }, [selectedPlace, drawRoute, handleRemoveRoute, stopWalker])

    useEffect(() => {
        if (!navigateToPlace?.latitude || !navigateToPlace?.longitude) return
        setNavStatus('locating')
        const go = () => drawRoute(navigateToPlace.latitude!, navigateToPlace.longitude!, true)
        if (userLocation.current) go()
        else navigator.geolocation.getCurrentPosition(pos => {
            let lat = pos.coords.latitude;
            let lng = pos.coords.longitude;
            if (!isWithinCU(lat, lng)) {
                lat = GATE_2_COORDS.lat;
                lng = GATE_2_COORDS.lng;
            }
            userLocation.current = { lat, lng };
            go() 
        }, () => setNavStatus('error'), { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 })
    }, [navigateToPlace, drawRoute])

    return (
        <div className="w-full h-full relative">
            <div ref={mapContainer} className="w-full h-full" />

            {/* Navigation status overlay */}
            {navStatus !== 'idle' && (
                <div className="absolute top-[80px] right-4 z-50 pointer-events-none origin-top-right scale-90 md:scale-100">
                    {navStatus === 'locating' && <div className="bg-gray-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2.5"><div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /><span className="text-xs font-semibold">Getting location…</span></div>}
                    {navStatus === 'routing' && <div className="bg-gray-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-2.5"><div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" /><span className="text-xs font-semibold">Calculating route…</span></div>}
                    {navStatus === 'walking' && <div className="bg-gray-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-green-500/30 flex items-center gap-2.5"><div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.8)]" /><span className="text-xs font-semibold text-green-400">Navigating live…</span></div>}
                    {navStatus === 'error' && <div className="bg-red-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-red-500/30 flex items-center gap-2.5"><span className="text-sm">⚠️</span><span className="text-xs font-semibold">Location error. Enable GPS.</span></div>}
                </div>
            )}

            {/* Map Controls */}
            {!pinDropMode && (
                <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button onClick={toggleSatellite} className={`px-4 py-2.5 rounded-2xl shadow-xl font-semibold text-sm transition-all flex items-center gap-2 backdrop-blur-md border ${isSatellite ? 'bg-indigo-500/90 border-indigo-400 text-white' : 'bg-white/90 border-white/60 text-gray-700 hover:bg-white'}`} title="Toggle satellite view">
                        {isSatellite ? <><span>🗺️</span></> : <><span>🛰️</span></>}
                    </button>
                    <button onClick={() => setIsFirstPerson(!isFirstPerson)} className={`px-4 py-2.5 rounded-2xl shadow-xl font-semibold text-sm transition-all flex items-center gap-2 backdrop-blur-md border ${isFirstPerson ? 'bg-indigo-500/90 border-indigo-400 text-white' : 'bg-white/90 border-white/60 text-gray-700 hover:bg-white'}`}>
                        {isFirstPerson ? <><span>🚶</span></> : <><span>🦅</span></>}
                    </button>
                </div>
            )}

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

            {/* Map Styles including custom ping keyframe */}
            <style>{`
                @keyframes pinBounceIn {
                    0%   { transform: translateY(-24px) scale(0.7); opacity: 0; }
                    60%  { transform: translateY(4px) scale(1.08); opacity: 1; }
                    80%  { transform: translateY(-2px) scale(0.97); }
                    100% { transform: translateY(0) scale(1); }
                }
                @keyframes ping {
                    75%, 100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>
        </div>
    )
}
