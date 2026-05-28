import { useState, useRef } from 'react'

// ── tiny Avatar component ────────────────────────────────────────────────────
function Avatar({ name, size = 40, style = {} }) {
  const initials = (name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  // deterministic pastel from name
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 55%, 62%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700,
      fontSize: size > 50 ? 20 : size > 36 ? 15 : 12,
      fontFamily: "'Syne', sans-serif",
      userSelect: 'none',
      ...style,
    }}>
      {initials}
    </div>
  )
}

// ── Section card wrapper ─────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '20px 22px', ...style
    }}>
      {children}
    </div>
  )
}

// ── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ children, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14
    }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        letterSpacing: '.1em', textTransform: 'uppercase'
      }}>{children}</span>
      {count != null && (
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          background: 'var(--surface-2)', color: 'var(--faint)',
          border: '1px solid var(--border-md)',
          padding: '1px 7px', borderRadius: 99
        }}>{count}</span>
      )}
    </div>
  )
}

// ── Edit Profile Modal ───────────────────────────────────────────────────────
function EditProfileModal({ profile, onSave, onClose }) {
  const [form, setForm] = useState({ name: profile?.name || '', username: profile?.username || '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  return (
    // overlay uses var(--bg) tinted, NOT black
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(245,244,241,0.85)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-md)',
        borderRadius: 18, padding: '28px 28px 24px', width: '100%', maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
      }}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Edit Profile</span>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-md)',
              borderRadius: 8, width: 30, height: 30,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)', fontSize: 14, cursor: 'pointer', fontWeight: 600,
            }}
          >✕</button>
        </div>

        {/* Avatar preview */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Avatar name={form.name || 'U'} size={68} />
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Display Name
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              style={{
                width: '100%', padding: '10px 13px',
                background: 'var(--surface-2)', border: '1px solid var(--border-md)',
                borderRadius: 10, fontSize: 14, color: 'var(--text)',
                fontFamily: "'Syne', sans-serif", outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color .15s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--faint)', fontSize: 14, fontFamily: "'DM Mono', monospace",
                pointerEvents: 'none',
              }}>@</span>
              <input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                placeholder="username"
                style={{
                  width: '100%', padding: '10px 13px 10px 28px',
                  background: 'var(--surface-2)', border: '1px solid var(--border-md)',
                  borderRadius: 10, fontSize: 14, color: 'var(--text)',
                  fontFamily: "'DM Mono', monospace", outline: 'none',
                  boxSizing: 'border-box', transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--border-md)',
              color: 'var(--muted)', fontSize: 14, fontWeight: 600,
              fontFamily: "'Syne', sans-serif", cursor: 'pointer',
            }}
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.username.trim()}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: "'Syne', sans-serif", cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity .15s',
            }}
          >{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Privacy toggle button ────────────────────────────────────────────────────
function PrivacyToggle({ isPublic, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
        border: 'none', fontFamily: "'Syne', sans-serif",
        fontSize: 12, fontWeight: 600, transition: 'all .15s',
        background: isPublic ? '#f0fdf4' : 'var(--surface-2)',
        color: isPublic ? '#16a34a' : 'var(--muted)',
        outline: isPublic ? '1px solid #bbf7d0' : '1px solid var(--border-md)',
      }}
    >
      <span style={{ fontSize: 13 }}>{isPublic ? '👁' : '🔒'}</span>
      {isPublic ? 'Public' : 'Private'}
    </button>
  )
}

