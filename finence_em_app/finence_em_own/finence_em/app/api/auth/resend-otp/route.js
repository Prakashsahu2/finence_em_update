import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import { sendOtpEmail } from '@/lib/sendEmail'

const JWT_SECRET = process.env.JWT_SECRET || 'finwise-secret-key-12345'
const OTP_EXPIRY_MINUTES = 5

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request) {
  return handleResendOtp(request)
}

export async function PATCH(request) {
  return handleResendOtp(request)
}

async function handleResendOtp(request) {
  try {
    await connectDB()
    let body = {}
    try {
      body = await request.json()
    } catch (e) {
      // body is empty
    }
    const { email } = body

    let targetEmail = email

    // Fall back to session cookie if email not in body
    if (!targetEmail) {
      const tokenObj = request.cookies.get('token')
      const token = tokenObj?.value
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET)
          targetEmail = decoded.email
        } catch (err) {
          // Invalid token
        }
      }
    }

    if (!targetEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = targetEmail.toLowerCase()

    // Only find unverified users
    const user = await User.findOne({ email: normalizedEmail, verified: false })
    if (!user) {
      return NextResponse.json({ error: 'User not found or already verified' }, { status: 404 })
    }

    const otp = generateOtp()
    const verifyTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    user.verifyToken = otp
    user.verifyTokenExpiry = verifyTokenExpiry
    await user.save()

    await sendOtpEmail(user.email, otp, user.name)

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
