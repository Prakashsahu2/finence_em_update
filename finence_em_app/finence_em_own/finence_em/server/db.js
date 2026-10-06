import mongoose from 'mongoose'

export async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection
  }

  const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017'
  const DB_NAME = process.env.DB_NAME && process.env.DB_NAME !== 'aifinence_db'
    ? process.env.DB_NAME
    : 'finwise'

  const opts = {
    bufferCommands: false,
    dbName: DB_NAME,
  }

  try {
    const conn = await mongoose.connect(MONGO_URL, opts)
    console.log(`[Database] Connected to MongoDB: ${DB_NAME}`)
    return conn
  } catch (error) {
    console.error('[Database] MongoDB connection error:', error)
    throw error
  }
}

export default connectDB
