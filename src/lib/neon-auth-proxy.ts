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
    const response = await fetch(`${origin}/api/auth/${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
