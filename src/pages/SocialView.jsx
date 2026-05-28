
import { useState } from 'react'

export function SocialView({ social, portfolioFolders }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(social.profile?.name || 'Investor')
  const [username, setUsername] = useState(social.profile?.username || `user_${Math.floor(Math.random()*9999)}`)

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="desc-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <h3 className="desc-title">Your Profile</h3>
            <p className="desc-text">Configure your public investor identity.</p>
          </div>

          <button className="new-vault-btn" onClick={() => {
            if (editing) {
              social.updateProfile({ name, username })
            }
            setEditing(!editing)
          }}>
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <input value={name} disabled={!editing} onChange={e => setName(e.target.value)} placeholder="name" />
          <input value={username} disabled={!editing} onChange={e => setUsername(e.target.value)} placeholder="username" />
        </div>
      </div>

      <div className="desc-card">
        <h3 className="desc-title">Portfolio Privacy</h3>

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {portfolioFolders.map(folder => (
            <div key={folder.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div>{folder.name}</div>

              <button
                className="new-vault-btn"
                onClick={() => social.togglePortfolioPrivacy(folder.id, !folder.is_public)}
              >
                {folder.is_public ? 'Public' : 'Private'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="desc-card">
        <h3 className="desc-title">Find Investors</h3>
        <p className="desc-text">Search username and send follow requests.</p>

        <input
          style={{ marginTop: 16 }}
          placeholder="Search username..."
          value={social.searchTerm}
          onChange={e => social.setSearchTerm(e.target.value)}
        />

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {social.profiles.map(profile => (
            <div key={profile.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div>
                <div>{profile.name || 'Unnamed User'}</div>
                <div style={{ opacity: .7, fontSize: 12 }}>@{profile.username || profile.id}</div>
              </div>

              <button className="new-vault-btn" onClick={() => social.sendFollowRequest(profile.id)}>
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="desc-card">
        <h3 className="desc-title">Pending Requests</h3>

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {social.requests.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{req.requester_user_id}</span>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="new-vault-btn" onClick={() => social.respondToRequest(req.id, 'accepted')}>
                  Accept
                </button>

                <button className="new-vault-btn" onClick={() => social.respondToRequest(req.id, 'rejected')}>
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="desc-card">
        <h3 className="desc-title">Following Feed</h3>

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {social.feed.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{item.name}</strong>
                <span>Public Portfolio</span>
              </div>

              <div style={{ marginTop: 10, opacity: .7 }}>
                Visible because the user accepted your request.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
