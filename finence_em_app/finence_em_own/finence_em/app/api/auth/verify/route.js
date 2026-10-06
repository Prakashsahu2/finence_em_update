import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'

const JWT_SECRET = process.env.JWT_SECRET || 'finwise-secret-key-12345'

export async function POST(request) {
  return handleVerify(request)
}

export async function PUT(request) {
  return handleVerify(request)
}

async function handleVerify(request) {
  try {
    await connectDB()
    const { email, otp } = await request.json()

    let targetEmail = email
    let targetOtp = otp

    // Fall back to session cookie if email/otp not in body
    if (!targetEmail) {
      const tokenObj = request.cookies.get('token')
      const token = tokenObj?.value
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET)
          targetEmail = decoded.email
        } catch (err) {
          // Invalid token — fall through to error below
        }
      }
    }

    if (!targetEmail || !targetOtp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const normalizedEmail = targetEmail.toLowerCase()

    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.verifyToken !== targetOtp) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 })
    }

    if (!user.verifyTokenExpiry || user.verifyTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired. Please resend.' }, { status: 400 })
    }

    // Mark as verified and clear token fields
    user.verified = true
    user.verifyToken = undefined
    user.verifyTokenExpiry = undefined
    await user.save()

    // Issue full 7-day authenticated JWT session cookie
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
