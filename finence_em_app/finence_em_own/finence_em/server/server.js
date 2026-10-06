import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import dns from 'node:dns'
import path from 'path'
import { fileURLToPath } from 'url'
import connectDB from './db.js'
import authRouter from './routes/auth.js'
import financeRouter from './routes/finance.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from the parent root directory
dotenv.config({ path: path.join(__dirname, '../.env') })

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean)

try {
  dns.setServers(mongoDnsServers)
  console.log(`[DNS] Using resolvers: ${mongoDnsServers.join(', ')}`)
} catch (error) {
  console.error('[DNS] Invalid MONGO_DNS_SERVERS configuration:', error.message)
}

const app = express()
const PORT = process.env.PORT || 5000

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGINS === '*' ? true : process.env.CORS_ORIGINS || true,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())

// Connect to the database without preventing the HTTP server from starting.
// Individual routes report database errors until the connection is available.
connectDB().catch((error) => {
  console.error(
    '[Database] Startup connection failed. Check MONGO_URL, network access, and Atlas IP allow-list:',
    error.message,
  )
})

// Routing registration
app.use('/api/auth', authRouter)
app.use('/api', financeRouter)

// Error Handler
app.use((err, req, res, next) => {
  console.error('[Express Error]', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

function startServer(portToUse, retries = 0) {
  const server = app.listen(portToUse, '0.0.0.0', () => {
    console.log(`[Server] Express server running at http://localhost:${portToUse}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(portToUse) + 1
      if (retries >= 10) {
        console.error(
          `[Server Error] Ports ${PORT}-${nextPort - 1} are occupied. ` +
          'Set PORT to an available port and restart the server.',
        )
        process.exitCode = 1
        return
      }

      console.warn(
        `[Server Warning] Port ${portToUse} is occupied. ` +
        `Trying port ${nextPort}...`,
      )
      startServer(nextPort, retries + 1)
    } else {
      console.error('[Server Error]', err)
      process.exitCode = 1
    }
  })
}

startServer(PORT)
