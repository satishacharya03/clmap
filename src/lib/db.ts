import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { Pool, neonConfig } from '@neondatabase/serverless'

// Next.js handles .env loading automatically.
// dotenv.config() is removed to avoid Edge Runtime errors.

// Configure WebSocket for local development in Node.js
if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_RUNTIME) {
  const ws = require('ws')
  neonConfig.webSocketConstructor = ws
}

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("❌ DATABASE_URL is NOT defined in environment variables!")
} else {
  console.log("✅ DATABASE_URL is defined:", connectionString.substring(0, 20) + "...")
}

const pool = new Pool({ connectionString: connectionString || "" })
const adapter = new PrismaNeon(pool as any)

const prismaClientSingleton = () => {
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
