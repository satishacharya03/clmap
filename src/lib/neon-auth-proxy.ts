import { NextRequest } from 'next/server'
import { getCanonicalAppOrigin } from '@/lib/app-origin'

type NeonProxyResult<T> = {
    status: number
    ok: boolean
    data: T | null
}

export async function postToNeonAuthProxy<T>(
    request: NextRequest,
    path: string,
    body: Record<string, unknown>
): Promise<NeonProxyResult<T>> {
    const origin = getCanonicalAppOrigin(request)
    const cookieHeader = request.headers.get('cookie') || ''

    const response = await fetch(`${origin}/api/auth/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            Origin: origin,
            Referer: `${origin}${request.nextUrl.pathname}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    })

    const data = await response.json().catch(() => null)

    return {
        status: response.status,
        ok: response.ok,
        data,
    }
}
