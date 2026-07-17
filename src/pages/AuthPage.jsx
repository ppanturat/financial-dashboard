import { useState } from 'react'

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid var(--border-md)',
  background: 'var(--surface-2)',
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: "var(--font-body), sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color .15s',
}

function Field({ error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {children}
      {error && (
        <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500, paddingLeft: 2 }}>
          {error}
        </span>
      )}
    </div>
  )
}

// ── Password field with show/hide toggle ──────────────────────────────────────
function PasswordField({ value, onChange, placeholder, autoComplete, error, onFocus, onBlur }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        style={{
          ...inputStyle,
          paddingRight: 42,
          borderColor: error ? '#fca5a5' : undefined,
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        required
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        style={{
          position: 'absolute', right: 12, top: '50%',
          transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 2, color: 'var(--muted)', fontSize: 16, lineHeight: 1,
          display: 'flex', alignItems: 'center',
        }}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? (
          // Eye-off SVG
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          // Eye SVG
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}

// ── General error banner ──────────────────────────────────────────────────────
function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div style={{
      background: '#fef2f2', border: '1px solid #fecaca',
      borderRadius: 8, padding: '10px 13px',
      fontSize: 13, color: '#dc2626', fontWeight: 500,
    }}>
      {message}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export function AuthPage({ onSignIn, onSignUp }) {
  const [view, setView] = useState('login')

  // Login state
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginErrors, setLoginErrors]     = useState({})

  // Register state
  const [regName, setRegName]         = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail]       = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regErrors, setRegErrors]     = useState({})

  const [loading, setLoading]     = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const handleToggleView = () => {
    setView(v => v === 'login' ? 'register' : 'login')
    setLoginErrors({})
    setRegErrors({})
  }

  // ── Login submit ────────────────────────────────────────────────────────────
  // FIX: Wrapped in try/catch. Previously any thrown exception (network error,
  // CORS, timeout) left the button stuck on "Signing in…" forever because
  // setLoading(false) was never reached.
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginErrors({})
    setLoading(true)

    try {
      const result = await onSignIn(loginEmail, loginPassword)

      // onSignIn (useAuth.signIn) now always returns {data, error} — never throws.
      // But guard here too in case of unexpected shapes.
      const error = result?.error ?? null

      if (error) {
        const msg = error.message?.toLowerCase() || ''
        if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('email')) {
          setLoginErrors({ general: 'Incorrect email or password. Please try again.' })
        } else if (msg.includes('confirm') || msg.includes('verified')) {
          setLoginErrors({ general: 'Please verify your email before signing in.' })
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
          setLoginErrors({ general: 'Connection error. Check your internet and try again.' })
        } else if (msg.includes('not configured')) {
          setLoginErrors({ general: 'Authentication is not set up on this deployment. Contact support.' })
        } else {
          setLoginErrors({ general: error.message || 'Sign in failed. Please try again.' })
        }
      }
      // On success: onAuthStateChange fires → session updates → App re-renders →
      // AuthPage unmounts. setLoading(false) below may run on unmounted component
      // but React 18 handles this gracefully (no-op, no warning).
    } catch (err) {
      // Truly unexpected throw (should not happen now that useAuth wraps everything,
      // but kept as ultimate safety net)
      console.error('[AuthPage] unexpected sign-in error:', err)
      setLoginErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      // FIX: Use finally so setLoading(false) ALWAYS runs, even if an error is
      // thrown mid-way. This prevents the button from being stuck indefinitely.
      setLoading(false)
    }
  }

  // ── Register submit ─────────────────────────────────────────────────────────
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()

    // Client-side validation first (no network call needed)
    const errs = {}
    if (!regName.trim())         errs.name = 'Display name is required'
    if (!regUsername.trim())     errs.username = 'Username is required'
    else if (regUsername.length < 3) errs.username = 'Username must be at least 3 characters'
    else if (!/^[a-z0-9_]+$/.test(regUsername)) errs.username = 'Only lowercase letters, numbers and underscores'
    if (!regEmail.trim())        errs.email = 'Email is required'
    if (!regPassword)            errs.password = 'Password is required'
    else if (regPassword.length < 6) errs.password = 'Password must be at least 6 characters'

    if (Object.keys(errs).length) { setRegErrors(errs); return }

    setRegErrors({})
    setLoading(true)

    try {
      const result   = await onSignUp(regEmail, regPassword, regName.trim(), regUsername)
      const error    = result?.error ?? null

      if (error) {
        const msg = error.message?.toLowerCase() || ''
        if (msg.includes('username') || msg.includes('taken')) {
          setRegErrors({ username: error.message })
        } else if (msg.includes('email') && msg.includes('already')) {
          setRegErrors({ email: 'An account with this email already exists.' })
        } else if (msg.includes('password')) {
          setRegErrors({ password: error.message })
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
          setRegErrors({ general: 'Connection error. Check your internet and try again.' })
        } else {
          setRegErrors({ general: error.message || 'Registration failed. Please try again.' })
        }
      } else {
        setSentEmail(regEmail)
        setView('check_email')
      }
    } catch (err) {
      console.error('[AuthPage] unexpected sign-up error:', err)
      setRegErrors({ general: 'An unexpected error occurred. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Check email confirmation screen ────────────────────────────────────────
  if (view === 'check_email') return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>Check your email</h2>
        <p className="auth-sub">
          Confirmation link sent to <strong>{sentEmail}</strong>
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 16px', textAlign: 'center', lineHeight: 1.5 }}>
          Click the link in the email to activate your account, then sign in below.
        </p>
        <button className="btn-text" onClick={() => setView('login')}>
          Back to sign in
        </button>
      </div>
    </div>
  )

  // ── Main auth card ──────────────────────────────────────────────────────────
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-sub">
          {view === 'login' ? 'Sign in to your dashboard' : 'Start tracking your portfolio'}
        </p>

        {/* ── Login form ── */}
        {view === 'login' && (
          <form
            className="auth-form"
            onSubmit={handleLoginSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            noValidate
          >
            <ErrorBanner message={loginErrors.general} />

            <Field error={loginErrors.email}>
              <input
                type="email"
                placeholder="Email address"
                autoComplete="username email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                style={{ ...inputStyle, borderColor: loginErrors.email ? '#fca5a5' : undefined }}
                onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e   => e.target.style.borderColor = loginErrors.email ? '#fca5a5' : 'var(--border-md)'}
                required
              />
            </Field>

            <Field error={loginErrors.password}>
              <PasswordField
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                error={loginErrors.password}
                onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e   => e.target.style.borderColor = loginErrors.password ? '#fca5a5' : 'var(--border-md)'}
              />
            </Field>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {/* ── Register form ── */}
        {view === 'register' && (
          <form
            className="auth-form"
            onSubmit={handleRegisterSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            noValidate
          >
            <ErrorBanner message={regErrors.general} />

            <Field error={regErrors.name}>
              <input
                type="text"
                placeholder="Display name"
                autoComplete="name"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                style={{ ...inputStyle, borderColor: regErrors.name ? '#fca5a5' : undefined }}
                onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e   => e.target.style.borderColor = regErrors.name ? '#fca5a5' : 'var(--border-md)'}
              />
            </Field>

            <Field error={regErrors.username}>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--muted)', fontSize: 14, pointerEvents: 'none',
                }}>
                  @
                </span>
                <input
                  type="text"
                  placeholder="username"
                  autoComplete="username"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  style={{ ...inputStyle, paddingLeft: 30, borderColor: regErrors.username ? '#fca5a5' : undefined }}
                  onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e   => e.target.style.borderColor = regErrors.username ? '#fca5a5' : 'var(--border-md)'}
                />
              </div>
            </Field>

            <Field error={regErrors.email}>
              <input
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                style={{ ...inputStyle, borderColor: regErrors.email ? '#fca5a5' : undefined }}
                onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e   => e.target.style.borderColor = regErrors.email ? '#fca5a5' : 'var(--border-md)'}
                required
              />
            </Field>

            <Field error={regErrors.password}>
              <PasswordField
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                autoComplete="new-password"
                error={regErrors.password}
                onFocus={e  => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e   => e.target.style.borderColor = regErrors.password ? '#fca5a5' : 'var(--border-md)'}
              />
            </Field>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <button className="btn-text" onClick={handleToggleView} type="button">
          {view === 'login'
            ? "Don't have an account? Register"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
