import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'finwise-secret-key-12345'
const OTP_EXPIRY_MINUTES = 5

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' })
    }

    const normalizedEmail = email.toLowerCase()

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail })

    const hashedPassword = await bcrypt.hash(password, 10)
    const otp = generateOtp()
    const verifyTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    if (existingUser) {
      if (existingUser.verified) {
        return res.status(400).json({ error: 'User already exists with this email' })
      }
      // User exists but unverified — update password, fresh OTP
      existingUser.hashedPassword = hashedPassword
      existingUser.verified = false
      existingUser.verifyToken = otp
      existingUser.verifyTokenExpiry = verifyTokenExpiry
      await existingUser.save()

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        message: 'OTP sent',
      })
    }

    // Create unverified user
    const user = await User.create({
      name,
      email: normalizedEmail,
      hashedPassword,
      verified: false,
      verifyToken: otp,
      verifyTokenExpiry,
    })

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'OTP sent',
    })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const normalizedEmail = email.toLowerCase()

    // Find user
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.hashedPassword)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // If verified, issue JWT immediately
    if (user.verified) {
      const token = jwt.sign(
        { userId: user._id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 * 1000,
        path: '/',
      })

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      })
    }

    // Unverified user — send OTP
    const otp = generateOtp()
    const verifyTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    user.verifyToken = otp
    user.verifyTokenExpiry = verifyTokenExpiry
    await user.save()

    return res.status(200).json({
      success: true,
      requiresVerification: true,
      message: 'OTP sent',
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  try {
    const { email, otp } = req.body

    const normalizedEmail = email.toLowerCase()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.verifyToken !== otp) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    if (!user.verifyTokenExpiry || user.verifyTokenExpiry < new Date()) {
      return res.status(400).json({ error: 'Verification code has expired. Please resend.' })
    }

    // Mark as verified and clear token fields
    user.verified = true
    user.verifyToken = undefined
    user.verifyTokenExpiry = undefined
    await user.save()

    // Issue full 7-day JWT session cookie
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000,
      path: '/',
    })

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Verification error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const normalizedEmail = email.toLowerCase()
    const user = await User.findOne({ email: normalizedEmail, verified: false })
    if (!user) {
      return res.status(404).json({ error: 'User not found or already verified' })
    }

    const otp = generateOtp()
    const verifyTokenExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    user.verifyToken = otp
    user.verifyTokenExpiry = verifyTokenExpiry
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
    })
  } catch (error) {
    console.error('Resend OTP error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  })
  return res.status(200).json({ success: true, message: 'Logged out successfully' })
})

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token

    if (!token) {
      return res.status(200).json({ authenticated: false, user: null })
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      return res.status(200).json({
        authenticated: true,
        user: {
          id: decoded.userId,
          name: decoded.name,
          email: decoded.email,
        },
      })
    } catch (err) {
      res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/',
      })
      return res.status(200).json({ authenticated: false, user: null })
    }
  } catch (error) {
    console.error('Session check error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
