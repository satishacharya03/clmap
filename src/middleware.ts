import { auth } from '@/lib/auth'

// Neon Auth middleware — redirects unauthenticated users to /login
export default auth.middleware({
    loginUrl: '/login',
})

export const config = {
    matcher: ['/admin/:path*', '/dashboard/:path*'],
}
