'use client'
import { useState, useMemo } from 'react'
import Modal from '@/components/Modal'
import { Casting, TipoProyecto, TipoCasting, EstadoCasting, FuenteCasting } from '@/lib/supabase'
import { TIPOS_CASTING, TIPOS_PROYECTO, FUENTES } from '@/components/ui'
import { useCastings } from '@/hooks/useData'
import { Link, FileText, Save, CheckCircle2, Circle, ArrowRight } from 'lucide-react'

type CastingForm = Omit<Casting, 'id' | 'created_at'>

const defaultForm: CastingForm = {
    proyecto: '',
    personaje: '',
    tipo_proyecto: 'serie',
    director_casting: '',
    productora: '',
    plataforma_cliente: '',
    fecha_casting: new Date().toISOString().split('T')[0],
    tipo_casting: 'presencial',
    estado: 'enviado',
    fue_opcionado: false,
    tuvo_callback: false,
    tipo_callback: null,
    resultado_final: '',
    actor_seleccionado: '',
    enlace_self_tape: '',
    enlace_guion: '',
    notas: '',
    fuente_casting: 'representante',
    nombre_agencia: null,
    cobra_callback: false,
    tarifa_callback: null,
}

interface Props {
    open: boolean
    onClose: () => void
    onSave: (data: CastingForm) => Promise<void>
    initial?: Casting | null
}

// ── Pipeline step ─────────────────────────────────────────────────────────────
function PipelineStep({
    active, done, label, sublabel, onClick, disabled,
}: {
    active: boolean, done: boolean, label: string, sublabel?: string,
    onClick?: () => void, disabled?: boolean,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '12px 10px', borderRadius: '10px', border: '1px solid',
                borderColor: done ? 'rgba(52,211,153,0.4)' : active ? 'rgba(124,106,247,0.4)' : 'var(--border)',
                background: done ? 'rgba(52,211,153,0.08)' : active ? 'var(--accent-dim)' : 'transparent',
                cursor: onClick && !disabled ? 'pointer' : 'default',
                transition: 'all 0.15s ease',
                minWidth: '90px', flex: 1,
            }}
        >
            {done
                ? <CheckCircle2 size={18} color="var(--success)" />
                : <Circle size={18} color={active ? 'var(--accent-light)' : 'var(--border-light)'} />
            }
            <span style={{
                fontSize: '11.5px', fontWeight: 600,
                color: done ? 'var(--success)' : active ? 'var(--accent-light)' : 'var(--text-secondary)',
            }}>{label}</span>
            {sublabel && (
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>{sublabel}</span>
            )}
        </button>
    )
}

