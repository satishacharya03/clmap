// Email validation
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// Password validation (minimum 6 characters)
export function isValidPassword(password: string): boolean {
    return password.length >= 6
}

// Name validation (at least 2 characters, letters and spaces only)
export function isValidName(name: string): boolean {
    return name.length >= 2 && /^[a-zA-Z\s]+$/.test(name)
}

// Place name validation
export function isValidPlaceName(name: string): boolean {
    return name.length >= 2 && name.length <= 100
}

// Description validation
export function isValidDescription(description: string): boolean {
    return description.length <= 1000
}

// Coordinate validation
export function isValidLatitude(lat: number): boolean {
    return lat >= -90 && lat <= 90
}

export function isValidLongitude(lng: number): boolean {
    return lng >= -180 && lng <= 180
}

export function isValidCoordinates(lat: number, lng: number): boolean {
    return isValidLatitude(lat) && isValidLongitude(lng)
}

// Image file validation
export function isValidImageType(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    return validTypes.includes(mimeType)
}

export function isValidImageSize(sizeBytes: number, maxMB: number = 5): boolean {
    return sizeBytes <= maxMB * 1024 * 1024
}

// Registration validation
export interface RegistrationData {
    name: string
    email: string
    password: string
}

export function validateRegistration(data: RegistrationData): string[] {
    const errors: string[] = []

    if (!data.name || !isValidName(data.name)) {
        errors.push('Name must be at least 2 characters and contain only letters')
    }

    if (!data.email || !isValidEmail(data.email)) {
        errors.push('Invalid email address')
    }

    if (!data.password || !isValidPassword(data.password)) {
        errors.push('Password must be at least 6 characters')
    }

    return errors
}

// Place submission validation
export interface PlaceData {
    name: string
    description?: string
    categoryId: string
    latitude?: number
    longitude?: number
    blockId?: string
    floorId?: string
    roomId?: string
}

export function validatePlace(data: PlaceData): string[] {
    const errors: string[] = []

    if (!data.name || !isValidPlaceName(data.name)) {
        errors.push('Place name must be between 2 and 100 characters')
    }

    if (data.description && !isValidDescription(data.description)) {
        errors.push('Description must not exceed 1000 characters')
    }

    if (!data.categoryId) {
        errors.push('Category is required')
    }

    if (data.latitude !== undefined && !isValidLatitude(data.latitude)) {
        errors.push('Invalid latitude')
    }

    if (data.longitude !== undefined && !isValidLongitude(data.longitude)) {
        errors.push('Invalid longitude')
    }

    return errors
}
