import { NextRequest } from 'next/server'

function canonicalizeLoopbackHost(hostname: string) {
    return hostname === '127.0.0.1' ? 'localhost' : hostname
}

export function getCanonicalAppOrigin(request: NextRequest) {
    const url = request.nextUrl.clone()
    url.hostname = canonicalizeLoopbackHost(url.hostname)
    return url.origin
}

export function normalizeAppCallbackURL(
    request: NextRequest,
    rawValue: unknown,
    fallbackPath = '/profile'
) {
    const canonicalOrigin = getCanonicalAppOrigin(request)
    const fallback = `${canonicalOrigin}${fallbackPath}`

    if (typeof rawValue !== 'string' || !rawValue.trim()) {
        return fallback
    }

    const value = rawValue.trim()
    if (value.startsWith('/')) {
        return `${canonicalOrigin}${value}`
    }

    try {
        const url = new URL(value)
        url.hostname = canonicalizeLoopbackHost(url.hostname)

        if (url.origin === canonicalOrigin) {
            return `${url.origin}${url.pathname}${url.search}${url.hash}`
        }
    } catch {
        return fallback
    }

    return fallback
}