export default function CastingFormModal({ open, onClose, onSave, initial }: Props) {
    const { data: allCastings } = useCastings()

    const [form, setForm] = useState<CastingForm>(
        initial ? { ...initial } : defaultForm
    )
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // ── Autocomplete lists ───────────────────────────────────────────────────
    const directoresCasting = useMemo(() => {
        const nombres = allCastings.map(c => c.director_casting).filter((n): n is string => !!n?.trim())
        return [...new Set(nombres)].sort()
    }, [allCastings])

    const productoras = useMemo(() => {
        const nombres = allCastings.map(c => c.productora).filter((n): n is string => !!n?.trim())
        return [...new Set(nombres)].sort()
    }, [allCastings])

    const plataformas = useMemo(() => {
        const nombres = allCastings.map(c => c.plataforma_cliente).filter((n): n is string => !!n?.trim())
        return [...new Set(nombres)].sort()
    }, [allCastings])

    const agencias = useMemo(() => {
        const nombres = allCastings.map(c => c.nombre_agencia).filter((n): n is string => !!n?.trim())
        return [...new Set(nombres)].sort()
    }, [allCastings])

    // ── State helpers ────────────────────────────────────────────────────────
    const set = <K extends keyof CastingForm>(key: K, val: CastingForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }))

    // ── Pipeline logic ───────────────────────────────────────────────────────
    const toggleOpcionado = () => {
        const next = !form.fue_opcionado
        setForm(prev => ({
            ...prev,
            fue_opcionado: next,
            tuvo_callback: next ? prev.tuvo_callback : false,
            tipo_callback: next ? prev.tipo_callback : null,
            estado: next ? prev.estado : (prev.estado === 'seleccionado' || prev.estado === 'descartado' ? prev.estado : 'enviado'),
        }))
    }

    const toggleCallback = () => {
        const next = !form.tuvo_callback
        setForm(prev => ({
            ...prev,
            tuvo_callback: next,
            tipo_callback: next ? (prev.tipo_callback ?? 'presencial') : null,
        }))
    }

    const handleSave = async () => {
        if (!form.proyecto || !form.fecha_casting) {
            setError('Rellena los campos obligatorios.')
            return
        }
        setSaving(true)
        setError(null)
        try {
            await onSave(form)
            onClose()
        } catch (e: unknown) {
            if (e instanceof Error) setError(e.message)
            else setError('Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        setForm(initial ? { ...initial } : defaultForm)
        setError(null)
        onClose()
    }

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={initial ? 'Editar Casting' : 'Nuevo Casting'}
            maxWidth={740}
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
            {/* ── PROGRESIÓN DEL CASTING ─────────────────────────────── */}
            <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '16px', marginBottom: '20px',
            }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
                    Progresión del Casting
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PipelineStep done={true} active={false} label="Enviado" sublabel={form.fecha_casting || ''} />

                    <ArrowRight size={14} color="var(--border-light)" style={{ flexShrink: 0 }} />

                    <PipelineStep
                        done={form.fue_opcionado} active={false}
                        label="Opcionado" sublabel="clic para marcar"
                        onClick={toggleOpcionado}
                    />

                    <ArrowRight size={14} color={form.fue_opcionado ? 'var(--border-light)' : 'rgba(255,255,255,0.1)'} style={{ flexShrink: 0 }} />

                    <PipelineStep
                        done={form.tuvo_callback}
                        active={form.fue_opcionado && !form.tuvo_callback}
                        label="Callback"
                        sublabel={form.fue_opcionado ? 'clic para marcar' : 'requiere opción'}
                        onClick={form.fue_opcionado ? toggleCallback : undefined}
                        disabled={!form.fue_opcionado}
                    />

                    <ArrowRight size={14} color={form.fue_opcionado ? 'var(--border-light)' : 'rgba(255,255,255,0.1)'} style={{ flexShrink: 0 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Resultado</span>
                        <select
                            className="form-select"
                            value={form.estado}
                            onChange={e => set('estado', e.target.value as EstadoCasting)}
                            style={{
                                fontSize: '12px',
                                borderColor: form.estado === 'seleccionado' ? 'rgba(52,211,153,0.4)'
                                    : form.estado === 'descartado' ? 'rgba(248,113,113,0.4)'
                                        : 'var(--border)',
                                color: form.estado === 'seleccionado' ? 'var(--success)'
                                    : form.estado === 'descartado' ? 'var(--danger)'
                                        : 'var(--text-secondary)',
                            }}
                        >
                            <option value="enviado">— En proceso</option>
                            <option value="seleccionado">✓ Seleccionado</option>
                            <option value="descartado">✗ Descartado</option>
                        </select>
                    </div>
                </div>

                {/* Tipo de callback */}
                {form.tuvo_callback && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        <label className="form-label" style={{ marginBottom: '8px' }}>Tipo de Callback</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {(['presencial', 'zoom'] as const).map(tipo => (
                                <button
                                    key={tipo}
                                    type="button"
                                    onClick={() => set('tipo_callback', tipo)}
                                    style={{
                                        padding: '6px 16px', borderRadius: '8px', border: '1px solid',
                                        borderColor: form.tipo_callback === tipo ? 'var(--accent)' : 'var(--border)',
                                        background: form.tipo_callback === tipo ? 'var(--accent-dim)' : 'transparent',
                                        color: form.tipo_callback === tipo ? 'var(--accent-light)' : 'var(--text-secondary)',
                                        fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                        fontFamily: 'inherit', transition: 'all 0.15s ease',
                                    }}
                                >
                                    {tipo === 'presencial' ? '\uD83C\uDFE2 Presencial' : '\uD83D\uDCBB Online / Zoom'}
                                </button>
                            ))}
                        </div>

                        {/* Callback cobrable — solo activo si el resultado NO es Seleccionado */}
                        {form.estado === 'seleccionado' ? (
                            <div style={{
                                marginTop: '12px', padding: '10px 12px',
                                background: 'rgba(52,211,153,0.06)',
                                border: '1px solid rgba(52,211,153,0.2)',
                                borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px',
                            }}>
                                <span style={{ fontSize: '14px' }}>✅</span>
                                <div>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
                                        Callback incluido en la jornada
                                    </span>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.7, marginTop: '1px' }}>
                                        Al ser seleccionado, el callback no se cobra por separado.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                marginTop: '12px', padding: '12px',
                                background: form.cobra_callback ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${form.cobra_callback ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
                                borderRadius: '8px', transition: 'all 0.2s ease',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.cobra_callback ? '12px' : 0 }}>
                                    <div>
                                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: form.cobra_callback ? '#fbbf24' : 'var(--text-secondary)' }}>
                                            💰 ¿Se cobra este callback?
                                        </span>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.65, marginTop: '2px' }}>
                                            Si eres descartado, el callback se factura. Se añadirá a Finanzas automáticamente.
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !form.cobra_callback
                                            setForm(prev => ({ ...prev, cobra_callback: next, tarifa_callback: next ? prev.tarifa_callback : null }))
                                        }}
                                        style={{
                                            padding: '4px 14px', borderRadius: '99px', border: '1px solid',
                                            borderColor: form.cobra_callback ? '#fbbf24' : 'var(--border)',
                                            background: form.cobra_callback ? 'rgba(251,191,36,0.15)' : 'transparent',
                                            color: form.cobra_callback ? '#fbbf24' : 'var(--text-secondary)',
                                            fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                                            fontFamily: 'inherit', transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {form.cobra_callback ? 'Sí' : 'No'}
                                    </button>
                                </div>

                                {form.cobra_callback && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Tarifa del callback:</span>
                                        <div style={{ position: 'relative', flex: 1 }}>
                                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none' }}>€</span>
                                            <input
                                                type="number" min="0" step="0.01" className="form-input"
                                                style={{ paddingLeft: '24px' }}
                                                value={form.tarifa_callback ?? ''}
                                                onChange={e => set('tarifa_callback', e.target.value === '' ? null : parseFloat(e.target.value))}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── DATOS DEL CASTING ──────────────────────────────────── */}
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
                    <select className="form-select" value={form.tipo_casting} onChange={e => set('tipo_casting', e.target.value as TipoCasting)}>
                        {TIPOS_CASTING.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Fecha del Casting *</label>
                    <input type="date" className="form-input" value={form.fecha_casting} onChange={e => set('fecha_casting', e.target.value)} />
                </div>
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Director/a de Casting</label>
                    <input className="form-input" list="directores-list" value={form.director_casting || ''} onChange={e => set('director_casting', e.target.value)} placeholder="Escribe o elige de la lista…" autoComplete="off" />
                    <datalist id="directores-list">
                        {directoresCasting.map(n => <option key={n} value={n} />)}
                    </datalist>
                </div>
                <div className="form-group">
                    <label className="form-label">Productora</label>
                    <input className="form-input" list="productoras-list" value={form.productora || ''} onChange={e => set('productora', e.target.value)} placeholder="Escribe o elige de la lista…" autoComplete="off" />
                    <datalist id="productoras-list">
                        {productoras.map(n => <option key={n} value={n} />)}
                    </datalist>
                </div>
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Plataforma / Cliente</label>
                    <input className="form-input" list="plataformas-list" value={form.plataforma_cliente || ''} onChange={e => set('plataforma_cliente', e.target.value)} placeholder="Netflix, Movistar+, etc." autoComplete="off" />
                    <datalist id="plataformas-list">
                        {plataformas.map(n => <option key={n} value={n} />)}
                    </datalist>
                </div>
                <div className="form-group">
                    <label className="form-label">Fuente del Casting</label>
                    <select
                        className="form-select"
                        value={form.fuente_casting}
                        onChange={e => {
                            set('fuente_casting', e.target.value as FuenteCasting)
                            if (e.target.value !== 'agencia') set('nombre_agencia', null)
                        }}
                    >
                        {FUENTES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
            </div>

            {/* Campo condicional: Agencia */}
            {form.fuente_casting === 'agencia' && (
                <div className="form-group" style={{
                    background: 'rgba(124,106,247,0.06)',
                    border: '1px solid rgba(124,106,247,0.2)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                }}>
                    <label className="form-label">🏢 Nombre de la Agencia</label>
                    <input
                        className="form-input"
                        list="agencias-list"
                        value={form.nombre_agencia || ''}
                        onChange={e => set('nombre_agencia', e.target.value || null)}
                        placeholder="Escribe o elige la agencia…"
                        autoComplete="off"
                        style={{ marginTop: '6px' }}
                    />
                    <datalist id="agencias-list">
                        {agencias.map(n => <option key={n} value={n} />)}
                    </datalist>
                </div>
            )}

            <div className="form-group">
                <label className="form-label">Resultado Final / Notas de estado</label>
                <input className="form-input" value={form.resultado_final || ''} onChange={e => set('resultado_final', e.target.value)} placeholder="Ej: me avisaron que eligieron a otro perfil, feedback del director…" />
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Link size={10} /> Enlace Self Tape
                    </label>
                    <input className="form-input" value={form.enlace_self_tape || ''} onChange={e => set('enlace_self_tape', e.target.value)} placeholder="https://..." />
                </div>
                <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={10} /> Enlace Guion
                    </label>
                    <input className="form-input" value={form.enlace_guion || ''} onChange={e => set('enlace_guion', e.target.value)} placeholder="https://..." />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, feedback, etc." />
            </div>
        </Modal>
    )
}
