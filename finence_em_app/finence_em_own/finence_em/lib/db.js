import mongoose from 'mongoose'
import dns from 'node:dns'
import { getMongoConnectionUrl } from './mongo-url.js'

const mongoDnsServers = (process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean)

try {
  dns.setServers(mongoDnsServers)
} catch (error) {
  console.error('[DNS] Invalid MONGO_DNS_SERVERS configuration:', error.message)
}

const DB_NAME = process.env.DB_NAME && process.env.DB_NAME !== 'your_database_name'
  ? process.env.DB_NAME
  : 'finwise'

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = getMongoConnectionUrl().then((connectionUrl) => mongoose.connect(connectionUrl, {
      bufferCommands: false,
      dbName: DB_NAME,
    }))
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB
