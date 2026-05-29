import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

// Friendly error messages mapped from Supabase/auth error strings
function friendlyError(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('email not confirmed'))
    return 'Incorrect email or password.'
  if (m.includes('email already') || m.includes('already registered') || m.includes('already in use') || m.includes('user already'))
    return 'An account with this email already exists.'
  if (m.includes('password') && m.includes('short'))
    return 'Password must be at least 6 characters.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (m.includes('network') || m.includes('fetch'))
    return 'Network error. Check your connection and try again.'
  return message
}

function ErrorMsg({ msg }) {
  if (!msg) return null
  return (
    <div className="auth-error">
      <span className="auth-error-icon">⚠</span>
      {msg}
    </div>
  )
}

function FieldError({ msg }) {
  if (!msg) return null
  return <p className="auth-field-error">{msg}</p>
}

export function AuthPage({ onSignIn, onSignUp }) {
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  // Per-field errors
  const [errors, setErrors] = useState({})
  // Top-level form error
  const [formError, setFormError] = useState('')

  // Username availability check
  const [usernameTaken, setUsernameTaken] = useState(false)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const usernameTimer = useRef(null)

  const clearErrors = () => {
    setErrors({})
    setFormError('')
  }

  const handleToggleView = () => {
    setView(v => v === 'login' ? 'register' : 'login')
    setEmail('')
    setPassword('')
    setName('')
    setUsername('')
    setUsernameTaken(false)
    clearErrors()
  }

  // Debounced username availability check
  useEffect(() => {
    if (!username || view !== 'register') {
      setUsernameTaken(false)
      return
    }
    clearTimeout(usernameTimer.current)
    usernameTimer.current = setTimeout(async () => {
      setCheckingUsername(true)
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      setCheckingUsername(false)
      setUsernameTaken(!!data)
    }, 450)
    return () => clearTimeout(usernameTimer.current)
  }, [username, view])

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    clearErrors()

    const errs = {}
    if (!email.trim()) errs.email = 'Email is required.'
    if (!password) errs.password = 'Password is required.'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const { error } = await onSignIn(email, password)
    setLoading(false)

    if (error) {
      const msg = friendlyError(error.message)
      // Attribute error to the right field when possible
      if (msg.includes('email') || msg.includes('credentials') || msg.includes('password')) {
        setFormError(msg)
        setErrors({ email: ' ', password: ' ' }) // highlights both fields red
      } else {
        setFormError(msg)
      }
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    clearErrors()

    const errs = {}
    if (!name.trim()) errs.name = 'Display name is required.'
    if (!username.trim()) errs.username = 'Username is required.'
    if (usernameTaken) errs.username = 'This username is already taken.'
    if (!email.trim()) errs.email = 'Email is required.'
    if (!password) errs.password = 'Password is required.'
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const { error } = await onSignUp(
      email,
      password,
      name.trim(),
      username.trim().toLowerCase().replace(/\s/g, '')
    )
    setLoading(false)

    if (error) {
      const msg = friendlyError(error.message)
      if (msg.toLowerCase().includes('email')) {
        setErrors({ email: msg })
      } else {
        setFormError(msg)
      }
    } else {
      setSentEmail(email)
      setView('check_email')
    }
  }

  const inputClass = (field) =>
    errors[field] && errors[field] !== ' ' ? 'auth-input-error' : ''

  if (view === 'check_email') return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>Check your email</h2>
        <p className="auth-sub">A confirmation link was sent to<br /><strong>{sentEmail}</strong></p>
        <button className="btn-text" onClick={() => setView('login')}>Back to sign in</button>
      </div>
    </div>
  )

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-sub">
          {view === 'login' ? 'Sign in to your dashboard' : 'Start tracking your portfolio'}
        </p>

        {/* Top-level form error banner */}
        <ErrorMsg msg={formError} />

        {view === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit} id="login-form" noValidate>
            <div className="auth-field">
              <input
                type="email"
                name="email"
                id="login-email"
                placeholder="email address"
                autoComplete="username email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); setFormError('') }}
                className={inputClass('email')}
              />
              <FieldError msg={errors.email !== ' ' ? errors.email : ''} />
            </div>
            <div className="auth-field">
              <input
                type="password"
                name="password"
                id="login-password"
                placeholder="password"
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); setFormError('') }}
                className={inputClass('password')}
              />
              <FieldError msg={errors.password !== ' ' ? errors.password : ''} />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit} id="register-form" noValidate>
            <div className="auth-field">
              <input
                type="text"
                name="name"
                id="register-name"
                placeholder="display name"
                autoComplete="name"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
                className={inputClass('name')}
              />
              <FieldError msg={errors.name} />
            </div>
            <div className="auth-field">
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  name="username"
                  id="register-username"
                  placeholder="username (no spaces)"
                  autoComplete="off"
                  value={username}
                  onChange={e => {
                    setUsername(e.target.value.replace(/\s/g, '').toLowerCase())
                    setErrors(p => ({ ...p, username: '' }))
                    setUsernameTaken(false)
                  }}
                  className={inputClass('username') || (usernameTaken ? 'auth-input-error' : '')}
                  style={{ paddingRight: 32 }}
                />
                {/* Live availability indicator */}
                {username.length > 0 && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 14, lineHeight: 1,
                    color: checkingUsername ? 'var(--faint)' : usernameTaken ? '#dc2626' : '#16a34a',
                  }}>
                    {checkingUsername ? '…' : usernameTaken ? '✕' : '✓'}
                  </span>
                )}
              </div>
              {usernameTaken
                ? <FieldError msg="This username is already taken." />
                : <FieldError msg={errors.username} />
              }
            </div>
            <div className="auth-field">
              <input
                type="email"
                name="email"
                id="register-email"
                placeholder="email address"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); setFormError('') }}
                className={inputClass('email')}
              />
              <FieldError msg={errors.email} />
            </div>
            <div className="auth-field">
              <input
                type="password"
                name="password"
                id="register-password"
                placeholder="password (min 6 characters)"
                autoComplete="new-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })) }}
                className={inputClass('password')}
              />
              <FieldError msg={errors.password} />
            </div>
            <button className="btn-primary" type="submit" disabled={loading || usernameTaken || checkingUsername}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        <button className="btn-text" onClick={handleToggleView} type="button">
          {view === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
