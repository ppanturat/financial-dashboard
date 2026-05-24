export function ConfirmModal({ modal, onClose, onExecute }) {
  if (!modal.open) return null
  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{modal.title}</h3>
        <p>{modal.message}</p>
        <div className="modal-actions">
          <button className="btn-text" onClick={onClose}>Cancel</button>
          <button className="btn-primary btn-danger" onClick={onExecute}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
