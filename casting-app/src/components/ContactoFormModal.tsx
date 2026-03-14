'use client'
import { useState } from 'react'
import Modal from '@/components/Modal'
import { Contacto, TipoContacto } from '@/lib/supabase'
import { Save } from 'lucide-react'

type ContactoForm = Omit<Contacto, 'id' | 'created_at' | 'user_id'>

const defaultForm: ContactoForm = {
    nombre: '',
    tipo_contacto: 'director_casting',
    empresa: '',
    email: '',
    telefono: '',
    notas: '',
}

const tiposContacto: [TipoContacto, string][] = [
    ['director_casting', 'Director de Casting'], ['representante', 'Representante'],
    ['productor', 'Productor'], ['director', 'Director']
]

interface Props {
    open: boolean
    onClose: () => void
    onSave: (data: ContactoForm) => Promise<void>
    initial?: Contacto | null
}

export default function ContactoFormModal({ open, onClose, onSave, initial }: Props) {
    const [form, setForm] = useState<ContactoForm>(initial ? { ...initial } : defaultForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = (key: keyof ContactoForm, val: string) =>
        setForm(prev => ({ ...prev, [key]: val }))

    const handleSave = async () => {
        if (!form.nombre) { setError('El nombre es obligatorio.'); return }
        setSaving(true); setError(null)
        try {
            await onSave(form); onClose()
        } catch (e: unknown) {
            if (e instanceof Error) setError(e.message)
            else setError('Error al guardar')
        } finally { setSaving(false) }
    }

    const handleClose = () => {
        setForm(initial ? { ...initial } : defaultForm)
        setError(null); onClose()
    }

    return (
        <Modal
            open={open} onClose={handleClose}
            title={initial ? 'Editar Contacto' : 'Nuevo Contacto'}
            footer={
                <>
                    {error && <span style={{ color: 'var(--danger)', fontSize: '12px', marginRight: 'auto' }}>{error}</span>}
                    <button className="btn btn-secondary" onClick={handleClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        <Save size={14} />
                        {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </>
            }
        >
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input className="form-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Nombre completo" />
                </div>
                <div className="form-group">
                    <label className="form-label">Tipo de Contacto</label>
                    <select className="form-select" value={form.tipo_contacto} onChange={e => set('tipo_contacto', e.target.value as TipoContacto)}>
                        {tiposContacto.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Empresa / Agencia</label>
                <input className="form-input" value={form.empresa || ''} onChange={e => set('empresa', e.target.value)} placeholder="Nombre de la empresa" />
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="email@ejemplo.com" />
                </div>
                <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input type="tel" className="form-input" value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} placeholder="+34 000 000 000" />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Historia, proyectos trabajados juntos, observaciones..." />
            </div>
        </Modal>
    )
}
