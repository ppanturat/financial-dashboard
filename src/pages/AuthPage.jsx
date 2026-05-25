import { useState } from 'react'

export function AuthPage({ onSignIn, onSignUp }) {
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const handleToggleView = () => {
    setView(view === 'login' ? 'register' : 'login')
    // Clear inputs when swapping to prevent credential mix-ups
    setEmail('')
    setPassword('')
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
    setLoading(true)
    const { error } = await onSignUp(email, password)
    setLoading(false)
    if (error) {
      alert(error.message)
    } else {
      setSentEmail(email)
      setView('check_email')
    }
  }

  if (view === 'check_email') return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>check your email</h2>
        <p className="auth-sub">confirmation link sent to {sentEmail}</p>
        <button className="btn-text" onClick={() => setView('login')}>back to sign in</button>
      </div>
    </div>
  )

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>{view === 'login' ? 'welcome back' : 'create account'}</h2>
        <p className="auth-sub">
          {view === 'login' ? 'sign in to your dashboard' : 'start tracking your portfolio'}
        </p>

        {view === 'login' ? (
          <form className="auth-form" onSubmit={handleLoginSubmit} id="login-form">
            <input 
              type="email" 
              name="email"
              id="login-email"
              placeholder="email address" 
              autoComplete="username email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              name="password"
              id="login-password"
              placeholder="password" 
              autoComplete="current-password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'loading...' : 'sign in'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit} id="register-form">
            <input 
              type="email" 
              name="email"
              id="register-email"
              placeholder="email address" 
              autoComplete="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              name="password"
              id="register-password"
              placeholder="password" 
              autoComplete="new-password"
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
            />
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'loading...' : 'create account'}
            </button>
          </form>
        )}

        <button className="btn-text" onClick={handleToggleView} type="button">
          {view === 'login' ? "don't have an account? register" : 'already have an account? sign in'}
        </button>
      </div>
    </div>
  )
}