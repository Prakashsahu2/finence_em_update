import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'
import { sendOtpEmail } from '@/lib/sendEmail'

const OTP_EXPIRY_MINUTES = 5

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request) {
  try {
    await connectDB()
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 })
    }

    const otp = generateOtp()
    user.resetToken = otp
    user.resetTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    await user.save()

    await sendOtpEmail(user.email, otp, user.name)

    return NextResponse.json({ success: true, message: 'Password reset OTP sent' })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}