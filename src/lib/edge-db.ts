import { Pool, neonConfig } from '@neondatabase/serverless'

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
    const ws = require('ws')
    neonConfig.webSocketConstructor = ws
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

export type { Pool }
