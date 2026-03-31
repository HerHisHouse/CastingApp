'use client'
import { useState, useMemo, useEffect } from 'react'
import Modal from '@/components/Modal'
import { Casting, TipoProyecto, TipoCasting, EstadoCasting, FuenteCasting } from '@/lib/supabase'
import { TIPOS_CASTING, TIPOS_PROYECTO, FUENTES } from '@/components/ui'
import { useCastings } from '@/hooks/useData'
import { Save, CheckCircle2, Circle, ArrowRight, Bell, X } from 'lucide-react'

type CastingForm = Omit<Casting, 'id' | 'created_at' | 'user_id'>

const defaultForm: CastingForm = {
    proyecto: '', personaje: '',
    tipo_proyecto: 'serie',
    director_casting: '', productora: '', plataforma_cliente: '',
    fecha_casting: new Date().toISOString().split('T')[0],
    tipo_casting: 'presencial',
    estado: 'pendiente',
    fue_opcionado: false, tuvo_callback: false, tipo_callback: null,
    notas: '',
    fuente_casting: 'representante', nombre_agencia: null,
    cobra_callback: false, tarifa_callback: null,
    localizacion: null, fechas_rodaje: null,
    prueba_vestuario_fecha: null,
    callback_fecha: null, callback_salario: 30,
    roles_seleccionados: null,
    ocp_tarifa_bruta: null, ocp_buyout: null,
    sec_tarifa_bruta: null, sec_buyout: null,
    fe_tarifa_bruta: null, fe_buyout: null,
    rol_seleccionado: null,
    tarifa_jornada: null, num_jornadas: null,
    horas_fitting_extra: null, tarifa_hora_extra: null,
    num_travel_days: null, horas_extra_convenio: null,
    derechos_imagen: null, comision_pct: null,
    importe_bruto: null, importe_neto: null,
    tarifa_neta_jornada: null, tarifa_traslado: null,
    num_takes: null,
    ppm_fecha: null,
    travel_fecha: null,
    travel_ida: null,
    travel_vuelta: null,
    fecha_inicio: null,
    fecha_fin: null,
    hora_casting: null,
    ppm_hora: '12:00',
}

interface Props {
    open: boolean
    onClose: () => void
    onSave: (data: CastingForm) => Promise<void>
    initial?: Casting | null
}

function PipelineStep({ active, done, label, sublabel, onClick, disabled }: {
    active: boolean, done: boolean, label: string, sublabel?: string,
    onClick?: () => void, disabled?: boolean,
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            padding: '10px 8px', borderRadius: '10px', border: '1px solid',
            borderColor: done ? 'rgba(52,211,153,0.4)' : active ? 'rgba(124,106,247,0.4)' : 'var(--border)',
            background: done ? 'rgba(52,211,153,0.08)' : active ? 'var(--accent-dim)' : 'transparent',
            cursor: onClick && !disabled ? 'pointer' : 'default',
            transition: 'all 0.15s ease', minWidth: '78px', flex: 1,
        }}>
            {done ? <CheckCircle2 size={17} color="var(--success)" /> : <Circle size={17} color={active ? 'var(--accent-light)' : 'var(--border-light)'} />}
            <span style={{ fontSize: '11px', fontWeight: 600, color: done ? 'var(--success)' : active ? 'var(--accent-light)' : 'var(--text-secondary)' }}>{label}</span>
            {sublabel && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>{sublabel}</span>}
        </button>
    )
}

function SectionTitle({ color, emoji, title, subtitle }: { color?: string, emoji?: string, title: string, subtitle?: string }) {
    if (!emoji) {
        return (
            <div style={{
                fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                marginTop: '8px', marginBottom: '12px',
                paddingBottom: '6px', borderBottom: '1px solid var(--border)',
            }}>{title}</div>
        )
    }
    return (
        <div style={{ fontSize: '11px', fontWeight: 600, color: color || 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {emoji} {title}
            {subtitle && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.7 }}>{subtitle}</span>}
        </div>
    )
}

function EuroInput({ label, value, onChange, placeholder }: {
    label: string, value: number | null, onChange: (v: number | null) => void, placeholder?: string,
}) {
    return (
        <div className="form-group">
            <label className="form-label">{label}</label>
            <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none' }}>€</span>
                <input type="number" min="0" step="0.01" className="form-input"
                    style={{ paddingLeft: '24px' }}
                    value={value ?? ''}
                    onFocus={e => { if (e.target.value === '0') e.target.value = '' }}
                    onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder={placeholder ?? '0.00'} />
            </div>
        </div>
    )
}

