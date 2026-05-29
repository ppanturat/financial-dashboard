import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 40, style = {} }) {
  const initials = (name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const fontSize = size > 50 ? 20 : size > 36 ? 15 : 12

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%', flexShrink: 0,
          objectFit: 'cover', border: '2px solid var(--border-md)',
          ...style,
        }}
      />
    )
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue}, 55%, 62%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize,
      fontFamily: "'Syne', sans-serif", userSelect: 'none', ...style,
    }}>
      {initials}
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '18px 20px', ...style
    }}>
      {children}
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        letterSpacing: '.1em', textTransform: 'uppercase'
      }}>{children}</span>
      {count != null && (
        <span style={{
          fontSize: 10,
          background: 'var(--surface-2)', color: 'var(--faint)',
          border: '1px solid var(--border-md)', padding: '1px 7px', borderRadius: 99,
          fontVariantNumeric: 'tabular-nums',
        }}>{count}</span>
      )}
    </div>
  )
}

// ── Avatar upload button ──────────────────────────────────────────────────────
function AvatarUploader({ name, currentUrl, userId, onUploaded }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { alert('Max 3 MB'); return }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setUploading(true)

    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${userId}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = data.publicUrl + '?t=' + Date.now()
      onUploaded(publicUrl)
    } catch (err) {
      console.error('Upload failed:', err)
      setPreview(currentUrl || null)
      alert('Upload failed: ' + (err.message || 'unknown error'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ position: 'relative' }}>
        <Avatar name={name || 'U'} avatarUrl={preview} size={72} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 24, height: 24, borderRadius: '50%',
            background: uploading ? 'var(--muted)' : 'var(--accent)',
            border: '2px solid var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: 12, color: '#fff', lineHeight: 1,
          }}
          title="Change photo"
        >
          {uploading ? '…' : '✎'}
        </button>
      </div>
      <span style={{ fontSize: 11, color: 'var(--faint)' }}>
        {uploading ? 'Uploading…' : 'Click ✎ to change photo'}
      </span>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}

