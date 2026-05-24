import { useState } from 'react'

export function AuthPage({ onSignIn, onSignUp }) {
  const [view, setView] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState('')
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
        <form className="auth-form" onSubmit={submit}>
          <input type="email" placeholder="email address" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'loading...' : view === 'login' ? 'sign in' : 'create account'}
          </button>
        </form>
        <button className="btn-text" onClick={() => setView(view === 'login' ? 'register' : 'login')}>
          {view === 'login' ? "don't have an account? register" : 'already have an account? sign in'}
        </button>
      </div>
    </div>
  )
}
