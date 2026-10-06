import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'

const JWT_SECRET = process.env.JWT_SECRET || 'finwise-secret-key-12345'

export async function GET(request) {
  try {
    await connectDB()
    const tokenObj = request.cookies.get('token')
    const token = tokenObj?.value

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null })
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      const user = await User.findById(decoded.userId).select('-hashedPassword')
      if (!user) {
        return NextResponse.json({ authenticated: false, user: null })
      }
      return NextResponse.json({
        authenticated: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          verified: user.verified,
        },
      })
    } catch (err) {
      // Invalid token, clear it
      const response = NextResponse.json({ authenticated: false, user: null })
      response.cookies.set('token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
      })
      return response
    }
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}