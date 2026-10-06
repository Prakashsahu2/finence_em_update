import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import connectDB from '@/lib/db'
import User from '@/lib/models/User'

export async function POST(request) {
  try {
    await connectDB()
    const { email, otp, password } = await request.json()

    if (!email || !otp || !password) {
      return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.resetToken !== otp) {
      return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 })
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 })
    }

    user.hashedPassword = await bcrypt.hash(password, 10)
    user.resetToken = undefined
    user.resetTokenExpiry = undefined
    await user.save()

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}