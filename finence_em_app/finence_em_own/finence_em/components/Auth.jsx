'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Clock,
  RotateCcw,
  CheckCircle2,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

export default function Auth({ onLoginSuccess }) {
  // ── Password visibility ──────────────────────────────────────────────
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false)

  // ── Login state ───────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetOtpSent, setResetOtpSent] = useState(false)
  const [resetOtp, setResetOtp] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  // ── Register state ────────────────────────────────────────────────────
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regError, setRegError] = useState('')

  // ── OTP state (inline in register form) ──────────────────────────────
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(0)
  const [canResend, setCanResend] = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────
  const loginEmailRef = useRef(null)
  const regNameRef = useRef(null)
  const otpInputRef = useRef(null)

  // ── 30-second resend countdown ────────────────────────────────────────
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setCanResend(true)
    }
  }, [resendCountdown])

  // ── Auto-focus OTP field when it appears ─────────────────────────────
  useEffect(() => {
    if (showOtp) {
      setTimeout(() => otpInputRef.current?.focus(), 150)
    }
  }, [showOtp])

  // ── Helpers ───────────────────────────────────────────────────────────
  const isValidEmail = (email) =>
    /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
    const secs = (seconds % 60).toString().padStart(2, '0')
    return `${mins}:${secs}`
  }

  const handleScrollToRegister = (e) => {
    e.preventDefault()
    document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => regNameRef.current?.focus(), 500)
  }

  const handleScrollToLogin = (e) => {
    e.preventDefault()
    document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })
    setTimeout(() => loginEmailRef.current?.focus(), 500)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setResetError('')

    if (!loginEmail.trim() || !isValidEmail(loginEmail)) {
      setResetError('Please enter a valid email address')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not send reset code')

      setResetOtpSent(true)
      toast.success('Password reset code sent to your email')
    } catch (err) {
      setResetError(err.message)
      toast.error(err.message)
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetError('')

    if (resetOtp.length !== 6) {
      setResetError('Please enter the 6-digit reset code')
      return
    }
    if (resetPassword.length < 6) {
      setResetError('Password must be at least 6 characters long')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, otp: resetOtp, password: resetPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not reset password')

      setShowForgotPassword(false)
      setResetOtpSent(false)
      setResetOtp('')
      setResetPassword('')
      setLoginPassword('')
      toast.success('Password reset successfully. You can now log in.')
    } catch (err) {
      setResetError(err.message)
      toast.error(err.message)
    } finally {
      setResetLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setShowForgotPassword(false)
    setResetOtpSent(false)
    setResetOtp('')
    setResetPassword('')
    setResetError('')
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginError('')

    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please fill in all fields')
      return
    }
    if (!isValidEmail(loginEmail)) {
      setLoginError('Please enter a valid email address')
      return
    }

    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      toast.success(`Welcome back, ${data.user.name}!`)
      if (onLoginSuccess) {
        onLoginSuccess(data.user)
      }
    } catch (err) {
      setLoginError(err.message)
      toast.error(err.message)
    } finally {
      setLoginLoading(false)
    }
  }

  // ── REGISTER (step 1 — send OTP) ─────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()

    // If OTP is already showing, this submission is for verify
    if (showOtp) {
      handleOtpVerify(e)
      return
    }

    setRegError('')

    if (!regName.trim() || !regEmail.trim() || !regPassword || !regConfirmPassword) {
      setRegError('Please fill in all fields')
      return
    }
    if (!isValidEmail(regEmail)) {
      setRegError('Please enter a valid email address')
      return
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match')
      return
    }

    setRegLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Reveal OTP field inline — same form, below Confirm Password
      setShowOtp(true)
      setOtp('')
      setOtpError('')
      setResendCountdown(30)
      setCanResend(false)
      toast.success('Verification code sent to ' + regEmail)
    } catch (err) {
      setRegError(err.message)
      toast.error(err.message)
    } finally {
      setRegLoading(false)
    }
  }

  // ── OTP VERIFY ────────────────────────────────────────────────────────
  const handleOtpVerify = async (e) => {
    e?.preventDefault()
    setOtpError('')

    if (!otp || otp.length !== 6) {
      setOtpError('Please enter the 6-digit verification code')
      return
    }

    setOtpLoading(true)
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, otp }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed')
      }

      toast.success(`Welcome, ${data.user.name}! Your account is verified.`)
      if (onLoginSuccess) {
        onLoginSuccess(data.user)
      }
    } catch (err) {
      setOtpError(err.message)
      toast.error(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  // ── RESEND OTP ────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (!canResend || resendCountdown > 0) return

    setOtpError('')
    setOtpLoading(true)
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend OTP')
      }

      setOtp('')
      setResendCountdown(30)
      setCanResend(false)
      toast.success('New verification code sent!')
    } catch (err) {
      setOtpError(err.message)
      toast.error(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  // ── CANCEL OTP (go back to fresh registration form) ──────────────────
  const handleCancelOtp = () => {
    setShowOtp(false)
    setOtp('')
    setOtpError('')
    setResendCountdown(0)
    setCanResend(true)
  }

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/50 to-purple-50/50 p-4 sm:p-6 md:p-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 hover:shadow-purple-100/50 grid grid-cols-1 md:grid-cols-2">

        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN — LOGIN (Dark Purple)
        ══════════════════════════════════════════════════════════════ */}
        <div
          id="login-section"
          className="relative flex flex-col justify-between bg-gradient-to-br from-[#5A4EAB] to-[#403590] p-8 text-white sm:p-12 md:p-16 transition-all duration-500"
        >
          {/* Logo & Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white shadow-inner">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">FinWise</span>
          </div>

          {/* Form Content */}
          <div className="my-10">
            <h2 className="text-3xl font-extrabold tracking-tight">{showForgotPassword ? 'Reset Password' : 'Welcome Back'}</h2>
            <p className="mt-2 text-sm text-purple-200/80">
              {showForgotPassword ? 'Use the code sent to your email to create a new password.' : 'Access your personalized smart financial insights.'}
            </p>

            <form onSubmit={showForgotPassword ? (resetOtpSent ? handleResetPassword : handleForgotPassword) : handleLoginSubmit} className="mt-8 space-y-5">
              {(loginError || resetError) && (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{showForgotPassword ? resetError : loginError}</span>
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-purple-200/90"
                  htmlFor="login-email"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-300" />
                  <input
                    id="login-email"
                    ref={loginEmailRef}
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={loginLoading || resetLoading || resetOtpSent}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 pl-12 pr-4 text-sm text-white placeholder-purple-300/60 outline-none transition-all duration-200 focus:border-white/40 focus:bg-white/15 focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                  />
                </div>
              </div>

              {!showForgotPassword && <div className="space-y-2">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-purple-200/90"
                  htmlFor="login-password"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-300" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={loginLoading}
                    className="w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 pl-12 pr-12 text-sm text-white placeholder-purple-300/60 outline-none transition-all duration-200 focus:border-white/40 focus:bg-white/15 focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    disabled={loginLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white transition-colors disabled:opacity-50"
                  >
                    {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>}

              {showForgotPassword && resetOtpSent && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-purple-200/90" htmlFor="reset-otp">
                      Email OTP
                    </label>
                    <input
                      id="reset-otp"
                      type="text"
                      inputMode="numeric"
                      value={resetOtp}
                      onChange={(e) => setResetOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={resetLoading}
                      placeholder="000000"
                      className="w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 px-4 text-center text-lg font-mono tracking-[0.35em] text-white placeholder-purple-300/60 outline-none focus:border-white/40 focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-purple-200/90" htmlFor="reset-password">
                      New Password
                    </label>
                    <input
                      id="reset-password"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      disabled={resetLoading}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-white/15 bg-white/10 py-3.5 px-4 text-sm text-white placeholder-purple-300/60 outline-none focus:border-white/40 focus:ring-1 focus:ring-white/30 disabled:opacity-50"
                    />
                  </div>
                </>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loginLoading || resetLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-[#5A4EAB] shadow-lg shadow-[#403590]/40 outline-none transition-all duration-200 hover:bg-purple-50 hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loginLoading || resetLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#5A4EAB] border-t-transparent" />
                ) : (
                  <>
                    <span>{showForgotPassword ? (resetOtpSent ? 'Reset Password' : 'Send OTP') : 'Login'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {showForgotPassword && (
                <button type="button" onClick={handleBackToLogin} className="text-sm text-purple-200 hover:text-white transition-colors">
                  Back to Login
                </button>
              )}

              {!showForgotPassword && <>
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setLoginError(''); setResetError('') }}
                className="text-sm text-purple-200 hover:text-white transition-colors"
              >
                Forgot password?
              </button>

              {/* Link to Register */}
              <div className="text-center md:text-left mt-6">
                <a
                  href="#register-section"
                  onClick={handleScrollToRegister}
                  className="group inline-flex items-center gap-1.5 text-sm text-purple-200 hover:text-white transition-colors font-medium"
                >
                  Don&apos;t have an account?{' '}
                  <span className="underline font-semibold decoration-purple-400 group-hover:decoration-white">
                    Sign Up
                  </span>
                </a>
              </div>
              </>}
            </form>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN — REGISTER (Light / White)
        ══════════════════════════════════════════════════════════════ */}
        <div
          id="register-section"
          className="flex flex-col justify-between bg-slate-50/50 p-8 text-slate-800 sm:p-12 md:p-16 transition-all duration-500"
        >
          <div className="hidden md:block" />

          <div className="my-10 md:my-0">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Create Account</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign up today and take control of your financial future.
            </p>

            {/* Single unified form — OTP field is revealed inline */}
            <form onSubmit={handleRegisterSubmit} className="mt-8 space-y-4">

              {/* ── Registration error ──────────────────────────────── */}
              {regError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* ── Full Name ────────────────────────────────────────── */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  htmlFor="reg-name"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="reg-name"
                    ref={regNameRef}
                    type="text"
                    placeholder="John Doe"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    disabled={regLoading || showOtp}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#5A4EAB] focus:ring-1 focus:ring-[#5A4EAB]/20 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* ── Email Address ────────────────────────────────────── */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  htmlFor="reg-email"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="reg-email"
                    type="email"
                    placeholder="name@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={regLoading || showOtp}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#5A4EAB] focus:ring-1 focus:ring-[#5A4EAB]/20 disabled:opacity-50 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* ── Password ─────────────────────────────────────────── */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  htmlFor="reg-password"
                >
                  Password <span className="normal-case font-normal text-slate-400">(min 6 chars)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="reg-password"
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={regLoading || showOtp}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#5A4EAB] focus:ring-1 focus:ring-[#5A4EAB]/20 disabled:opacity-50 disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    disabled={showOtp}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
                  >
                    {showRegPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* ── Confirm Password ─────────────────────────────────── */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                  htmlFor="reg-confirm"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="reg-confirm"
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    disabled={regLoading || showOtp}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#5A4EAB] focus:ring-1 focus:ring-[#5A4EAB]/20 disabled:opacity-50 disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    disabled={showOtp}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
                  >
                    {showRegConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════
                  OTP SECTION — revealed inline below Confirm Password
              ══════════════════════════════════════════════════════ */}
              {showOtp && (
                <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* Info banner */}
                  <div className="flex items-center gap-3 rounded-xl bg-indigo-50 border border-indigo-200 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">Check your inbox</p>
                      <p className="text-xs text-slate-500 truncate">
                        A 6-digit code was sent to{' '}
                        <span className="font-medium text-indigo-700">{regEmail}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelOtp}
                      className="shrink-0 text-xs text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* OTP input */}
                  <div className="space-y-1.5">
                    <label
                      className="text-xs font-semibold uppercase tracking-wider text-slate-500"
                      htmlFor="otp-input"
                    >
                      Verification Code
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={otpInputRef}
                        id="otp-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                        }
                        maxLength={6}
                        disabled={otpLoading}
                        autoComplete="one-time-code"
                        className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition-all duration-200 focus:border-[#5A4EAB] focus:ring-1 focus:ring-[#5A4EAB]/20 disabled:opacity-50 text-center tracking-[0.35em] text-lg font-mono"
                      />
                    </div>
                  </div>

                  {/* OTP error */}
                  {otpError && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  {/* Resend row */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock className="h-4 w-4" />
                      {resendCountdown > 0 ? (
                        <span>
                          Resend in{' '}
                          <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {formatCountdown(resendCountdown)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">Ready to resend</span>
                      )}
                    </div>
                    <button
                      type="button"
                      id="resend-otp-btn"
                      onClick={handleResendOtp}
                      disabled={!canResend || otpLoading || resendCountdown > 0}
                      className="flex items-center gap-1.5 text-sm font-medium text-[#5A4EAB] hover:text-[#4a3e9c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {otpLoading ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#5A4EAB] border-t-transparent" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      <span>Resend Code</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── Submit Button (text switches when OTP revealed) ── */}
              <button
                type="submit"
                id={showOtp ? 'verify-otp-btn' : 'create-account-btn'}
                disabled={regLoading || otpLoading || (showOtp && otp.length !== 6)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5A4EAB] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#5A4EAB]/25 outline-none transition-all duration-200 hover:bg-[#4a3e9c] hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[1px] disabled:opacity-75 disabled:hover:translate-y-0"
              >
                {regLoading || otpLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : showOtp ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verify OTP &amp; Complete Signup</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          {!showOtp && (
            <div className="text-center md:text-left mt-6">
              <a
                href="#login-section"
                onClick={handleScrollToLogin}
                className="group inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
              >
                Already have an account?{' '}
                <span className="underline font-semibold text-[#5A4EAB] decoration-[#5A4EAB]/50 group-hover:decoration-[#5A4EAB]">
                  Login
                </span>
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}