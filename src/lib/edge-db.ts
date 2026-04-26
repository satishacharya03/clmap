import { Pool, neonConfig } from '@neondatabase/serverless'

// Next.js automatically loads environment variables from .env, so dotenv.config() is not needed 
// and causes errors in the Edge Runtime.

if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production' && !process.env.NEXT_RUNTIME) {
    /**
     * Only require 'ws' in Node.js environments (not Edge).
     * NEXT_RUNTIME is 'edge' or 'nodejs' in Next.js.
     */
    const ws = require('ws')
    neonConfig.webSocketConstructor = ws
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})

export type { Pool }
