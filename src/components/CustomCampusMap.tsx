'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ============================================
// CHANDIGARH UNIVERSITY - ENHANCED CAMPUS MAP
// With rotation, smooth zoom, and accurate shapes
// ============================================

// Building data with more accurate shapes
const BUILDINGS = [
    // A Blocks - Engineering (L-shaped and rectangular)
    {
        id: 'A1', name: 'Block A1', dept: 'CSE (2nd-4th Year)', icon: '💻', color: '#3b82f6',
        shape: [[22, 18], [34, 18], [34, 22], [28, 22], [28, 32], [22, 32]], floors: 5, type: 'academic'
    },
    {
        id: 'A2', name: 'Block A2', dept: 'Multimedia & VFX', icon: '🎬', color: '#8b5cf6',
        shape: [[36, 18], [46, 18], [46, 30], [36, 30]], floors: 4, type: 'academic'
    },
    {
        id: 'A3', name: 'Block A3', dept: 'English, Psychology', icon: '📖', color: '#06b6d4',
        shape: [[48, 20], [58, 20], [58, 30], [48, 30]], floors: 4, type: 'academic'
    },

    // B Blocks - Engineering
    {
        id: 'B1', name: 'Block B1', dept: 'Mechanical Engg', icon: '⚙️', color: '#f59e0b',
        shape: [[14, 36], [24, 36], [24, 48], [14, 48]], floors: 4, type: 'academic'
    },
    {
        id: 'B2', name: 'Block B2', dept: 'Electrical Engg', icon: '⚡', color: '#eab308',
        shape: [[26, 34], [36, 34], [36, 46], [26, 46]], floors: 4, type: 'academic'
    },
    {
        id: 'B3', name: 'Block B3', dept: 'Electronics & Comm', icon: '📡', color: '#f97316',
        shape: [[38, 36], [48, 36], [48, 46], [38, 46]], floors: 4, type: 'academic'
    },
    {
        id: 'B4', name: 'Block B4', dept: 'Civil, Aerospace', icon: '🏗️', color: '#ea580c',
        shape: [[50, 34], [62, 34], [62, 40], [56, 40], [56, 46], [50, 46]], floors: 5, type: 'academic'
    },

    // C Blocks
    {
        id: 'C1', name: 'Block C1', dept: 'CSE (1st Year)', icon: '🖥️', color: '#22c55e',
        shape: [[64, 18], [74, 18], [74, 30], [64, 30]], floors: 4, type: 'academic'
    },
    {
        id: 'C2', name: 'Block C2', dept: 'CSE (1st Year)', icon: '🖥️', color: '#16a34a',
        shape: [[76, 20], [84, 20], [84, 30], [76, 30]], floors: 4, type: 'academic'
    },
    {
        id: 'C3', name: 'Block C3', dept: 'Chemistry Dept', icon: '🧪', color: '#15803d',
        shape: [[64, 32], [74, 32], [74, 42], [64, 42]], floors: 4, type: 'academic'
    },

    // D Blocks - South Campus
    {
        id: 'D1', name: 'Block D1', dept: 'MBA Programs', icon: '📊', color: '#ec4899',
        shape: [[18, 56], [28, 56], [28, 66], [18, 66]], floors: 4, type: 'academic'
    },
    {
        id: 'D2', name: 'Block D2', dept: 'BBA Programs', icon: '💼', color: '#db2777',
        shape: [[30, 54], [40, 54], [40, 66], [30, 66]], floors: 4, type: 'academic'
    },
    {
        id: 'D3', name: 'Block D3', dept: 'Commerce & Finance', icon: '💰', color: '#be185d',
        shape: [[42, 56], [52, 56], [52, 66], [42, 66]], floors: 4, type: 'academic'
    },
    {
        id: 'D4', name: 'Block D4', dept: 'Hotel Management', icon: '🏨', color: '#9d174d',
        shape: [[54, 54], [64, 54], [64, 65], [54, 65]], floors: 3, type: 'academic'
    },
    {
        id: 'D5', name: 'Block D5', dept: 'Law (UILS)', icon: '⚖️', color: '#831843',
        shape: [[66, 56], [76, 56], [76, 66], [66, 66]], floors: 4, type: 'academic'
    },

    // DD Blocks - Sciences
    {
        id: 'DD1', name: 'Block DD1', dept: 'Mathematics', icon: '📐', color: '#7c3aed',
        shape: [[24, 70], [32, 70], [32, 78], [24, 78]], floors: 3, type: 'academic'
    },
    {
        id: 'DD2', name: 'Block DD2', dept: 'Physics Dept', icon: '⚛️', color: '#6d28d9',
        shape: [[34, 68], [42, 68], [42, 78], [34, 78]], floors: 3, type: 'academic'
    },
    {
        id: 'DD3', name: 'Block DD3', dept: 'Biotechnology', icon: '🧬', color: '#5b21b6',
        shape: [[44, 70], [52, 70], [52, 78], [44, 78]], floors: 3, type: 'academic'
    },

    // Facilities
    {
        id: 'admin', name: 'Admin Block', dept: 'Administration', icon: '🏛️', color: '#0ea5e9',
        shape: [[40, 4], [60, 4], [60, 14], [40, 14]], floors: 3, type: 'facility'
    },
    {
        id: 'library', name: 'Central Library', dept: '103K+ Books', icon: '📚', color: '#f59e0b',
        shape: [[4, 26], [12, 26], [12, 44], [4, 44]], floors: 6, type: 'facility'
    },
    {
        id: 'auditorium', name: 'Auditorium', dept: 'Events', icon: '🎭', color: '#a855f7',
        shape: [[78, 36], [90, 36], [90, 48], [78, 48]], floors: 2, type: 'facility'
    },
    {
        id: 'cafe1', name: 'Food Court', dept: 'Multi-cuisine', icon: '🍽️', color: '#ef4444',
        shape: [[4, 48], [14, 48], [14, 56], [4, 56]], floors: 2, type: 'facility'
    },
    {
        id: 'sports', name: 'Sports Complex', dept: 'Gym, Pool', icon: '⚽', color: '#22c55e',
        shape: [[80, 4], [94, 4], [94, 18], [80, 18]], floors: 2, type: 'facility'
    },
    {
        id: 'medical', name: 'Medical Center', dept: 'Healthcare', icon: '🏥', color: '#f43f5e',
        shape: [[4, 4], [12, 4], [12, 14], [4, 14]], floors: 2, type: 'facility'
    },
    {
        id: 'bank', name: 'SBI Bank', dept: 'ATM', icon: '🏧', color: '#1d4ed8',
        shape: [[4, 16], [12, 16], [12, 22], [4, 22]], floors: 1, type: 'facility'
    },

    // Hostels (taller buildings)
    {
        id: 'bh1', name: 'Boys Hostel 1', dept: '400 rooms', icon: '🏠', color: '#64748b',
        shape: [[4, 60], [10, 60], [10, 82], [4, 82]], floors: 8, type: 'hostel'
    },
    {
        id: 'bh2', name: 'Boys Hostel 2', dept: '350 rooms', icon: '🏠', color: '#475569',
        shape: [[12, 82], [26, 82], [26, 92], [12, 92]], floors: 6, type: 'hostel'
    },
    {
        id: 'gh1', name: 'Girls Hostel 1', dept: '450 rooms', icon: '🏠', color: '#ec4899',
        shape: [[88, 24], [96, 24], [96, 48], [88, 48]], floors: 9, type: 'hostel'
    },
    {
        id: 'gh2', name: 'Girls Hostel 2', dept: '400 rooms', icon: '🏠', color: '#db2777',
        shape: [[88, 52], [96, 52], [96, 72], [88, 72]], floors: 8, type: 'hostel'
    },

    // Infrastructure
    {
        id: 'gate1', name: 'Main Gate', dept: 'Entry', icon: '🚪', color: '#f97316',
        shape: [[45, 94], [55, 94], [55, 98], [45, 98]], floors: 1, type: 'infra'
    },
    {
        id: 'parking', name: 'Parking', dept: '500+ slots', icon: '🅿️', color: '#71717a',
        shape: [[14, 4], [24, 4], [24, 14], [14, 14]], floors: 1, type: 'infra'
    },
    {
        id: 'bus', name: 'Bus Stand', dept: 'Transport', icon: '🚌', color: '#0891b2',
        shape: [[26, 4], [36, 4], [36, 10], [26, 10]], floors: 1, type: 'infra'
    },
]

