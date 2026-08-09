import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { NetworkFeed } from './NetworkFeed'
import { UserPortfolioPage } from './UserPortfolioPage'
import { Avatar } from '../components/Avatar'

// shared primitives

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '18px 20px', ...style
    }}>{children}</div>
  )
}

function SectionLabel({ children, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>{children}</span>
      {count != null && (
        <span style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--faint)', border: '1px solid var(--border-md)', padding: '1px 7px', borderRadius: 99, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      )}
    </div>
  )
}

function Badge({ color = '#16a34a', bg = '#f0fdf4', border = '#bbf7d0', children }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, border: `1px solid ${border}`, padding: '1px 7px', borderRadius: 99, flexShrink: 0 }}>
      {children}
    </span>
  )
}

// avatar uploader
function AvatarUploader({ name, currentUrl, userId, onUploaded }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { alert('Max 3 MB'); return }
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const ext  = file.name.split('.').pop()
      const path = `avatars/${userId}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      onUploaded(data.publicUrl + '?t=' + Date.now())
    } catch (err) {
      setPreview(currentUrl || null)
      alert('Upload failed: ' + (err.message || 'unknown error'))
    } finally { setUploading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ position: 'relative' }}>
        <Avatar name={name || 'U'} avatarUrl={preview} size={72} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%',
          background: uploading ? 'var(--muted)' : 'var(--accent)', border: '2px solid var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 12, color: '#fff',
        }} title="Change photo">{uploading ? '…' : '✎'}</button>
      </div>
      <span style={{ fontSize: 11, color: 'var(--faint)' }}>{uploading ? 'Uploading…' : 'Click ✎ to change photo'}</span>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

// edit profile modal
function EditProfileModal({ profile, userId, onSave, onClose }) {
  const [form, setForm] = useState({ name: profile?.name || '', username: profile?.username || '', avatar_url: profile?.avatar_url || '' })
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    width: '100%', padding: '10px 13px', background: 'var(--surface-2)',
    border: '1px solid var(--border-md)', borderRadius: 10, fontSize: 14,
    color: 'var(--text)', fontFamily: "var(--font-body), sans-serif", outline: 'none',
    boxSizing: 'border-box', transition: 'border-color .15s',
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.username.trim()) return
    setSaving(true); await onSave(form); setSaving(false); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(245,244,241,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 20, padding: '24px 24px 20px', width: '100%', maxWidth: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>Edit Profile</span>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>
        <AvatarUploader name={form.name} currentUrl={form.avatar_url} userId={userId} onUploaded={url => setForm(f => ({ ...f, avatar_url: url }))} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Display Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-md)'} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', fontSize: 14, fontFamily: "var(--font-body), monospace", pointerEvents: 'none' }}>@</span>
              <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s/g, '').toLowerCase() }))} placeholder="username" style={{ ...inputStyle, paddingLeft: 28, fontFamily: "var(--font-body), monospace" }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-md)'} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.username.trim()} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PrivacyToggle({ isPublic, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
      cursor: 'pointer', border: 'none', fontFamily: "var(--font-body), sans-serif", fontSize: 12, fontWeight: 600,
      transition: 'all .15s', flexShrink: 0,
      background: isPublic ? '#f0fdf4' : 'var(--surface-2)',
      color: isPublic ? '#16a34a' : 'var(--muted)',
      outline: isPublic ? '1px solid #bbf7d0' : '1px solid var(--border-md)',
    }}>
      <span style={{ fontSize: 13 }}>{isPublic ? '👁' : '🔒'}</span>
      {isPublic ? 'Public' : 'Private'}
    </button>
  )
}

// user row
function UserRow({ user, right, sub, pinnedAction }) {
  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column', gap: 8,
      padding: pinnedAction ? '10px 13px 44px' : '10px 13px', borderRadius: 12,
      background: 'var(--surface-2)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <Avatar name={user.name || user.username || '?'} avatarUrl={user.avatar_url} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.name || 'Investor'}
          </div>
          {user.username && (
            <div style={{ fontFamily: "var(--font-body), monospace", fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>@{user.username}</div>
          )}
        </div>
      </div>

      {(sub || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{sub}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{right}</div>
        </div>
      )}

      {pinnedAction && (
        <div style={{ position: 'absolute', bottom: 10, right: 13 }}>{pinnedAction}</div>
      )}
    </div>
  )
}

// generic list modal (following/followers/portfolios stat clicks)
function ListModal({ title, count, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(245,244,241,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border-md)', borderRadius: 20, padding: '24px 24px 20px', width: '100%', maxWidth: 440, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
            {count != null && (
              <span style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--faint)', border: '1px solid var(--border-md)', padding: '1px 7px', borderRadius: 99, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', display: 'grid', gap: 10 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// main SocialView

export function SocialView({ social, portfolioFolders, session, togglePortfolioPrivacy }) {
  const [editing, setEditing]           = useState(false)
  const [viewingUser, setViewingUser]   = useState(null)
  const [listModal, setListModal]       = useState(null) // 'following' | 'followers' | 'portfolios' | null

  const profile     = social.profile
  const displayName = profile?.name || 'Investor'
  const username    = profile?.username || 'user'
  const avatarUrl   = profile?.avatar_url || null
  const getStatus   = id => social.getSentRequestStatus(id)

  const myFollowing  = social.followedUsers?.length || 0
  const myFollowers  = social.followers?.length || 0
  const myPortfolios = portfolioFolders?.length || 0
  const myPublic     = portfolioFolders?.filter(f => f.is_public)?.length || 0

  const statTileStyle = { display: 'flex', flexDirection: 'column', gap: 0, background: 'none', border: 'none', padding: 0, textAlign: 'left', font: 'inherit' }
  const statValueStyle = { fontSize: 14, fontWeight: 800, color: 'var(--text)', fontFamily: "var(--font-body), monospace" }
  const statLabelStyle = { fontSize: 10, color: 'var(--faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }

  if (viewingUser) {
    return (
      <UserPortfolioPage
        user={viewingUser}
        feed={social.feed || []}
        feedHoldings={social.feedHoldings || []}
        onBack={() => setViewingUser(null)}
      />
    )
  }

  return (
    <div style={{ display: 'grid', gap: 14, width: '100%', alignContent: 'start' }}>

      {/* ── My Profile ── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Avatar name={displayName} avatarUrl={avatarUrl} size={56} />
          <div style={{ flex: '1 1 160px', minWidth: 160 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
            <div style={{ fontFamily: "var(--font-body), monospace", fontSize: 12, color: 'var(--faint)', marginTop: 2 }}>@{username}</div>
            {/* following/followers/portfolios stats open a list on click */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px 16px', marginTop: 10, maxWidth: 220 }}>
              <button onClick={() => setListModal('following')} style={{ ...statTileStyle, cursor: 'pointer' }}>
                <span style={statValueStyle}>{myFollowing}</span>
                <span style={statLabelStyle}>Following</span>
              </button>
              <button onClick={() => setListModal('followers')} style={{ ...statTileStyle, cursor: 'pointer' }}>
                <span style={statValueStyle}>{myFollowers}</span>
                <span style={statLabelStyle}>Followers</span>
              </button>
              <button onClick={() => setListModal('portfolios')} style={{ ...statTileStyle, cursor: 'pointer' }}>
                <span style={statValueStyle}>{myPortfolios}</span>
                <span style={statLabelStyle}>Portfolios</span>
              </button>
              <div style={statTileStyle}>
                <span style={statValueStyle}>{myPublic}</span>
                <span style={statLabelStyle}>Public</span>
              </div>
            </div>
          </div>
          <button onClick={() => setEditing(true)} style={{
            padding: '8px 16px', borderRadius: 10, flexShrink: 0,
            background: 'var(--surface-2)', border: '1px solid var(--border-md)',
            color: 'var(--text)', fontSize: 13, fontWeight: 600,
            fontFamily: "var(--font-body), sans-serif", cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'transparent' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-md)' }}
          >Edit Profile</button>
        </div>
      </Card>

      {/* ── Incoming requests ── */}
      {social.requests?.length > 0 && (
        <Card>
          <SectionLabel count={social.requests.length}>Follow Requests</SectionLabel>
          <div style={{ display: 'grid', gap: 8 }}>
            {social.requests.map(req => {
              const reqProfile = social.profiles?.find(p => p.id === req.requester_user_id) || {}
              return (
                <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 13px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <Avatar name={reqProfile.name || reqProfile.username || '?'} avatarUrl={reqProfile.avatar_url} size={36} />
                  <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{reqProfile.name || 'Investor'}</div>
                    {reqProfile.username && <div style={{ fontSize: 11, color: 'var(--faint)', fontFamily: "var(--font-body), monospace", marginTop: 1 }}>@{reqProfile.username}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => social.respondToRequest(req.id, 'rejected')} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body), sans-serif" }}>Decline</button>
                    <button onClick={() => social.respondToRequest(req.id, 'accepted')} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body), sans-serif" }}>Accept</button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* network feed — trades/portfolios from people you follow */}
      <NetworkFeed social={social} />

      {/* ── Following list modal ── */}
      {listModal === 'following' && (
        <ListModal title="Following" count={social.followedUsers?.length} onClose={() => setListModal(null)}>
          {!social.followedUsers?.length ? (
            <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>Not following anyone yet — search below to find investors.</p>
          ) : social.followedUsers.map(u => {
            const pubFolders = social.feed?.filter(f => f.user_id === u.id) || []
            const followsBack = social.followers?.some(f => f.id === u.id)
            return (
              <UserRow key={u.id} user={u}
                sub={
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {pubFolders.length > 0 && <Badge>{pubFolders.length} public portfolio{pubFolders.length > 1 ? 's' : ''}</Badge>}
                    {followsBack && <Badge color="#7c3aed" bg="#f5f3ff" border="#ddd6fe">Mutual</Badge>}
                  </div>
                }
                right={
                  pubFolders.length > 0 && (
                    <button
                      onClick={() => { setViewingUser(u); setListModal(null) }}
                      style={{
                        padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
                        background: 'var(--surface-2)', border: '1px solid var(--border-md)',
                        color: 'var(--text)', fontSize: 12, fontWeight: 600,
                        fontFamily: "var(--font-body), sans-serif", transition: 'all .15s',
                      }}
                    >
                      View Portfolio →
                    </button>
                  )
                }
                pinnedAction={
                  <button onClick={() => social.unfollow(u.id)} style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border-md)', color: 'var(--muted)', fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.color = '#dc2626' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-md)'; e.currentTarget.style.color = 'var(--muted)' }}
                  >Unfollow</button>
                }
              />
            )
          })}
        </ListModal>
      )}

      {/* ── Followers list modal ── */}
      {listModal === 'followers' && (
        <ListModal title="Followers" count={social.followers?.length} onClose={() => setListModal(null)}>
          {!social.followers?.length ? (
            <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No followers yet.</p>
          ) : social.followers.map(u => {
            const status         = getStatus(u.id)
            const isFollowingBack = social.followedUsers?.some(f => f.id === u.id)
            return (
              <UserRow key={u.id} user={u} sub={null}
                right={
                  isFollowingBack ? (
                    <span style={{ padding: '6px 12px', borderRadius: 8, flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>Following back</span>
                  ) : status === 'pending' ? (
                    <span style={{ padding: '6px 12px', borderRadius: 8, flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body), sans-serif", background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border-md)' }}>Pending</span>
                  ) : (
                    <button onClick={() => social.sendFollowRequest(u.id)} style={{ padding: '6px 14px', borderRadius: 8, cursor: 'pointer', flexShrink: 0, background: 'var(--accent)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: "var(--font-body), sans-serif" }}>Follow back</button>
                  )
                }
              />
            )
          })}
        </ListModal>
      )}

      {listModal === 'portfolios' && (
        <ListModal title="Portfolios" count={portfolioFolders?.length} onClose={() => setListModal(null)}>
          {!portfolioFolders?.length ? (
            <p style={{ fontSize: 13, color: 'var(--faint)', fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>No portfolios yet. Create one in the Portfolio tab.</p>
          ) : portfolioFolders.map(folder => (
            <div key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '11px 13px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: folder.is_public ? '#16a34a' : 'var(--faint)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</div>
                <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 2 }}>{folder.is_public ? 'Visible to followers' : 'Only visible to you'}</div>
              </div>
              <PrivacyToggle isPublic={folder.is_public} onClick={() => togglePortfolioPrivacy(folder.id, !folder.is_public)} />
            </div>
          ))}
        </ListModal>
      )}

      {editing && <EditProfileModal profile={profile} userId={session?.user?.id} onSave={social.updateProfile} onClose={() => setEditing(false)} />}
    </div>
  )
}