function DateInput({ label, value, onChange, placeholder }: {
    label?: string, value: string | null, onChange: (v: string | null) => void, placeholder?: string,
}) {
    return (
        <div className="form-group" style={{ position: 'relative' }}>
            {label && <label className="form-label">{label}</label>}
            <div style={{ position: 'relative' }}>
                <input type="date" className="form-input"
                    value={value || ''}
                    onChange={e => onChange(e.target.value || null)} />
                {value && (
                    <button type="button" onClick={() => onChange(null)}
                        style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
                            width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: 'var(--text-secondary)', zIndex: 2
                        }}>
                        <X size={10} />
                    </button>
                )}
            </div>
        </div>
    )
}

const ROLES = [
    { key: 'ocp', label: 'OCP (Principal)' },
    { key: 'secundario', label: 'Secundario' },
    { key: 'fe', label: 'FE (Feat. Extra)' },
]

export default function CastingFormModal({ open, onClose, onSave, initial }: Props) {
    const { data: allCastings } = useCastings()

    const [form, setForm] = useState<CastingForm>(initial ? { ...initial } : defaultForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = <K extends keyof CastingForm>(key: K, val: CastingForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }))

    useEffect(() => {
        setForm(initial ? { ...initial } : defaultForm)
        setError(null)
    }, [initial, open])

    // Parsed roles array
    const rolesArr: string[] = useMemo(() => {
        try { return JSON.parse(form.roles_seleccionados ?? '[]') } catch { return [] }
    }, [form.roles_seleccionados])

    const toggleRol = (rol: string) => {
        const next = rolesArr.includes(rol)
            ? rolesArr.filter(r => r !== rol)
            : [...rolesArr, rol]
        set('roles_seleccionados', next.length ? JSON.stringify(next) : null)
    }

    // Autocomplete suggestions
    const directoresCasting = useMemo(() => [...new Set(allCastings.map(c => c.director_casting).filter((n): n is string => !!n?.trim()))].sort(), [allCastings])
    const productoras = useMemo(() => [...new Set(allCastings.map(c => c.productora).filter((n): n is string => !!n?.trim()))].sort(), [allCastings])
    const plataformas = useMemo(() => [...new Set(allCastings.map(c => c.plataforma_cliente).filter((n): n is string => !!n?.trim()))].sort(), [allCastings])
    const agencias = useMemo(() => [...new Set(allCastings.map(c => c.nombre_agencia).filter((n): n is string => !!n?.trim()))].sort(), [allCastings])
    const localizaciones = useMemo(() => [...new Set(allCastings.map(c => c.localizacion).filter((n): n is string => !!n?.trim()))].sort(), [allCastings])

    const toggleOpcionado = () => setForm(prev => ({
        ...prev, fue_opcionado: !prev.fue_opcionado,
        tuvo_callback: !prev.fue_opcionado ? prev.tuvo_callback : false,
        tipo_callback: !prev.fue_opcionado ? prev.tipo_callback : null,
    }))

    const toggleCallback = () => setForm(prev => ({
        ...prev, tuvo_callback: !prev.tuvo_callback,
        tipo_callback: !prev.tuvo_callback ? (prev.tipo_callback ?? 'presencial') : null,
    }))

    const handleSave = async () => {
        if (!form.proyecto || !form.fecha_casting) { setError('Rellena los campos obligatorios.'); return }
        setSaving(true); setError(null)
        try {
            // Depuración para el error al guardar
            console.log('Guardando casting con valores:', form)
            await onSave(form)
            onClose()
        }
        catch (e: any) {
            console.error('Error al guardar casting:', e)
            setError(e.message || 'Error al guardar. Revisa la consola para más detalles.')
        }
        finally { setSaving(false) }
    }

    const handleClose = () => { setForm(initial ? { ...initial } : defaultForm); setError(null); onClose() }

    const isPublicidad = form.tipo_proyecto === 'publicidad'
    const isDoblaje = form.tipo_proyecto === 'doblaje'
    const isEvento = form.tipo_proyecto === 'evento'

    const alertas = (() => {
        if (!form.fecha_casting) return []
        const deadline = new Date(form.fecha_casting)
        const now = new Date()
        const diffH = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
        const alerts = []
        if (diffH > 0 && diffH <= 12) alerts.push({ label: '⚠️ Menos de 12h para la entrega', color: 'var(--danger)' })
        else if (diffH > 0 && diffH <= 24) alerts.push({ label: '🔔 Menos de 24h para la entrega', color: 'var(--warning)' })
        else if (diffH > 0 && diffH <= 48) alerts.push({ label: '🔔 Menos de 48h para la entrega', color: '#60a5fa' })
        return alerts
    })()

    return (
        <Modal open={open} onClose={handleClose}
            title={initial ? 'Editar Casting' : 'Nuevo Casting'} maxWidth={780}
            footer={
                <>
                    {error && <span style={{ color: 'var(--danger)', fontSize: '12px', marginRight: 'auto' }}>{error}</span>}
                    <button className="btn btn-secondary" onClick={handleClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        <Save size={14} />{saving ? 'Guardando…' : 'Guardar'}
                    </button>
                </>
            }
        >
            {/* Alerta de deadline */}
            {alertas.map((a, i) => (
                <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px',
                    background: `${a.color}15`, border: `1px solid ${a.color}40`,
                    borderRadius: '8px', padding: '10px 14px', fontSize: '13px', fontWeight: 600, color: a.color,
                }}>
                    <Bell size={14} />{a.label}
                </div>
            ))}

            {/* ── PROGRESIÓN ─────────────────────────────────────────── */}
            <SectionTitle title="Progresión del Casting" />
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <PipelineStep
                        done={form.estado !== 'pendiente'}
                        active={form.estado === 'pendiente'}
                        label="Recibido"
                        onClick={() => set('estado', 'pendiente')}
                    />
                    <ArrowRight size={13} color="var(--border-light)" style={{ flexShrink: 0 }} />
                    <PipelineStep
                        done={['enviado', 'opcionado', 'callback', 'seleccionado', 'descartado'].includes(form.estado)}
                        active={false} label="Enviado"
                        onClick={() => set('estado', 'enviado')}
                        sublabel={form.estado === 'pendiente' ? 'clic al enviar' : undefined}
                    />
                    <ArrowRight size={13} color="var(--border-light)" style={{ flexShrink: 0 }} />
                    <PipelineStep done={form.fue_opcionado} active={false} label="Opcionado" sublabel="clic para marcar" onClick={toggleOpcionado} />
                    <ArrowRight size={13} color="var(--border-light)" style={{ flexShrink: 0 }} />
                    <PipelineStep
                        done={form.tuvo_callback}
                        active={form.fue_opcionado && !form.tuvo_callback}
                        label="Callback"
                        sublabel={form.fue_opcionado ? 'clic para marcar' : 'requiere opción'}
                        onClick={form.fue_opcionado ? toggleCallback : undefined}
                        disabled={!form.fue_opcionado}
                    />
                    <ArrowRight size={13} color="var(--border-light)" style={{ flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 100 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Resultado</span>
                        <select className="form-select" value={form.estado}
                            onChange={e => set('estado', e.target.value as EstadoCasting)}
                            style={{
                                fontSize: '12px',
                                borderColor: form.estado === 'seleccionado' ? 'rgba(52,211,153,0.4)' : form.estado === 'descartado' ? 'rgba(248,113,113,0.4)' : 'var(--border)',
                                color: form.estado === 'seleccionado' ? 'var(--success)' : form.estado === 'descartado' ? 'var(--danger)' : 'var(--text-secondary)',
                            }}>
                            <option value="pendiente">📋 Recibido (pendiente envío)</option>
                            <option value="enviado">📤 Enviado / En proceso</option>
                            <option value="seleccionado">✓ Seleccionado / Ganado</option>
                            <option value="descartado">✗ Descartado</option>
                        </select>
                    </div>
                </div>

                {/* Tipo callback */}
                {form.tuvo_callback && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <label className="form-label" style={{ marginBottom: '8px' }}>Tipo de Callback</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['presencial', 'zoom'] as const).map(tipo => (
                                <button key={tipo} type="button" onClick={() => set('tipo_callback', tipo)}
                                    style={{
                                        padding: '6px 14px', borderRadius: '8px', border: '1px solid',
                                        borderColor: form.tipo_callback === tipo ? 'var(--accent)' : 'var(--border)',
                                        background: form.tipo_callback === tipo ? 'var(--accent-dim)' : 'transparent',
                                        color: form.tipo_callback === tipo ? 'var(--accent-light)' : 'var(--text-secondary)',
                                        fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                    }}>
                                    {tipo === 'presencial' ? '🏢 Presencial' : '💻 Online / Zoom'}
                                </button>
                            ))}
                        </div>
                        {form.estado !== 'seleccionado' && (
                            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                    <input type="checkbox" checked={form.cobra_callback}
                                        onChange={e => setForm(prev => ({ ...prev, cobra_callback: e.target.checked, tarifa_callback: e.target.checked ? (prev.tarifa_callback ?? 30) : null }))} />
                                    💰 ¿Se cobra este callback?
                                </label>
                                {form.cobra_callback && (
                                    <div style={{ position: 'relative', width: 120 }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none' }}>€</span>
                                        <input type="number" min="0" step="0.01" className="form-input" style={{ paddingLeft: '24px' }}
                                            value={form.tarifa_callback ?? ''}
                                            onChange={e => set('tarifa_callback', e.target.value === '' ? null : parseFloat(e.target.value))}
                                            placeholder="30" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── DATOS BÁSICOS ─────────────────────────────────────── */}
            <SectionTitle title="Datos del Casting" />
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Proyecto *</label>
                    <input className="form-input" value={form.proyecto} onChange={e => set('proyecto', e.target.value)} placeholder="Nombre del proyecto" />
                </div>
                <div className="form-group">
                    <label className="form-label">Personaje *</label>
                    <input className="form-input" value={form.personaje} onChange={e => set('personaje', e.target.value)} placeholder="Nombre del personaje" />
                </div>
            </div>

            <div className="form-grid-3">
                <div className="form-group">
                    <label className="form-label">Tipo de Proyecto</label>
                    <select className="form-select" value={form.tipo_proyecto} onChange={e => set('tipo_proyecto', e.target.value as TipoProyecto)}>
                        {TIPOS_PROYECTO.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Formato</label>
                    <select className="form-select" value={form.tipo_casting} onChange={e => {
                        const val = e.target.value as TipoCasting
                        set('tipo_casting', val)
                    }}>
                        {TIPOS_CASTING.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <DateInput 
                        label={form.tipo_casting === 'presencial' ? "📅 FECHA *" : "📅 Fecha máx. de entrega *"} 
                        value={form.fecha_casting} 
                        onChange={v => set('fecha_casting', v || '')} 
                    />
                </div>
            </div>

            <div className="form-grid" style={{ marginBottom: '20px' }}>
                <div className="form-group">
                    <label className="form-label">⌚ HORA</label>
                    <input type="time" className="form-input" value={form.hora_casting || ''} onChange={e => set('hora_casting', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">📍 LUGAR</label>
                    <input className="form-input" list="lugares-list" value={form.localizacion || ''} onChange={e => set('localizacion', e.target.value)} placeholder="Dirección, estudio…" autoComplete="off" />
                    <datalist id="lugares-list">{localizaciones.map(n => <option key={n} value={n} />)}</datalist>
                </div>
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Director/a de Casting</label>
                    <input className="form-input" list="directores-list" value={form.director_casting || ''} onChange={e => set('director_casting', e.target.value)} placeholder="Escribe o elige…" autoComplete="off" />
                    <datalist id="directores-list">{directoresCasting.map(n => <option key={n} value={n} />)}</datalist>
                </div>
                <div className="form-group">
                    <label className="form-label">Productora</label>
                    <input className="form-input" list="productoras-list" value={form.productora || ''} onChange={e => set('productora', e.target.value)} placeholder="Escribe o elige…" autoComplete="off" />
                    <datalist id="productoras-list">{productoras.map(n => <option key={n} value={n} />)}</datalist>
                </div>
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Plataforma / Cliente</label>
                    <input className="form-input" list="plataformas-list" value={form.plataforma_cliente || ''} onChange={e => set('plataforma_cliente', e.target.value)} placeholder="Netflix, Movistar+, etc." autoComplete="off" />
                    <datalist id="plataformas-list">{plataformas.map(n => <option key={n} value={n} />)}</datalist>
                </div>
                <div className="form-group">
                    <label className="form-label">Fuente del Casting</label>
                    <select className="form-select" value={form.fuente_casting}
                        onChange={e => { set('fuente_casting', e.target.value as FuenteCasting); if (e.target.value !== 'agencia') set('nombre_agencia', null) }}>
                        {FUENTES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
            </div>

            {form.fuente_casting === 'agencia' && (
                <div className="form-group" style={{ background: 'rgba(124,106,247,0.06)', border: '1px solid rgba(124,106,247,0.2)', borderRadius: '10px', padding: '12px 14px' }}>
                    <label className="form-label">🏢 Nombre de la Agencia</label>
                    <input className="form-input" list="agencias-list" value={form.nombre_agencia || ''} onChange={e => set('nombre_agencia', e.target.value || null)} placeholder="Escribe o elige la agencia…" autoComplete="off" style={{ marginTop: '6px' }} />
                    <datalist id="agencias-list">{agencias.map(n => <option key={n} value={n} />)}</datalist>
                </div>
            )}

            {/* ── DATOS DEL PROYECTO ─────────────────────────────────── */}
            <SectionTitle emoji="🎬" title="Datos del Proyecto" subtitle="Fechas y detalles de producción" />
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Localización</label>
                    <input className="form-input" value={form.localizacion || ''} onChange={e => set('localizacion', e.target.value || null)} placeholder="Ciudad, país…" />
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha/s de Rodaje</label>
                    <input className="form-input" value={form.fechas_rodaje || ''} onChange={e => set('fechas_rodaje', e.target.value || null)} placeholder="Ej: 15-20 Abr, 3 May…" />
                </div>
            </div>
            <div className="form-grid">
                <DateInput label="FECHA DE INICIO" value={form.fecha_inicio} onChange={v => set('fecha_inicio', v)} />
                <DateInput label="FECHA DE FIN" value={form.fecha_fin} onChange={v => set('fecha_fin', v)} />
            </div>
            <div className="form-grid-3">
                <DateInput label="PPM (fecha)" value={form.ppm_fecha} onChange={v => set('ppm_fecha', v)} />
                <DateInput label="Callback (fecha)" value={form.callback_fecha} onChange={v => set('callback_fecha', v)} />
                <EuroInput label="Salario Callback" value={form.callback_salario} onChange={v => set('callback_salario', v)} placeholder="30.00" />
            </div>

            {/* ── DATOS ECONÓMICOS ───────────────────────────────────── */}
            <SectionTitle title="Datos Económicos" />

            {/* PUBLICIDAD: roles múltiples */}
            {isPublicidad && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                    <div>
                        <label className="form-label" style={{ marginBottom: '10px' }}>ROL</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                            {ROLES.map(r => {
                                const sel = rolesArr.includes(r.key)
                                return (
                                    <button key={r.key} type="button" onClick={() => toggleRol(r.key)}
                                        style={{
                                            flex: 1, padding: '10px 16px', borderRadius: '8px', border: '1px solid',
                                            borderColor: sel ? 'var(--accent)' : 'var(--border)',
                                            background: sel ? 'var(--accent-dim)' : 'transparent',
                                            color: sel ? 'var(--accent-light)' : 'var(--text-secondary)',
                                            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                            fontFamily: 'inherit', transition: 'all 0.15s ease',
                                        }}>
                                        {sel ? '✓ ' : ''}{r.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* JORNADAS DE RODAJE: TARIFA Y BUYOUT */}
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                            <SectionTitle color="var(--accent-light)" emoji="🎬" title="Jornadas de Rodaje" />
                            {rolesArr.includes('ocp') && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-light)', marginBottom: '10px' }}>OCP (Principal)</div>
                                    <div className="form-grid">
                                        <EuroInput label="Tarifa bruta jornada" value={form.ocp_tarifa_bruta} onChange={v => set('ocp_tarifa_bruta', v)} />
                                        <EuroInput label="Buyout / DDHH" value={form.ocp_buyout} onChange={v => set('ocp_buyout', v)} />
                                    </div>
                                </div>
                            )}
                            {rolesArr.includes('secundario') && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', marginBottom: '10px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#60a5fa', marginBottom: '10px' }}>Secundario</div>
                                    <div className="form-grid">
                                        <EuroInput label="Tarifa bruta jornada" value={form.sec_tarifa_bruta} onChange={v => set('sec_tarifa_bruta', v)} />
                                        <EuroInput label="Buyout / DDHH" value={form.sec_buyout} onChange={v => set('sec_buyout', v)} />
                                    </div>
                                </div>
                            )}
                            {rolesArr.includes('fe') && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px', marginBottom: '0', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', marginBottom: '10px' }}>FE (Featuring Extra)</div>
                                    <div className="form-grid">
                                        <EuroInput label="Tarifa bruta jornada" value={form.fe_tarifa_bruta} onChange={v => set('fe_tarifa_bruta', v)} />
                                        <EuroInput label="Buyout / DDHH" value={form.fe_buyout} onChange={v => set('fe_buyout', v)} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Rol seleccionado (para pasar al Proyecto) */}
                        {rolesArr.length > 1 && (
                            <div className="form-group" style={{ marginBottom: '16px', background: 'rgba(52,211,153,0.04)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(52,211,153,0.2)' }}>
                                <label className="form-label" style={{ color: 'var(--success)' }}>✔ Rol por el que fui seleccionado/a</label>
                                <select className="form-select" value={form.rol_seleccionado || ''}
                                    onChange={e => set('rol_seleccionado', e.target.value || null)}>
                                    <option value="">— Sin determinar —</option>
                                    {ROLES.filter(r => rolesArr.includes(r.key)).map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                                </select>
                            </div>
                        )}

                        {/* Fitting y Travel (como Fechas) */}
                        <div className="form-grid-3">
                            <DateInput label="👗 Fitting (Fecha)" value={form.prueba_vestuario_fecha} onChange={v => set('prueba_vestuario_fecha', v)} />
                            <DateInput label="✈️ Travel (Ida)" value={form.travel_ida || form.travel_fecha} onChange={v => { set('travel_ida', v); set('travel_fecha', v) }} />
                            <DateInput label="✈️ Travel (Vuelta)" value={form.travel_vuelta} onChange={v => set('travel_vuelta', v)} />
                        </div>
                    </div>
                </div>
            )}

            {/* DOBLAJE */}
            {isDoblaje && (
                <div className="form-grid">
                    <EuroInput label="Importe Bruto" value={form.importe_bruto} onChange={v => set('importe_bruto', v)} />
                    <EuroInput label="Importe Neto" value={form.importe_neto} onChange={v => set('importe_neto', v)} />
                    <div className="form-group">
                        <label className="form-label">Nº de Takes</label>
                        <input type="number" min="0" step="1" className="form-input" value={form.num_takes ?? ''} onChange={e => set('num_takes', e.target.value === '' ? null : parseInt(e.target.value))} placeholder="0" />
                    </div>
                </div>
            )}

            {/* EVENTO */}
            {isEvento && (
                <div className="form-grid">
                    <EuroInput label="Tarifa bruta por jornada" value={form.tarifa_jornada} onChange={v => set('tarifa_jornada', v)} />
                    <EuroInput label="Tarifa neta por jornada" value={form.tarifa_neta_jornada} onChange={v => set('tarifa_neta_jornada', v)} />
                    <EuroInput label="Tarifa Traslado/Viaje" value={form.tarifa_traslado} onChange={v => set('tarifa_traslado', v)} />
                </div>
            )}

            {/* CINE / SERIE / TV / TEATRO */}
            {!isPublicidad && !isDoblaje && !isEvento && (
                <div>
                    <div className="form-grid">
                        <EuroInput label="Tarifa bruta por jornada" value={form.tarifa_jornada} onChange={v => set('tarifa_jornada', v)} />
                        <div className="form-group">
                            <label className="form-label">Nº Jornadas</label>
                            <input type="number" min="0" step="1" className="form-input" value={form.num_jornadas ?? ''} onChange={e => set('num_jornadas', e.target.value === '' ? null : parseInt(e.target.value))} placeholder="1" />
                        </div>
                    </div>
                    <div className="form-grid-3">
                        <EuroInput label="Derechos de imagen (bruto)" value={form.derechos_imagen} onChange={v => set('derechos_imagen', v)} />
                        <div className="form-group">
                            <label className="form-label">% Comisión</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none' }}>%</span>
                                <input type="number" min="0" max="100" step="0.5" className="form-input" style={{ paddingRight: '30px' }}
                                    value={form.comision_pct ?? ''} onChange={e => set('comision_pct', e.target.value === '' ? null : parseFloat(e.target.value))} placeholder="10" />
                            </div>
                        </div>
                        <EuroInput label="Horas extra (tarifa/h)" value={form.tarifa_hora_extra} onChange={v => set('tarifa_hora_extra', v)} />
                    </div>
                </div>
            )}

            {/* Notas */}
            <SectionTitle title="Notas" />
            <div className="form-group">
                <textarea className="form-textarea" value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, feedback, etc." />
            </div>
        </Modal>
    )
}
