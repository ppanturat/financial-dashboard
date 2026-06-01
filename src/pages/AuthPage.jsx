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
  fontFamily: "'Syne', sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color .15s',
}

function Field({ label, error, children }) {
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

export function AuthPage({ onSignIn, onSignUp }) {
  const [view, setView] = useState('login')

  // login state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState({})

  // register state
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regErrors, setRegErrors] = useState({})

  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const handleToggleView = () => {
    setView(v => v === 'login' ? 'register' : 'login')
    setLoginErrors({})
    setRegErrors({})
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoginErrors({})
    setLoading(true)
    const { error } = await onSignIn(loginEmail, loginPassword)
    setLoading(false)
    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('email')) {
        setLoginErrors({ general: 'Incorrect email or password. Please try again.' })
      } else if (msg.includes('confirm') || msg.includes('verified')) {
        setLoginErrors({ general: 'Please verify your email before signing in.' })
      } else {
        setLoginErrors({ general: error.message })
      }
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!regName.trim()) errs.name = 'Display name is required'
    if (!regUsername.trim()) errs.username = 'Username is required'
    else if (regUsername.length < 3) errs.username = 'Username must be at least 3 characters'
    else if (!/^[a-z0-9_]+$/.test(regUsername)) errs.username = 'Only lowercase letters, numbers and underscores'
    if (!regEmail.trim()) errs.email = 'Email is required'
    if (!regPassword) errs.password = 'Password is required'
    else if (regPassword.length < 6) errs.password = 'Password must be at least 6 characters'

    if (Object.keys(errs).length) { setRegErrors(errs); return }
    setRegErrors({})
    setLoading(true)
    const { error } = await onSignUp(regEmail, regPassword, regName.trim(), regUsername)
    setLoading(false)
    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('username') || msg.includes('taken')) {
        setRegErrors({ username: error.message })
      } else if (msg.includes('email') && msg.includes('already')) {
        setRegErrors({ email: 'An account with this email already exists.' })
      } else if (msg.includes('password')) {
        setRegErrors({ password: error.message })
      } else {
        setRegErrors({ general: error.message })
      }
    } else {
      setSentEmail(regEmail)
      setView('check_email')
    }
  }

  if (view === 'check_email') return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>Check your email</h2>
        <p className="auth-sub">Confirmation link sent to <strong>{sentEmail}</strong></p>
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

        {view === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit} id="login-form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loginErrors.general && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                {loginErrors.general}
              </div>
            )}
            <Field error={loginErrors.email}>
              <input
                type="email" placeholder="Email address"
                autoComplete="username email"
                value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                style={{ ...inputStyle, borderColor: loginErrors.email ? '#fca5a5' : undefined }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = loginErrors.email ? '#fca5a5' : 'var(--border-md)'}
                required
              />
            </Field>
            <Field error={loginErrors.password}>
              <input
                type="password" placeholder="Password"
                autoComplete="current-password"
                value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                style={{ ...inputStyle, borderColor: loginErrors.password ? '#fca5a5' : undefined }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = loginErrors.password ? '#fca5a5' : 'var(--border-md)'}
                required
              />
            </Field>
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit} id="register-form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {regErrors.general && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                {regErrors.general}
              </div>
            )}
            <Field error={regErrors.name}>
              <input
                type="text" placeholder="Display name"
                autoComplete="name"
                value={regName} onChange={e => setRegName(e.target.value)}
                style={{ ...inputStyle, borderColor: regErrors.name ? '#fca5a5' : undefined }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = regErrors.name ? '#fca5a5' : 'var(--border-md)'}
              />
            </Field>
            <Field error={regErrors.username}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 14, pointerEvents: 'none' }}>@</span>
                <input
                  type="text" placeholder="username"
                  autoComplete="username"
                  value={regUsername}
                  onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  style={{ ...inputStyle, paddingLeft: 30, borderColor: regErrors.username ? '#fca5a5' : undefined }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = regErrors.username ? '#fca5a5' : 'var(--border-md)'}
                />
              </div>
            </Field>
            <Field error={regErrors.email}>
              <input
                type="email" placeholder="Email address"
                autoComplete="email"
                value={regEmail} onChange={e => setRegEmail(e.target.value)}
                style={{ ...inputStyle, borderColor: regErrors.email ? '#fca5a5' : undefined }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = regErrors.email ? '#fca5a5' : 'var(--border-md)'}
                required
              />
            </Field>
            <Field error={regErrors.password}>
              <input
                type="password" placeholder="Password (min 6 chars)"
                autoComplete="new-password"
                value={regPassword} onChange={e => setRegPassword(e.target.value)}
                style={{ ...inputStyle, borderColor: regErrors.password ? '#fca5a5' : undefined }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = regErrors.password ? '#fca5a5' : 'var(--border-md)'}
                required
              />
            </Field>
            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
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