// ── Edit Profile Modal ────────────────────────────────────────────────────────
function EditProfileModal({ profile, userId, onSave, onClose }) {
  const [form, setForm] = useState({
    name: profile?.name || '',
    username: profile?.username || '',
    avatar_url: profile?.avatar_url || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
    onClose()
  }

  const inputStyle = {
    width: '100%', padding: '10px 13px',
    background: 'var(--surface-2)', border: '1px solid var(--border-md)',
    borderRadius: 10, fontSize: 14, color: 'var(--text)',
    fontFamily: "'Syne', sans-serif", outline: 'none',
    boxSizing: 'border-box', transition: 'border-color .15s',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(245,244,241,0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-md)',
        borderRadius: 20, padding: '24px 24px 20px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Edit Profile</span>
          <button onClick={onClose} style={{
            background: 'var(--surface-2)', border: '1px solid var(--border-md)',
            borderRadius: 8, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--muted)', fontSize: 14, cursor: 'pointer', fontWeight: 600,
          }}>✕</button>
        </div>

        <AvatarUploader
          name={form.name}
          currentUrl={form.avatar_url}
          userId={userId}
          onUploaded={url => setForm(f => ({ ...f, avatar_url: url }))}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Display Name
            </label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
              style={inputStyle}
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
                style={{ ...inputStyle, paddingLeft: 28, fontFamily: "'DM Mono', monospace" }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 10,
            background: 'var(--surface-2)', border: '1px solid var(--border-md)',
            color: 'var(--muted)', fontSize: 14, fontWeight: 600,
            fontFamily: "'Syne', sans-serif", cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.username.trim()}
            style={{
              flex: 1, padding: '10px', borderRadius: 10,
              background: 'var(--accent)', border: 'none',
              color: '#fff', fontSize: 14, fontWeight: 600,
              fontFamily: "'Syne', sans-serif",
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1, transition: 'opacity .15s',
            }}
          >{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Privacy toggle ────────────────────────────────────────────────────────────
function PrivacyToggle({ isPublic, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
      border: 'none', fontFamily: "'Syne', sans-serif",
      fontSize: 12, fontWeight: 600, transition: 'all .15s', flexShrink: 0,
      background: isPublic ? '#f0fdf4' : 'var(--surface-2)',
      color: isPublic ? '#16a34a' : 'var(--muted)',
      outline: isPublic ? '1px solid #bbf7d0' : '1px solid var(--border-md)',
    }}>
      <span style={{ fontSize: 13 }}>{isPublic ? '👁' : '🔒'}</span>
      {isPublic ? 'Public' : 'Private'}
    </button>
  )
}

// ── Follow button with status — FIX #1: accepted shows Unfollow button ────────
function FollowButton({ status, onFollow, onUnfollow }) {
  if (status === 'accepted') {
    return (
      <button
        onClick={onUnfollow}
        title="Click to unfollow"
        style={{
          padding: '6px 14px', borderRadius: 8, flexShrink: 0,
          fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif",
          background: '#f0fdf4', color: '#16a34a',
          border: '1px solid #bbf7d0', cursor: 'pointer',
          transition: 'all .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#fee2e2'
          e.currentTarget.style.color = '#dc2626'
          e.currentTarget.style.borderColor = '#fecaca'
          e.currentTarget.textContent = 'Unfollow'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = '#f0fdf4'
          e.currentTarget.style.color = '#16a34a'
          e.currentTarget.style.borderColor = '#bbf7d0'
          e.currentTarget.textContent = 'Following'
        }}
      >Following</button>
    )
  }
  if (status === 'pending') {
    return (
      <span style={{
        padding: '6px 14px', borderRadius: 8, flexShrink: 0,
        fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif",
        background: 'var(--surface-2)', color: 'var(--muted)',
        border: '1px solid var(--border-md)',
      }}>Pending</span>
    )
  }
  if (status === 'rejected') {
    return (
      <button onClick={onFollow} style={{
        padding: '6px 14px', borderRadius: 8, flexShrink: 0,
        fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif",
        background: 'var(--surface-2)', color: 'var(--muted)',
        border: '1px solid var(--border-md)', cursor: 'pointer',
      }}>Request Again</button>
    )
  }
  return (
    <button onClick={onFollow} style={{
      padding: '6px 14px', borderRadius: 8, flexShrink: 0,
      cursor: 'pointer', border: 'none',
      fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif",
      background: 'var(--accent)', color: '#fff',
      transition: 'opacity .15s',
    }}>+ Follow</button>
  )
}

const searchInputStyle = {
  width: '100%', padding: '10px 13px 10px 36px',
  background: 'var(--surface-2)', border: '1px solid var(--border-md)',
  borderRadius: 10, fontSize: 14, color: 'var(--text)',
  fontFamily: "'Syne', sans-serif", outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .15s',
}

// ── Main SocialView ───────────────────────────────────────────────────────────
export function SocialView({ social, portfolioFolders, session, togglePortfolioPrivacy }) {
  const [editing, setEditing] = useState(false)
  const [searchVal, setSearchVal] = useState('')

  const profile = social.profile
  const displayName = profile?.name || 'Investor'
  const username = profile?.username || 'user'
  const avatarUrl = profile?.avatar_url || null

  const handleSendRequest = async (targetId) => {
    await social.sendFollowRequest(targetId)
  }

  const handleUnfollow = async (targetId) => {
    if (!window.confirm('Unfollow this investor?')) return
    await social.unfollow(targetId)
  }

  const filteredProfiles = (social.profiles || []).filter(p => {
    const q = searchVal.toLowerCase()
    return p.username?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
  })

  const getStatus = (profileId) => {
    if (social.followedUsers?.some(u => u.id === profileId)) return 'accepted'
    return social.getSentRequestStatus?.(profileId) || null
  }

  return (
    <div style={{ display: 'grid', gap: 14, width: '100%', alignContent: 'start' }}>

      {/* ── Profile Card ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar name={displayName} avatarUrl={avatarUrl} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--faint)', marginTop: 3 }}>
              @{username}
            </div>
            {/* FIX #2: follower/following counts */}
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{social.followedUsers?.length ?? 0}</strong> following
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{social.followers?.length ?? 0}</strong> followers
              </span>
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: '8px 16px', borderRadius: 10, flexShrink: 0,
              background: 'var(--surface-2)', border: '1px solid var(--border-md)',
              color: 'var(--text)', fontSize: 13, fontWeight: 600,
              fontFamily: "'Syne', sans-serif", cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
          >Edit Profile</button>
        </div>
      </Card>

      {/* ── Follow Requests (incoming) — FIX #3: shows real name + avatar ── */}
      {social.requests?.length > 0 && (
        <Card>
          <SectionLabel count={social.requests.length}>Follow Requests</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {social.requests.map(req => (
              <div key={req.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '11px 13px', borderRadius: 12,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
              }}>
                {/* requester_name and requester_avatar are now enriched by useSocial */}
                <Avatar
                  name={req.requester_name || req.requester_username || req.requester_user_id?.slice(0, 2) || '?'}
                  avatarUrl={req.requester_avatar}
                  size={36}
                />
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {req.requester_name || req.requester_username || (req.requester_user_id?.slice(0, 8) + '…')}
                  </div>
                  {req.requester_username && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>
                      @{req.requester_username}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>wants to follow you</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => social.respondToRequest(req.id, 'rejected')}
                    style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}
                  >Decline</button>
                  <button
                    onClick={() => social.respondToRequest(req.id, 'accepted')}
                    style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}
                  >Accept</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Followers (people who follow ME) — FIX #2 ── */}
      {social.followers?.length > 0 && (
        <Card>
          <SectionLabel count={social.followers.length}>Followers</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {social.followers.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 13px', borderRadius: 12,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
              }}>
                <Avatar name={u.name || u.username || '?'} avatarUrl={u.avatar_url} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.name || 'Investor'}
                  </div>
                  {u.username && (
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>
                      @{u.username}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                  background: 'var(--surface)', border: '1px solid var(--border-md)',
                  padding: '4px 10px', borderRadius: 99, flexShrink: 0,
                }}>Follows you</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Your Network (people you follow) — FIX #1: Unfollow + FIX #4: public portfolios ── */}
      {social.followedUsers?.length > 0 && (
        <Card>
          <SectionLabel count={social.followedUsers.length}>Your Network</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {social.followedUsers.map(u => {
              const userPortfolios = social.feed?.filter(p => p.user_id === u.id) || []
              const [expanded, setExpanded] = useState(false)
              return (
                <div key={u.id} style={{
                  borderRadius: 12, overflow: 'hidden',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                }}>
                  {/* User row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    padding: '11px 13px',
                  }}>
                    {/* FIX #3: avatar_url and name now correctly loaded from profiles table */}
                    <Avatar name={u.name || u.username || '?'} avatarUrl={u.avatar_url} size={36} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.name || 'Investor'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        {u.username && (
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)' }}>
                            @{u.username}
                          </span>
                        )}
                        {/* FIX #4: show portfolio count and expand button */}
                        {userPortfolios.length > 0 && (
                          <button
                            onClick={() => setExpanded(x => !x)}
                            style={{
                              fontSize: 10, fontWeight: 600, color: '#16a34a',
                              background: '#f0fdf4', border: '1px solid #bbf7d0',
                              padding: '1px 7px', borderRadius: 99, cursor: 'pointer',
                            }}
                          >
                            {userPortfolios.length} portfolio{userPortfolios.length > 1 ? 's' : ''} {expanded ? '▲' : '▼'}
                          </button>
                        )}
                      </div>
                    </div>
                    {/* FIX #1: Unfollow button */}
                    <FollowButton
                      status="accepted"
                      onUnfollow={() => handleUnfollow(u.id)}
                    />
                  </div>

                  {/* FIX #4: Expandable public portfolios list */}
                  {expanded && userPortfolios.length > 0 && (
                    <div style={{
                      borderTop: '1px solid var(--border)',
                      padding: '10px 13px',
                      display: 'grid', gap: 6,
                    }}>
                      {userPortfolios.map(pf => (
                        <div key={pf.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 10px', borderRadius: 8,
                          background: 'var(--surface)', border: '1px solid var(--border)',
                        }}>
                          <span style={{ fontSize: 12, color: '#16a34a' }}>📂</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                            {pf.name}
                          </span>
                          <span style={{
                            fontSize: 10, color: '#16a34a',
                            background: '#f0fdf4', border: '1px solid #bbf7d0',
                            padding: '2px 7px', borderRadius: 99, fontWeight: 600,
                          }}>Public</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
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
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                padding: '11px 13px', borderRadius: 12,
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
                  onClick={() => togglePortfolioPrivacy(folder.id, !folder.is_public)}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Find Investors ── */}
      <Card>
        <SectionLabel>Find Investors</SectionLabel>
        <div style={{ position: 'relative', marginBottom: searchVal ? 12 : 0 }}>
          <span style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--faint)', fontSize: 14, pointerEvents: 'none',
          }}>🔍</span>
          <input
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search by name or username…"
            style={searchInputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
          />
        </div>

        {searchVal ? (
          filteredProfiles.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--faint)', textAlign: 'center', padding: '12px 0', fontStyle: 'italic' }}>
              No investors found for "{searchVal}"
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {filteredProfiles.map(p => {
                const status = getStatus(p.id)
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    padding: '10px 13px', borderRadius: 12,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                  }}>
                    <Avatar name={p.name || p.username || '?'} avatarUrl={p.avatar_url} size={36} />
                    <div style={{ flex: 1, minWidth: 80 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name || 'Investor'}
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>
                        @{p.username || p.id?.slice(0, 10)}
                      </div>
                    </div>
                    <FollowButton
                      status={status}
                      onFollow={() => handleSendRequest(p.id)}
                      onUnfollow={() => handleUnfollow(p.id)}
                    />
                  </div>
                )
              })}
            </div>
          )
        ) : (
          <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic' }}>
            Search for investors to send a follow request.
          </p>
        )}
      </Card>

      {/* Edit Modal */}
      {editing && (
        <EditProfileModal
          profile={profile}
          userId={session?.user?.id}
          onSave={social.updateProfile}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