// Roads
const ROADS = [
    { points: [[50, 98], [50, 2]], main: true },
    { points: [[2, 50], [98, 50]], main: true },
    { points: [[2, 30], [98, 30]], main: false },
    { points: [[2, 70], [80, 70]], main: false },
    { points: [[20, 2], [20, 92]], main: false },
    { points: [[78, 2], [78, 76]], main: false },
]

// Gardens with circular/organic shapes
const GARDENS = [
    { cx: 66, cy: 10, r: 5 },
    { cx: 40, cy: 50, r: 4 },
    { cx: 72, cy: 76, r: 4 },
]

interface Building {
    id: string
    name: string
    dept: string
    icon: string
    color: string
    shape: number[][]
    floors: number
    type: string
}

interface Props {
    onBuildingClick?: (building: Building) => void
    selectedBuilding?: string | null
    searchQuery?: string
}

export default function CustomCampusMap({ onBuildingClick, selectedBuilding, searchQuery = '' }: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 })
    const [hovered, setHovered] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
    const [activeTab, setActiveTab] = useState<'all' | 'academic' | 'hostel' | 'facility'>('all')

    // Filter buildings
    const filteredBuildings = BUILDINGS.filter(b => {
        const matchesSearch = !searchQuery ||
            b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            b.dept.toLowerCase().includes(searchQuery.toLowerCase())
        if (!matchesSearch) return false
        switch (activeTab) {
            case 'academic': return b.type === 'academic'
            case 'hostel': return b.type === 'hostel'
            case 'facility': return b.type === 'facility' || b.type === 'infra'
            default: return true
        }
    })

    // Zoom with mouse wheel
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault()
        const rect = containerRef.current?.getBoundingClientRect()
        if (!rect) return

        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const delta = e.deltaY > 0 ? 0.9 : 1.1
        const newScale = Math.min(Math.max(transform.scale * delta, 0.5), 5)

        // Zoom towards mouse position
        const scaleChange = newScale / transform.scale
        setTransform(t => ({
            ...t,
            scale: newScale,
            x: mouseX - (mouseX - t.x) * scaleChange,
            y: mouseY - (mouseY - t.y) * scaleChange
        }))
    }, [transform.scale])

    useEffect(() => {
        const el = containerRef.current
        if (el) {
            el.addEventListener('wheel', handleWheel, { passive: false })
            return () => el.removeEventListener('wheel', handleWheel)
        }
    }, [handleWheel])

    // Pan with mouse drag
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return
        setIsDragging(true)
        setLastPos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        const dx = e.clientX - lastPos.x
        const dy = e.clientY - lastPos.y
        setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
        setLastPos({ x: e.clientX, y: e.clientY })
    }

    const handleMouseUp = () => setIsDragging(false)

    // Rotation
    const rotate = (deg: number) => {
        setTransform(t => ({ ...t, rotation: (t.rotation + deg) % 360 }))
    }

    // Reset view
    const resetView = () => {
        setTransform({ x: 0, y: 0, scale: 1, rotation: 0 })
    }

    // Get polygon points string
    const getPoints = (shape: number[][]) => shape.map(p => p.join(',')).join(' ')

    // Calculate centroid for label
    const getCentroid = (shape: number[][]) => {
        const x = shape.reduce((sum, p) => sum + p[0], 0) / shape.length
        const y = shape.reduce((sum, p) => sum + p[1], 0) / shape.length
        return { x, y }
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-gradient-to-br from-emerald-100 via-green-50 to-cyan-100 overflow-hidden relative select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
            {/* Filter Tabs */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1 bg-white/95 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl">
                {[
                    { key: 'all', label: 'All', icon: '🗺️' },
                    { key: 'academic', label: 'Academic', icon: '🏫' },
                    { key: 'hostel', label: 'Hostels', icon: '🏠' },
                    { key: 'facility', label: 'Facilities', icon: '🏛️' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${activeTab === tab.key ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Map SVG */}
            <svg
                viewBox="0 0 100 100"
                className="w-full h-full"
                style={{
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <defs>
                    <pattern id="campusGrass" width="3" height="3" patternUnits="userSpaceOnUse">
                        <rect width="3" height="3" fill="#d1fae5" />
                        <circle cx="1" cy="1" r="0.2" fill="#a7f3d0" />
                        <circle cx="2.5" cy="2.5" r="0.15" fill="#6ee7b7" />
                    </pattern>
                    <filter id="buildingShadow">
                        <feDropShadow dx="0.4" dy="0.4" stdDeviation="0.5" floodOpacity="0.25" />
                    </filter>
                    <filter id="glowEffect">
                        <feGaussianBlur stdDeviation="0.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Background */}
                <rect width="100" height="100" fill="url(#campusGrass)" />

                {/* Campus border */}
                <rect x="1" y="1" width="98" height="98" fill="none" stroke="#16a34a" strokeWidth="0.4" strokeDasharray="2,1" rx="3" />

                {/* Roads */}
                {ROADS.map((road, i) => (
                    <g key={i}>
                        <polyline
                            points={road.points.map(p => p.join(',')).join(' ')}
                            fill="none"
                            stroke="#9ca3af"
                            strokeWidth={road.main ? 2.5 : 1.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <polyline
                            points={road.points.map(p => p.join(',')).join(' ')}
                            fill="none"
                            stroke="#fcd34d"
                            strokeWidth="0.25"
                            strokeDasharray="1,1"
                        />
                    </g>
                ))}

                {/* Gardens */}
                {GARDENS.map((g, i) => (
                    <g key={i}>
                        <circle cx={g.cx} cy={g.cy} r={g.r} fill="#86efac" />
                        <circle cx={g.cx - g.r / 3} cy={g.cy - g.r / 3} r={g.r / 3} fill="#22c55e" />
                        <circle cx={g.cx + g.r / 3} cy={g.cy + g.r / 3} r={g.r / 4} fill="#16a34a" />
                    </g>
                ))}

                {/* Buildings */}
                {filteredBuildings.map(b => {
                    const isHovered = hovered === b.id
                    const isSelected = selectedBuilding === b.id
                    const center = getCentroid(b.shape)
                    const elevation = Math.min(b.floors * 0.4, 2.5)

                    // Create 3D extrusion points
                    const topShape = b.shape.map(p => [p[0] + elevation * 0.7, p[1] - elevation])

                    return (
                        <g
                            key={b.id}
                            className="cursor-pointer"
                            onMouseEnter={() => setHovered(b.id)}
                            onMouseLeave={() => setHovered(null)}
                            onClick={(e) => { e.stopPropagation(); onBuildingClick?.(b) }}
                            style={{
                                transform: isHovered || isSelected ? 'translateY(-0.5px)' : 'none',
                                transition: 'transform 0.2s'
                            }}
                        >
                            {/* Shadow */}
                            <polygon
                                points={getPoints(b.shape.map(p => [p[0] + 0.5, p[1] + 0.5]))}
                                fill="rgba(0,0,0,0.1)"
                            />

                            {/* 3D Side faces */}
                            {b.shape.map((p, i) => {
                                const next = b.shape[(i + 1) % b.shape.length]
                                const topP = topShape[i]
                                const topNext = topShape[(i + 1) % topShape.length]
                                return (
                                    <polygon
                                        key={i}
                                        points={`${p.join(',')} ${next.join(',')} ${topNext.join(',')} ${topP.join(',')}`}
                                        fill={b.color}
                                        opacity="0.5"
                                    />
                                )
                            })}

                            {/* Top face */}
                            <polygon
                                points={getPoints(topShape)}
                                fill={b.color}
                                opacity="0.75"
                            />

                            {/* Front face */}
                            <polygon
                                points={getPoints(b.shape)}
                                fill={b.color}
                                stroke={isHovered || isSelected ? '#fff' : 'rgba(255,255,255,0.4)'}
                                strokeWidth={isHovered || isSelected ? 0.5 : 0.2}
                                filter={isHovered || isSelected ? 'url(#glowEffect)' : 'url(#buildingShadow)'}
                            />

                            {/* Building label */}
                            <text
                                x={center.x}
                                y={center.y + 1}
                                textAnchor="middle"
                                fontSize="2.2"
                                fill="white"
                                fontWeight="bold"
                                style={{
                                    textShadow: '0 0 3px rgba(0,0,0,0.5)',
                                    transform: `rotate(${-transform.rotation}deg)`,
                                    transformOrigin: `${center.x}px ${center.y}px`
                                }}
                            >
                                {b.id}
                            </text>
                        </g>
                    )
                })}
            </svg>

            {/* Compass / Rotation Control */}
            <div className="absolute top-20 right-4 z-30 flex flex-col items-center gap-2">
                <div className="bg-white rounded-2xl shadow-xl p-2">
                    <div
                        className="w-14 h-14 relative"
                        style={{ transform: `rotate(${-transform.rotation}deg)`, transition: 'transform 0.2s' }}
                    >
                        <svg viewBox="0 0 50 50" className="w-full h-full">
                            <circle cx="25" cy="25" r="22" fill="none" stroke="#e5e7eb" strokeWidth="2" />
                            <polygon points="25,6 21,18 25,15 29,18" fill="#ef4444" />
                            <polygon points="25,44 21,32 25,35 29,32" fill="#9ca3af" />
                            <text x="25" y="5" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="bold">N</text>
                        </svg>
                    </div>
                    <div className="flex gap-1 mt-2">
                        <button onClick={() => rotate(-15)} className="w-6 h-6 bg-gray-100 rounded text-xs hover:bg-gray-200">↺</button>
                        <button onClick={() => rotate(15)} className="w-6 h-6 bg-gray-100 rounded text-xs hover:bg-gray-200">↻</button>
                    </div>
                </div>
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-24 right-4 z-30 flex flex-col gap-1">
                <button onClick={() => setTransform(t => ({ ...t, scale: Math.min(t.scale * 1.3, 5) }))}
                    className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center text-xl hover:bg-gray-50 font-light">+</button>
                <button onClick={() => setTransform(t => ({ ...t, scale: Math.max(t.scale * 0.7, 0.5) }))}
                    className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center text-xl hover:bg-gray-50 font-light">−</button>
                <button onClick={resetView}
                    className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center hover:bg-gray-50" title="Reset View">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* Hover Tooltip */}
            {hovered && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl px-5 py-4 z-40 pointer-events-none">
                    {(() => {
                        const b = BUILDINGS.find(b => b.id === hovered)
                        if (!b) return null
                        return (
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl" style={{ background: b.color + '20' }}>
                                    {b.icon}
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 text-lg">{b.name}</p>
                                    <p className="text-sm text-gray-500">{b.dept}</p>
                                    <p className="text-xs text-gray-400 mt-1">{b.floors} floors</p>
                                </div>
                            </div>
                        )
                    })()}
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 z-30">
                <p className="text-xs font-bold text-gray-500 mb-2">CAMPUS ZONES</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#3b82f6' }}></div><span>A Blocks (Engg)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#22c55e' }}></div><span>C Blocks (CSE)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#ec4899' }}></div><span>D Blocks (Mgmt)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#7c3aed' }}></div><span>DD Blocks (Sci)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#64748b' }}></div><span>Boys Hostels</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ background: '#db2777' }}></div><span>Girls Hostels</span></div>
                </div>
            </div>

            {/* Scale indicator */}
            <div className="absolute bottom-4 right-20 bg-white/90 rounded-lg px-3 py-1.5 text-xs text-gray-600 z-30">
                {Math.round(transform.scale * 100)}% | {transform.rotation}°
            </div>
        </div>
    )
}
