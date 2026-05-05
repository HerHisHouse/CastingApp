'use client'
import { useState } from 'react'
import Modal from './Modal'
import { useCalendarEvents } from '@/hooks/useData'
import { Plus, Clock, Type, Palette, Calendar } from 'lucide-react'
import { EventType } from '@/lib/supabase'

interface Props {
    onClose: () => void
}

const COLORS = [
    { label: 'PPM', hex: '#f97316', type: 'opcionado_ppm' as EventType },
    { label: 'TRABAJO', hex: '#22c55e', type: 'shooting_day' as EventType },
    { label: 'FITTING', hex: '#3b82f6', type: 'wardrobe_fitting' as EventType },
    { label: 'CALLBACK', hex: '#eab308', type: 'callback' as EventType },
    { label: 'FINANZAS', hex: '#d946ef', type: 'finance_due' as EventType },
    { label: 'VIAJE', hex: '#8b5cf6', type: 'travel_day' as EventType },
    { label: 'CASTING', hex: '#ef4444', type: 'casting_deadline' as EventType },
    { label: 'ENSAYO', hex: '#ffffff', type: 'rehearsal' as EventType },
]

export default function ManualEventModal({ onClose }: Props) {
    const { create } = useCalendarEvents()
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        title: '',
        event_date_start: new Date().toISOString().split('T')[0],
        event_time: '09:00',
        event_time_end: '10:00',
        is_all_day: false,
        notes: '',
        custom_color: '#f97316',
        event_type: 'opcionado_ppm' as EventType
    })

    const handleSave = async () => {
        if (!form.title) return alert('Ponle un título al evento')
        setLoading(true)
        try {
            await create({
                title: form.title,
                event_type: form.event_type,
                event_date_start: form.event_date_start,
                event_date_end: null,
                event_time: form.is_all_day ? null : form.event_time,
                event_time_end: form.is_all_day ? null : form.event_time_end,
                is_all_day: form.is_all_day,
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
                
                {/* Título */}
                <div className="form-group">
                    <label className="form-label">
                        <Type size={12} style={{ marginRight: '6px' }} /> TÍTULO DEL EVENTO
                    </label>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ej: Reunión con agente, Ensayo..."
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        autoFocus
                    />
                </div>

                {/* iOS Style Settings Section */}
                <div style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    overflow: 'hidden'
                }}>
                    {/* Todo el día Toggle */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calendar size={16} color="var(--text-secondary)" />
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>Todo el día</span>
                        </div>
                        <label className="switch">
                            <input 
                                type="checkbox" 
                                checked={form.is_all_day}
                                onChange={e => setForm({ ...form, is_all_day: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </label>
                    </div>

                    {/* Fecha */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '12px 16px',
                        borderBottom: form.is_all_day ? 'none' : '1px solid var(--border)'
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>Fecha</span>
                        <input 
                            type="date" 
                            style={{ 
                                background: 'transparent', border: 'none', color: 'var(--accent-light)', 
                                fontSize: '14px', fontWeight: 600, outline: 'none', textAlign: 'right'
                            }}
                            value={form.event_date_start}
                            onChange={e => setForm({ ...form, event_date_start: e.target.value })}
                        />
                    </div>

                    {/* Horas (solo si no es Todo el día) */}
                    {!form.is_all_day && (
                        <>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '12px 16px',
                                borderBottom: '1px solid var(--border)'
                            }}>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Empieza</span>
                                <input 
                                    type="time" 
                                    style={{ 
                                        background: 'transparent', border: 'none', color: 'var(--accent-light)', 
                                        fontSize: '14px', fontWeight: 600, outline: 'none', textAlign: 'right'
                                    }}
                                    value={form.event_time}
                                    onChange={e => setForm({ ...form, event_time: e.target.value })}
                                />
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                padding: '12px 16px'
                            }}>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Finaliza</span>
                                <input 
                                    type="time" 
                                    style={{ 
                                        background: 'transparent', border: 'none', color: 'var(--accent-light)', 
                                        fontSize: '14px', fontWeight: 600, outline: 'none', textAlign: 'right'
                                    }}
                                    value={form.event_time_end}
                                    onChange={e => setForm({ ...form, event_time_end: e.target.value })}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Color Selector */}
                <div className="form-group">
                    <label className="form-label">
                        <Palette size={12} style={{ marginRight: '6px' }} /> COLOR EN CALENDARIO
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        {COLORS.map(c => (
                            <div key={c.hex} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <button
                                    onClick={() => setForm({ ...form, custom_color: c.hex, event_type: c.type })}
                                    style={{
                                        width: '100%',
                                        height: '32px',
                                        borderRadius: '6px',
                                        background: c.hex,
                                        border: form.custom_color === c.hex ? '3px solid white' : '1px solid rgba(255,255,255,0.1)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.1s',
                                        boxShadow: form.custom_color === c.hex ? '0 0 8px ' + c.hex : 'none',
                                        transform: form.custom_color === c.hex ? 'scale(1.05)' : 'scale(1)'
                                    }}
                                    title={c.label}
                                />
                                <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
                                    {c.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notas */}
                <div className="form-group">
                    <label className="form-label">NOTAS ADICIONALES</label>
                    <textarea 
                        className="form-input" 
                        rows={2}
                        placeholder="Cualquier detalle extra…"
                        value={form.notes}
                        onChange={e => setForm({ ...form, notes: e.target.value })}
                        style={{ resize: 'none' }}
                    />
                </div>

                <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                    <button 
                        className="btn btn-primary" 
                        style={{ 
                            width: '100%', 
                            height: '48px', 
                            fontSize: '15px', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center',
                            textAlign: 'center'
                        }}
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
