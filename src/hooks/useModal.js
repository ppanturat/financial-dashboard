import { useState } from 'react'

export function useModal() {
  const [modal, setModal] = useState({ open: false, title: '', message: '', onConfirm: null })

  const confirm = (title, message, onConfirm) =>
    setModal({ open: true, title, message, onConfirm })

  const close = () =>
    setModal({ open: false, title: '', message: '', onConfirm: null })

  const execute = () => {
    modal.onConfirm?.()
    close()
  }

  return { modal, confirm, close, execute }
}
