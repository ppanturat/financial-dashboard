import { useState } from 'react'

export function AuthPage({ onSignIn, onSignUp }) {
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentEmail, setSentEmail] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = view === 'login'
      ? await onSignIn(email, password)
      : await onSignUp(email, password)
    setLoading(false)
    if (error) alert(error.message)
    else if (view === 'register') { setSentEmail(email); setView('check_email') }
  }

  if (view === 'check_email') return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>Check Your Email</h2>
        <p className="auth-sub">Confirmation link sent to {sentEmail}</p>
        <button className="btn-text" onClick={() => setView('login')}>Back to Sign In</button>
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
        <form className="auth-form" onSubmit={submit}>
          <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Loading...' : view === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        <button className="btn-text" onClick={() => setView(view === 'login' ? 'register' : 'login')}>
          {view === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  )
}
