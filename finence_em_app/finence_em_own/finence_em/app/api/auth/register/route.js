import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
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
    const { name, email, password } = await request.json()

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase()

    const existingUser = await User.findOne({ email: normalizedEmail })

    const hashedPassword = await bcrypt.hash(password, 10)
    const otp = generateOtp()
    const verifyTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    if (existingUser) {
      if (existingUser.verified) {
        return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 })
      }
      // User exists but is unverified — update password, generate fresh OTP
      existingUser.hashedPassword = hashedPassword
      existingUser.verified = false
      existingUser.verifyToken = otp
      existingUser.verifyTokenExpiry = verifyTokenExpiry
      await existingUser.save()

      await sendOtpEmail(existingUser.email, otp, existingUser.name)

      return NextResponse.json({
        success: true,
        requiresVerification: true,
        message: 'OTP sent',
      })
    }

    // Create new unverified user
    const user = await User.create({
      name,
      email: normalizedEmail,
      hashedPassword,
      verified: false,
      verifyToken: otp,
      verifyTokenExpiry,
    })

    await sendOtpEmail(user.email, otp, user.name)

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      message: 'OTP sent',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
