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

export function SetNewPasswordPage({ onUpdatePassword, onSignOut }) {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }

    setError('')
    setLoading(true)
    try {
      const result = await onUpdatePassword(password)
      if (result?.error) {
        setError(result.error.message || 'Could not update password. Please try again.')
      } else {
        setDone(true)
      }
    } catch (err) {
      console.error('[SetNewPasswordPage] unexpected error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>Password updated</h2>
        <p className="auth-sub">Your password has been changed successfully</p>
        <button className="btn-primary" type="button" onClick={onSignOut} style={{ marginTop: 4 }}>
          Continue to sign in
        </button>
      </div>
    </div>
  )

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">◈</div>
        <h2>Set a new password</h2>
        <p className="auth-sub">Choose a new password for your account</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }} noValidate>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              {error}
            </div>
          )}

          <input
            type="password"
            placeholder="New password (min 6 chars)"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Confirm new password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            style={inputStyle}
            required
          />

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
