
import { useState } from 'react'

export function SocialView({ social, portfolioFolders }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(social.profile?.name || 'Investor')
  const [username, setUsername] = useState(
    social.profile?.username || `user_${Math.floor(Math.random() * 9999)}`
  )

  return (
    <div className="network-layout">
      <div className="network-card">
        <div className="network-card-header">
          <div>
            <h3 className="desc-title">Your Profile</h3>
            <p className="desc-text">Configure your public investor identity.</p>
          </div>

          <button
            className="new-vault-btn"
            onClick={() => {
              if (editing) {
                social.updateProfile({ name, username })
              }
              setEditing(!editing)
            }}
          >
            {editing ? 'Save' : 'Edit'}
          </button>
        </div>

        <div className="network-input-grid">
          <input
            className="network-input"
            value={name}
            disabled={!editing}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name"
          />

          <input
            className="network-input"
            value={username}
            disabled={!editing}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
        </div>
      </div>

      <div className="network-card">
        <h3 className="desc-title">Portfolio Privacy</h3>

        <div className="network-list">
          {portfolioFolders.map((folder) => (
            <div key={folder.id} className="network-row">
              <div>
                <div className="network-name">{folder.name}</div>
                <div className="network-subtext">
                  {folder.is_public ? 'Visible to followers' : 'Private portfolio'}
                </div>
              </div>

              <button
                className={`privacy-toggle ${folder.is_public ? 'public' : 'private'}`}
                onClick={() =>
                  social.togglePortfolioPrivacy(folder.id, !folder.is_public)
                }
              >
                {folder.is_public ? 'Public' : 'Private'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="network-card">
        <h3 className="desc-title">Find Investors</h3>
        <p className="desc-text">Search usernames and expand your network.</p>

        <input
          className="network-input"
          placeholder="Search username..."
          value={social.searchTerm}
          onChange={(e) => social.setSearchTerm(e.target.value)}
        />

        <div className="network-list">
          {social.profiles.map((profile) => (
            <div key={profile.id} className="network-row">
              <div className="network-user">
                <div className="network-avatar">
                  {(profile.name || 'U').charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="network-name">
                    {profile.name || 'Unnamed User'}
                  </div>

                  <div className="network-subtext">
                    @{profile.username || profile.id}
                  </div>
                </div>
              </div>

              <button
                className="new-vault-btn"
                onClick={() => social.sendFollowRequest(profile.id)}
              >
                Follow
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="network-card">
        <h3 className="desc-title">Pending Requests</h3>

        <div className="network-list">
          {social.requests.map((req) => (
            <div key={req.id} className="network-row">
              <div>
                <div className="network-name">New Follow Request</div>
                <div className="network-subtext">
                  {req.requester_user_id}
                </div>
              </div>

              <div className="network-actions">
                <button
                  className="new-vault-btn"
                  onClick={() => social.respondToRequest(req.id, 'accepted')}
                >
                  Accept
                </button>

                <button
                  className="danger-btn"
                  onClick={() => social.respondToRequest(req.id, 'rejected')}
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="network-card">
        <h3 className="desc-title">Your Network</h3>

        <div className="network-feed">
          {social.feed.map((item) => (
            <div key={item.id} className="feed-card">
              <div className="feed-top">
                <div className="network-user">
                  <div className="network-avatar">
                    {(item.name || 'U').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="network-name">{item.name}</div>
                    <div className="network-subtext">
                      Public Portfolio
                    </div>
                  </div>
                </div>

                <div className="feed-badge">Following</div>
              </div>

              <div className="feed-body">
                Visible because this user accepted your follow request.
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
