export function EmptyState({ loading }) {
  if (loading) return (
    <div className="empty-state">
      <span className="spinner" /> Loading workspace...
    </div>
  )
  return (
    <div className="empty-state">
      <span className="empty-icon">◈</span>
      <h3>Your Workspace is Empty</h3>
      <p>Create a folder in the sidebar, then search for a ticker above to get started.</p>
    </div>
  )
}
