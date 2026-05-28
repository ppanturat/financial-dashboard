export function SocialView({ social }) {
  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div className="desc-card">
        <h3 className="desc-title">Follow Investors</h3>
        <p className="desc-text">Search by username or user id and send follow requests before viewing public portfolios.</p>

        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {social.profiles.map(profile => (
            <div key={profile.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
              <div>
                <div>{profile.name || 'Unnamed User'}</div>
                <div style={{ opacity: .7, fontSize: 12 }}>@{profile.username || profile.id}</div>
              </div>
              <button className="new-vault-btn" onClick={() => social.sendFollowRequest(profile.id)}>Follow</button>
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
                <button className="new-vault-btn" onClick={() => social.respondToRequest(req.id, 'accepted')}>Accept</button>
                <button className="new-vault-btn" onClick={() => social.respondToRequest(req.id, 'rejected')}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="desc-card">
        <h3 className="desc-title">Public Portfolio Feed</h3>
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          {social.feed.map(item => (
            <div key={item.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{item.name}</strong>
                <span>@{item.profiles?.username || 'investor'}</span>
              </div>
              <div style={{ marginTop: 10, opacity: .7 }}>Shared portfolio snapshot visible to approved followers.</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
