
import { useState } from 'react'

export function SocialView({ social, portfolioFolders }) {
  const [editing, setEditing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [profile, setProfile] = useState({
    name: social.profile?.name || 'Investor',
    username:
      social.profile?.username ||
      `user_${Math.floor(Math.random() * 9999)}`,
  })

  return (
    <div className="network-layout">
      <div className="profile-hero">
        <div
          className="profile-avatar clickable"
          onClick={() => setEditing(true)}
        >
          {profile.name.charAt(0).toUpperCase()}
        </div>

        <div className="profile-meta">
          <h2>{profile.name}</h2>
          <p>@{profile.username}</p>
        </div>

        <button
          className="edit-profile-btn"
          onClick={() => setEditing(true)}
        >
          Edit Profile
        </button>
      </div>

      {editing && (
        <div className="profile-modal-overlay">
          <div className="profile-modal">
            <div className="modal-top">
              <h3>Edit Profile</h3>

              <button
                className="close-btn"
                onClick={() => setEditing(false)}
              >
                ✕
              </button>
            </div>

            <div className="avatar-upload-area">
              <div className="profile-avatar large">
                {profile.name.charAt(0).toUpperCase()}
              </div>

              <label className="upload-btn">
                Upload Profile Picture
                <input type="file" hidden />
              </label>
            </div>

            <div className="form-group">
              <label>Name</label>

              <input
                className="network-input"
                value={profile.name}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Username</label>

              <input
                className="network-input"
                value={profile.username}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    username: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={() => setShowConfirm(true)}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="profile-modal-overlay">
          <div className="confirm-box">
            <h3>Save Profile Changes?</h3>

            <p>
              Your avatar, name and username will be updated.
            </p>

            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="save-btn"
                onClick={() => {
                  social.updateProfile(profile)
                  setShowConfirm(false)
                  setEditing(false)
                }}
              >
                Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="network-card">
        <h3 className="section-title">Portfolio Privacy</h3>

        <div className="network-list">
          {portfolioFolders.map((folder) => (
            <div key={folder.id} className="network-row">
              <div>
                <div className="network-name">
                  {folder.name}
                </div>

                <div className="network-subtext">
                  {folder.is_public
                    ? 'Visible to followers'
                    : 'Private portfolio'}
                </div>
              </div>

              <button
                className={`eye-toggle ${
                  folder.is_public ? 'public' : 'private'
                }`}
                onClick={() =>
                  social.togglePortfolioPrivacy(
                    folder.id,
                    !folder.is_public
                  )
                }
              >
                {folder.is_public ? '👁 Public' : '🙈 Private'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {social.requests && social.requests.length > 0 && (
        <div className="network-card">
          <h3 className="section-title">Follow Requests ({social.requests.length})</h3>
          <div className="network-list">
            {social.requests.map((req) => (
              <div key={req.id} className="network-row">
                <div>
                  <div className="network-name">
                    {req.requester_id}
                  </div>
                  <div className="network-subtext">
                    Requesting to follow
                  </div>
                </div>
                <div className="network-actions">
                  <button
                    className="privacy-toggle public"
                    onClick={() => social.respondToRequest(req.id, 'accepted')}
                  >
                    Accept
                  </button>
                  <button
                    className="privacy-toggle private"
                    onClick={() => social.respondToRequest(req.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="network-card">
        <h3 className="section-title">Find Investors</h3>

        <input
          className="network-input"
          placeholder="Search username or name..."
          value={social.searchTerm}
          onChange={(e) => social.setSearchTerm(e.target.value)}
        />

        {social.searchTerm && (
          <div className="network-list" style={{ marginTop: '12px' }}>
            {social.profiles && social.profiles.length > 0 ? (
              social.profiles.map((prof) => (
                <div key={prof.id} className="network-row">
                  <div className="network-user">
                    <div className="network-avatar">
                      {prof.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="network-name">{prof.name}</div>
                      <div className="network-subtext">@{prof.username}</div>
                    </div>
                  </div>
                  <button
                    className="privacy-toggle public"
                    onClick={() => social.sendFollowRequest(prof.id)}
                  >
                    Follow
                  </button>
                </div>
              ))
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
                No users found
              </div>
            )}
          </div>
        )}
      </div>

      {social.feed && social.feed.length > 0 && (
        <div className="network-card">
          <h3 className="section-title">Following Feed</h3>
          <div className="network-feed">
            {social.feed.map((portfolio) => (
              <div key={portfolio.id} className="feed-card">
                <div className="feed-top">
                  <div>
                    <div className="network-name">{portfolio.name}</div>
                    <div className="network-subtext">Public Portfolio</div>
                  </div>
                  <span className="feed-badge">📊 Portfolio</span>
                </div>
                <div className="feed-body">
                  Shared portfolio from investor
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
