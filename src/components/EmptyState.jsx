export function EmptyState({ loading }) {
  if (loading) return (
    <div className="empty-state">
      <span className="spinner" /> loading workspace...
    </div>
  )
  return (
    <div className="empty-state">
      <span className="empty-icon">◈</span>
      <h3>your workspace is empty</h3>
      <p>create a folder in the sidebar, then search for a ticker above to get started.</p>
    </div>
  )
}
