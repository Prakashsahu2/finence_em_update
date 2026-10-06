import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'finwise-secret-key-12345'

export function getAuthenticatedUserId(request) {
  const token = request.cookies.get('token')?.value
  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded?.userId ? String(decoded.userId) : null
  } catch {
    return null
  }
}