// ── Main SocialView ──────────────────────────────────────────────────────────
export function SocialView({ social, portfolioFolders }) {
  const [editing, setEditing] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [pendingSent, setPendingSent] = useState(new Set())

  const profile = social.profile
  const displayName = profile?.name || 'Investor'
  const username = profile?.username || 'user'

  const handleSendRequest = async (targetId) => {
    setPendingSent(prev => new Set([...prev, targetId]))
    await social.sendFollowRequest(targetId)
  }

  const filteredProfiles = (social.profiles || []).filter(p => {
    const q = searchVal.toLowerCase()
    return p.username?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640, width: '100%' }}>

      {/* ── Profile Card ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Avatar name={displayName} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
              {displayName}
            </div>
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)', marginTop: 3
            }}>@{username}</div>
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: '8px 16px', borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--border-md)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600,
              fontFamily: "'Syne', sans-serif", cursor: 'pointer',
              transition: 'all .15s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
          >
            Edit Profile
          </button>
        </div>
      </Card>

      {/* ── Follow Requests ── */}
      {social.requests?.length > 0 && (
        <Card>
          <SectionLabel count={social.requests.length}>Follow Requests</SectionLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            {social.requests.map(req => (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
              }}>
                <Avatar name={req.requester_user_id?.slice(0, 2) || '?'} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {req.requester_name || req.requester_user_id?.slice(0, 8) + '…'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>
                    wants to follow you
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => social.respondToRequest(req.id, 'rejected')}
                    style={{
                      padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                      background: 'var(--surface)', border: '1px solid var(--border-md)',
                      color: 'var(--muted)', fontSize: 12, fontWeight: 600,
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >Decline</button>
                  <button
                    onClick={() => social.respondToRequest(req.id, 'accepted')}
                    style={{
                      padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                      background: 'var(--accent)', border: 'none',
                      color: '#fff', fontSize: 12, fontWeight: 600,
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >Accept</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Portfolio Privacy ── */}
      <Card>
        <SectionLabel count={portfolioFolders?.length}>Portfolio Privacy</SectionLabel>
        {!portfolioFolders?.length ? (
          <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic' }}>
            No portfolios yet. Create one in the Portfolio tab.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {portfolioFolders.map(folder => (
              <div key={folder.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                transition: 'border-color .15s',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: folder.is_public ? '#16a34a' : 'var(--faint)',
                  transition: 'background .2s',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {folder.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                    {folder.is_public ? 'Visible to followers' : 'Only visible to you'}
                  </div>
                </div>
                <PrivacyToggle
                  isPublic={folder.is_public}
                  onClick={() => social.togglePortfolioPrivacy(folder.id, !folder.is_public)}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Following Feed ── */}
      {social.feed?.length > 0 && (
        <Card>
          <SectionLabel count={social.feed.length}>Following — Public Portfolios</SectionLabel>
          <div style={{ display: 'grid', gap: 10 }}>
            {social.feed.map(p => (
              <div key={p.id} style={{
                padding: '14px 16px', borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'linear-gradient(135deg, var(--surface), var(--surface-2))',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Avatar name={p.user_id?.slice(0, 2) || '?'} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--faint)' }}>public portfolio</div>
                  </div>
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                    background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                    padding: '2px 7px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.06em'
                  }}>Public</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Find Investors ── */}
      <Card>
        <SectionLabel>Find Investors</SectionLabel>
        <div style={{ position: 'relative', marginBottom: filteredProfiles.length ? 14 : 0 }}>
          <span style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--faint)', fontSize: 14, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search by name or username…"
            style={{
              width: '100%', padding: '10px 13px 10px 36px',
              background: 'var(--surface-2)', border: '1px solid var(--border-md)',
              borderRadius: 10, fontSize: 14, color: 'var(--text)',
              fontFamily: "'Syne', sans-serif", outline: 'none',
              boxSizing: 'border-box', transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
          />
        </div>

        {searchVal && (
          filteredProfiles.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              No investors found for "{searchVal}"
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filteredProfiles.map(p => {
                const sent = pendingSent.has(p.id)
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 12,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                  }}>
                    <Avatar name={p.name || p.username || '?'} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name || 'Investor'}
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                        @{p.username || p.id?.slice(0, 10)}
                      </div>
                    </div>
                    <button
                      onClick={() => !sent && handleSendRequest(p.id)}
                      disabled={sent}
                      style={{
                        padding: '6px 14px', borderRadius: 8, cursor: sent ? 'default' : 'pointer',
                        border: 'none', fontSize: 12, fontWeight: 600,
                        fontFamily: "'Syne', sans-serif", flexShrink: 0,
                        background: sent ? 'var(--surface-2)' : 'var(--accent)',
                        color: sent ? 'var(--muted)' : '#fff',
                        outline: sent ? '1px solid var(--border-md)' : 'none',
                        transition: 'all .15s',
                      }}
                    >{sent ? 'Requested' : '+ Follow'}</button>
                  </div>
                )
              })}
            </div>
          )
        )}

        {!searchVal && (
          <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic' }}>
            Search for investors to send a follow request.
          </p>
        )}
      </Card>

      {/* Edit Modal */}
      {editing && (
        <EditProfileModal
          profile={profile}
          onSave={social.updateProfile}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
