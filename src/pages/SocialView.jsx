
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

      <div className="network-card">
        <h3 className="section-title">Find Investors</h3>

        <input
          className="network-input"
          placeholder="Search username..."
          value={social.searchTerm}
          onChange={(e) => social.setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  )
}
