import { useState } from 'react'

export function AuthPage({ onSignIn, onSignUp }) {
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const handleToggleView = () => {
    setView(v => v === 'login' ? 'register' : 'login')
    setEmail(''); setPassword(''); setName(''); setUsername('')
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await onSignIn(email, password)
    setLoading(false)
    if (error) alert(error.message)
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { alert('Please enter your display name'); return }
    if (!username.trim()) { alert('Please enter a username'); return }
    setLoading(true)
    const { error } = await onSignUp(email, password, name.trim(), username.trim().toLowerCase().replace(/\s/g, ''))
    setLoading(false)
    if (error) { alert(error.message) }
    else { setSentEmail(email); setView('check_email') }
  }

  if (view === 'check_email') return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>Check your email</h2>
        <p className="auth-sub">Confirmation link sent to {sentEmail}</p>
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
          <form className="auth-form" onSubmit={handleLoginSubmit} id="login-form">
            <input
              type="email"
              name="email"
              id="login-email"
              placeholder="Email address"
              autoComplete="username email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              name="password"
              id="login-password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit} id="register-form">
            <input
              type="text"
              placeholder="Display name"
              autoComplete="name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--muted)', fontSize: 14, pointerEvents: 'none',
              }}>@</span>
              <input
                type="text"
                placeholder="username"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                style={{ paddingLeft: 28 }}
                required
              />
            </div>
            <input
              type="email"
              name="email"
              id="register-email"
              placeholder="Email address"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              name="password"
              id="register-password"
              placeholder="Password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <button className="btn-primary" type="submit" disabled={loading}>
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
