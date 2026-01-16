// User Roles
export const USER_ROLES = {
    USER: 'USER',
    ADMIN: 'ADMIN'
} as const

// Approval Statuses
export const APPROVAL_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED'
} as const

// Parking Slot Statuses
export const PARKING_SLOT_STATUS = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED: 'OCCUPIED',
    RESERVED: 'RESERVED'
} as const

// Default Place Categories
export const DEFAULT_CATEGORIES = [
    { name: 'Academic Block', icon: '🏫' },
    { name: 'Department', icon: '🎓' },
    { name: 'Classroom', icon: '📚' },
    { name: 'Faculty Office', icon: '👨‍🏫' },
    { name: 'Laboratory', icon: '🔬' },
    { name: 'Library', icon: '📖' },
    { name: 'Cafeteria', icon: '🍽️' },
    { name: 'Parking', icon: '🅿️' },
    { name: 'Sports Facility', icon: '⚽' },
    { name: 'Auditorium', icon: '🎭' },
    { name: 'Hostel', icon: '🏠' },
    { name: 'Medical Center', icon: '🏥' },
    { name: 'ATM', icon: '🏧' },
    { name: 'Restroom', icon: '🚻' },
    { name: 'Other', icon: '📍' }
] as const

// Map Configuration - Chandigarh University Campus
export const MAP_CONFIG = {
    // Campus Center
    defaultCenter: { lat: 30.7699, lng: 76.5766 },
    defaultZoom: 16,
    minZoom: 15,
    maxZoom: 20,
    // Campus Bounds (restrict map to this area only)
    bounds: {
        north: 30.7780,
        south: 30.7620,
        east: 76.5880,
        west: 76.5650
    }
} as const

// Live Location Configuration
export const LIVE_LOCATION_CONFIG = {
    maxDurationMinutes: 60, // Maximum share duration
    defaultDurationMinutes: 15,
    updateIntervalMs: 5000 // 5 seconds
} as const

// Pagination
export const PAGINATION = {
    defaultLimit: 20,
    maxLimit: 100
} as const
