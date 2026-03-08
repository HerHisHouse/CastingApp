'use client'
import { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    children: ReactNode
    footer?: ReactNode
    maxWidth?: number
}

export default function Modal({ open, onClose, title, children, footer, maxWidth = 680 }: ModalProps) {
    if (!open) return null

    return (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
            <div className="modal" style={{ maxWidth }}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button className="btn btn-icon btn-ghost" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    )
}
