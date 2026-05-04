'use client'
import { useState } from 'react'
import Modal from './Modal'
import { useCalendarEvents } from '@/hooks/useData'
import { Plus, Clock, Type, Palette } from 'lucide-react'

interface Props {
    userId: string
    onClose: () => void
}

const COLORS = [
    { label: 'Casting (Naranja)', hex: '#f97316' },
    { label: 'Trabajo (Verde)', hex: '#22c55e' },
    { label: 'Fitting (Azul)', hex: '#3b82f6' },
    { label: 'Callback (Amarillo)', hex: '#eab308' },
    { label: 'Finanzas (Rosa)', hex: '#d946ef' },
    { label: 'Viaje (Violeta)', hex: '#8b5cf6' },
    { label: 'Importante (Rojo)', hex: '#ef4444' },
]

export default function ManualEventModal({ onClose }: Omit<Props, 'userId'>) {
    const { create } = useCalendarEvents()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        title: '',
        event_date_start: new Date().toISOString().split('T')[0],
        event_time: '09:00',
        notes: '',
        custom_color: '#f97316'
    })

    const handleSave = async () => {
        if (!form.title) return alert('Ponle un título al evento')
        setLoading(true)
        try {
            await create({
                title: form.title,
                event_type: 'shooting_day', // Default type, we use custom_color + is_manual mostly
                event_date_start: form.event_date_start,
                event_date_end: null,
                event_time: form.event_time,
                notes: form.notes,
                is_manual: true,
                custom_color: form.custom_color,
                related_casting_id: null,
                related_project_id: null,
                related_finance_id: null
            })
            onClose()
        } catch (err) {
            console.error(err)
            alert('Error al crear el evento')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal open={true} title="Añadir Evento Manual" onClose={onClose}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
                
                <div className="form-group">
                    <label className="form-label"><Type size={12} style={{ marginRight: '6px' }} /> TÍTULO DEL EVENTO</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ej: Reunión con agente, Ensayo..."
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        autoFocus
                    />
                </div>

                <div className="form-grid">
                    <div className="form-group">
                        <label className="form-label">📅 FECHA</label>
                        <input 
                            type="date" 
                            className="form-input"
                            value={form.event_date_start}
                            onChange={e => setForm({ ...form, event_date_start: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label"><Clock size={12} style={{ marginRight: '6px' }} /> HORA</label>
                        <input 
                            type="time" 
                            className="form-input"
                            value={form.event_time}
                            onChange={e => setForm({ ...form, event_time: e.target.value })}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label"><Palette size={12} style={{ marginRight: '6px' }} /> COLOR EN CALENDARIO</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        {COLORS.map(c => (
                            <button
                                key={c.hex}
                                onClick={() => setForm({ ...form, custom_color: c.hex })}
                                style={{
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: c.hex,
                                    border: form.custom_color === c.hex ? '3px solid white' : '1px solid rgba(255,255,255,0.1)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s',
                                    boxShadow: form.custom_color === c.hex ? '0 0 0 2px ' + c.hex : 'none',
                                    transform: form.custom_color === c.hex ? 'scale(0.95)' : 'scale(1)'
                                }}
                                title={c.label}
                            />
                        ))}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">NOTAS ADICIONALES</label>
                    <textarea 
                        className="form-input" 
                        rows={3}
                        placeholder="Cualquier detalle extra…"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        style={{ resize: 'none' }}
                    />
                </div>

                <div style={{ marginTop: '10px' }}>
                    <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', height: '48px', fontSize: '15px' }}
                        disabled={loading}
                        onClick={handleSave}
                    >
                        {loading ? 'Guardando...' : 'Crear Evento en Calendario'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
