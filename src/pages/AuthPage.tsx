import { useState } from 'react'
import { createAccountWithRole, SELF_SERVICE_ONBOARDING_ROLE } from '../services/accountOnboardingService'
import { authService } from '../domains/auth/services/authService'
import { normalizeAuthError } from '../lib/authErrorNormalizer'

export const Auth = () => {

  const [isLogin, setIsLogin] = useState(true)

  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [firmId, setFirmId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleAuth = async () => {
    setIsLoading(true)
    setError(null)
    setNotice(null)

    // Validate inputs
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      setError('Email and password are required')
      setIsLoading(false)
      return
    }

    try {
      if (isLogin) {
        await authService.login({ email: trimmedEmail, password: trimmedPassword })
        setError(null)
      } else {
        if (!firmId.trim()) {
          setError('A valid firm workspace ID is required to create a client account.')
          setIsLoading(false)
          return
        }
        await createAccountWithRole({
          email: trimmedEmail,
          password: trimmedPassword,
          fullName: fullName.trim() || trimmedEmail.split('@')[0] || 'New User',
          role: SELF_SERVICE_ONBOARDING_ROLE,
          firmId: firmId.trim(),
          actor: null,
        })
        setError(null)
        setNotice('Account created successfully. Please verify your email, then login.')
      }
    } catch (err) {
      setError(normalizeAuthError(err).userMessage)
    } finally {
      setIsLoading(false)
      // Clear password field after submission attempt
      setPassword('')
    }
  }

  return (

    <div className="min-h-screen bg-matte-black flex items-center justify-center p-6">

      <div className="w-full max-w-md bg-matte-black-light border border-slate-800 rounded-3xl p-8">

        <h1 className="text-4xl font-bold text-white mb-2">
          CAATH
        </h1>

        <p className="text-slate-400 mb-8">
          {isLogin ? 'Login to your account' : 'Create your account'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300">
            {notice}
          </div>
        )}

        <div className="space-y-4">

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="w-full p-4 rounded-xl bg-matte-black border border-slate-700 text-white disabled:opacity-50"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isLoading) handleAuth()
            }}
            className="w-full p-4 rounded-xl bg-matte-black border border-slate-700 text-white disabled:opacity-50"
          />

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                className="w-full p-4 rounded-xl bg-matte-black border border-slate-700 text-white disabled:opacity-50"
              />
              <input
                type="text"
                value={SELF_SERVICE_ONBOARDING_ROLE}
                readOnly
                disabled={isLoading}
                className="w-full p-4 rounded-xl bg-matte-black border border-slate-700 text-slate-300 disabled:opacity-50"
              />
              <p className="text-xs text-slate-500">
                Self-service onboarding is limited to Client accounts. Admin, SuperAdmin, and Staff access is provisioned by an authorized firm owner.
              </p>
              <input
                type="text"
                placeholder="Firm workspace ID from your invitation"
                value={firmId}
                onChange={(e) => setFirmId(e.target.value)}
                disabled={isLoading}
                required
                className="w-full p-4 rounded-xl bg-matte-black border border-slate-700 text-white disabled:opacity-50"
              />
            </>
          )}

          <button
            onClick={handleAuth}
            disabled={isLoading}
            className="w-full p-4 rounded-xl bg-gold text-black font-bold disabled:opacity-40"
          >
            {isLoading ? 'Loading...' : isLogin ? 'Login' : 'Create Account'}
          </button>

        </div>

        <button
          onClick={() => {
            setIsLogin(!isLogin)
            setError(null)
          }}
          disabled={isLoading}
          className="mt-6 text-sm text-slate-400 hover:text-gold disabled:opacity-50"
        >
          {isLogin
            ? 'Create new account'
            : 'Already have an account? Login'}
        </button>

      </div>

    </div>

  )

}
