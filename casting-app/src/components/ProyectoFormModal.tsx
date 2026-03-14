'use client'
import { useState, useMemo, useEffect } from 'react'
import Modal from '@/components/Modal'
import { Proyecto, TipoProyecto, RolActorPublicidad } from '@/lib/supabase'
import { TIPOS_PROYECTO } from '@/components/ui'
import { useProyectos } from '@/hooks/useData'
import AutocompleteInput from '@/components/AutocompleteInput'
import { Save, Calculator, Euro, Briefcase, CalendarDays, Mic, Info } from 'lucide-react'

type ProyectoForm = Omit<Proyecto, 'id' | 'created_at' | 'user_id'>

const TIPOS_RODAJE: TipoProyecto[] = ['serie', 'cine', 'publicidad', 'teatro', 'tv']

const defaultForm: ProyectoForm = {
    casting_id: null,
    proyecto: '',
    personaje: '',
    tipo_proyecto: 'serie',
    productora: null,
    director: null,
    empresa: null,
    fecha_inicio: null,
    fecha_fin: null,
    fecha_rodaje: null,
    notas: null,
    // Rodaje económicos
    rol: null,
    tarifa_jornada: null,
    num_jornadas: 1,
    horas_fitting_extra: 0,
    tarifa_hora_extra: null,
    num_travel_days: 0,
    horas_extra_convenio: 0,
    derechos_imagen: null,
    comision_pct: 10,
    facturado_via: null,
    // Evento / Doblaje económicos
    tarifa_neta_jornada: null,
    tarifa_traslado: null,
    horas_extra_evento: 0,
    // Doblaje
    estudio_doblaje: null,
    num_takes: null,
    // Finanzas
    fecha_limite_cobro: null,
}

const ROL_LABELS: Record<RolActorPublicidad, string> = {
    ocp: 'OCP — Principal',
    secundario: 'Secundario',
    fe: 'FE — Featuring Extra',
}
const ROL_COLORS: Record<RolActorPublicidad, string> = {
    ocp: '#7c6af7', secundario: '#60a5fa', fe: '#34d399',
}

interface Props {
    open: boolean
    onClose: () => void
    onSave: (data: ProyectoForm, forceFinanzas: boolean) => Promise<void>
    initial?: Proyecto | null
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function EuroInput({ label, value, onChange, placeholder, hint }: {
    label: string, value: number | null,
    onChange: (v: number | null) => void, placeholder?: string, hint?: string
}) {
    return (
        <div className="form-group">
            <label className="form-label">
                {label}
                {hint && <span style={{ marginLeft: '5px', fontSize: '9.5px', color: 'var(--text-secondary)', opacity: 0.7 }}>({hint})</span>}
            </label>
            <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none' }}>€</span>
                <input type="number" min="0" step="0.01" className="form-input" style={{ paddingLeft: '28px' }}
                    value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder={placeholder ?? '0.00'} />
            </div>
        </div>
    )
}

function NumInput({ label, value, onChange, min = 0, step = 1, hint }: {
    label: string, value: number | null, onChange: (v: number | null) => void,
    min?: number, step?: number, hint?: string
}) {
    return (
        <div className="form-group">
            <label className="form-label">
                {label}{hint && <span style={{ marginLeft: '5px', fontSize: '9.5px', color: 'var(--text-secondary)', opacity: 0.7 }}>({hint})</span>}
            </label>
            <input type="number" min={min} step={step} className="form-input"
                value={value ?? ''} onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))} />
        </div>
    )
}

function SummaryRow({ label, value, accent, big, sub }: { label: string, value: string, accent?: string, big?: boolean, sub?: string }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0' }}>
            <span style={{ fontSize: big ? '13px' : '12px', color: 'var(--text-secondary)', flex: 1 }}>
                {label}
                {sub && <span style={{ display: 'block', fontSize: '10px', opacity: 0.6 }}>{sub}</span>}
            </span>
            <span style={{ fontSize: big ? '16px' : '13px', fontWeight: big ? 700 : 500, color: accent ?? 'var(--text-primary)', marginLeft: '12px', whiteSpace: 'nowrap', letterSpacing: big ? '-0.5px' : undefined }}>{value}</span>
        </div>
    )
}

function SectionTitle({ color, emoji, title, subtitle }: { color: string, emoji: string, title: string, subtitle?: string }) {
    return (
        <div style={{ fontSize: '11px', fontWeight: 600, color, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {emoji} {title}
            {subtitle && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '10.5px', color: 'var(--text-secondary)', opacity: 0.7 }}>{subtitle}</span>}
        </div>
    )
}

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

// Color accent por tipo
const TIPO_ACCENT: Partial<Record<TipoProyecto, string>> = {
    evento: '#f59e0b',
    doblaje: '#f87171',
}
const getTipoAccent = (t: TipoProyecto) => TIPO_ACCENT[t] ?? 'var(--accent-light)'

export default function ProyectoFormModal({ open, onClose, onSave, initial }: Props) {
    const [form, setForm] = useState<ProyectoForm>(initial ? { ...initial } : defaultForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [forceFinanzas, setForceFinanzas] = useState(false)

    // Datos de proyectos existentes para autocompletar
    const { data: allProyectos } = useProyectos()
    const acProductoras = useMemo(() => [...new Set(allProyectos.map(p => p.productora).filter(Boolean) as string[])].sort(), [allProyectos])
    const acDirectores = useMemo(() => [...new Set(allProyectos.map(p => p.director).filter(Boolean) as string[])].sort(), [allProyectos])
    const acEstudios = useMemo(() => [...new Set(allProyectos.map(p => p.estudio_doblaje).filter(Boolean) as string[])].sort(), [allProyectos])

    useEffect(() => {
        setForm(initial ? { ...initial } : defaultForm)
        setForceFinanzas(false)
        setError(null)
    }, [initial, open])

    const set = <K extends keyof ProyectoForm>(key: K, val: ProyectoForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }))

    const handleFechaFinChange = (val: string | null) => {
        setForm(prev => {
            const updates: Partial<ProyectoForm> = { fecha_fin: val }
            if (val) {
                const d = new Date(val + 'T12:00:00')
                d.setDate(d.getDate() + 90)
                updates.fecha_limite_cobro = d.toISOString().split('T')[0]
            } else {
                updates.fecha_limite_cobro = null
            }
            return { ...prev, ...updates }
        })
    }

    const isEvento = form.tipo_proyecto === 'evento'
    const isDoblaje = form.tipo_proyecto === 'doblaje'
    const isRodaje = TIPOS_RODAJE.includes(form.tipo_proyecto)

    // ── Calculadoras ─────────────────────────────────────────────────────────
    const ecoRodaje = useMemo(() => {
        const tarifa = form.tarifa_jornada ?? 0
        const jornadas = form.num_jornadas ?? 0
        const tarifaHora = form.tarifa_hora_extra ?? (tarifa / 8)
        const horasFitting = form.horas_fitting_extra ?? 0
        const travelDays = form.num_travel_days ?? 0
        const horasExtra = form.horas_extra_convenio ?? 0
        const derechos = form.derechos_imagen ?? 0
        const comision = form.comision_pct ?? 0
        const nomBase = tarifa * jornadas
        const nomFitting = tarifaHora * horasFitting
        const nomTravel = tarifa * 0.5 * travelDays
        const nomHorasExtra = tarifaHora * horasExtra
        const totalNomina = nomBase + nomFitting + nomTravel + nomHorasExtra
        const comisionImporte = derechos * (comision / 100)
        const derechosNeto = derechos - comisionImporte
        return { nomBase, nomFitting, nomTravel, nomHorasExtra, totalNomina, comisionImporte, derechosNeto, totalEstimado: totalNomina + derechosNeto, tarifaHora }
    }, [form])

    const ecoEvento = useMemo(() => {
        const tarifaBruta = form.tarifa_jornada ?? 0
        const tarifaNeta = form.tarifa_neta_jornada ?? 0
        const jornadas = form.num_jornadas ?? 1
        const traslado = form.tarifa_traslado ?? 0
        const tarifaHora = tarifaBruta > 0 ? tarifaBruta / 8 : tarifaNeta / 8
        const totalBruto = tarifaBruta * jornadas
        const totalNeto = tarifaNeta * jornadas
        const totalTraslado = traslado
        const totalHorasExtra = tarifaHora * (form.horas_extra_evento ?? 0)
        const totalEstimado = (tarifaNeta > 0 ? totalNeto : totalBruto) + totalTraslado + totalHorasExtra
        return { totalBruto, totalNeto, totalTraslado, totalHorasExtra, totalEstimado, tarifaHora }
    }, [form])

    const ecoDoblaje = useMemo(() => {
        const bruto = form.tarifa_jornada ?? 0
        const neto = form.tarifa_neta_jornada ?? 0
        return { bruto, neto }
    }, [form])

    const hasEcoRodaje = (form.tarifa_jornada ?? 0) > 0 || (form.derechos_imagen ?? 0) > 0
    const hasEcoEvento = (form.tarifa_jornada ?? 0) > 0 || (form.tarifa_neta_jornada ?? 0) > 0
    const hasEcoDoblaje = (form.tarifa_jornada ?? 0) > 0 || (form.tarifa_neta_jornada ?? 0) > 0

    const handleSave = async () => {
        if (!form.proyecto) { setError('El nombre del proyecto es obligatorio.'); return }
        setSaving(true); setError(null)
        try { await onSave(form, forceFinanzas); onClose() }
        catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al guardar') }
        finally { setSaving(false) }
    }

    const handleClose = () => { setForm(initial ? { ...initial } : defaultForm); setError(null); onClose() }

    return (
        <Modal open={open} onClose={handleClose}
            title={initial ? 'Editar Proyecto' : 'Nuevo Proyecto'}
            maxWidth={800}
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
            {/* ── TIPO — siempre visible ────────────────────────────────── */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
                <label className="form-label">Tipo de Proyecto</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {TIPOS_PROYECTO.map(([val, label]) => {
                        const isSelected = form.tipo_proyecto === val
                        const accent = TIPO_ACCENT[val as TipoProyecto] ?? 'var(--accent)'
                        const accentDim = val === 'evento' ? 'rgba(245,158,11,0.12)'
                            : val === 'doblaje' ? 'rgba(248,113,113,0.12)'
                                : 'var(--accent-dim)'
                        return (
                            <button key={val} type="button"
                                onClick={() => set('tipo_proyecto', val as TipoProyecto)}
                                style={{
                                    padding: '6px 14px', borderRadius: '8px', border: '1px solid',
                                    borderColor: isSelected ? accent : 'var(--border)',
                                    background: isSelected ? accentDim : 'transparent',
                                    color: isSelected ? accent : 'var(--text-secondary)',
                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                    fontFamily: 'inherit', transition: 'all 0.15s ease',
                                }}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                FORMULARIO DOBLAJE
            ══════════════════════════════════════════════════════════════ */}
            {isDoblaje && (
                <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mic size={11} /> Datos del Doblaje
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Proyecto *</label>
                            <input className="form-input" value={form.proyecto}
                                onChange={e => set('proyecto', e.target.value)} placeholder="Nombre del proyecto" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Personaje</label>
                            <input className="form-input" value={form.personaje}
                                onChange={e => set('personaje', e.target.value)} placeholder="Nombre del personaje" />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Productora</label>
                            <AutocompleteInput value={form.productora || ''}
                                onChange={val => set('productora', val || null)} placeholder="Productora" suggestions={acProductoras} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Director/a</label>
                            <AutocompleteInput value={form.director || ''}
                                onChange={val => set('director', val || null)} placeholder="Director/a de doblaje" suggestions={acDirectores} />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Estudio de Doblaje</label>
                            <AutocompleteInput value={form.estudio_doblaje || ''}
                                onChange={val => set('estudio_doblaje', val || null)} placeholder="Nombre del estudio" suggestions={acEstudios} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nº de Takes</label>
                            <input type="number" min="0" step="1" className="form-input"
                                value={form.num_takes ?? ''}
                                onChange={e => set('num_takes', e.target.value === '' ? null : parseInt(e.target.value))}
                                placeholder="0" />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Fecha de Inicio</label>
                            <input type="date" className="form-input" value={form.fecha_inicio || ''}
                                onChange={e => set('fecha_inicio', e.target.value || null)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha de Fin</label>
                            <input type="date" className="form-input" value={form.fecha_fin || ''}
                                onChange={e => handleFechaFinChange(e.target.value || null)} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notas</label>
                        <textarea className="form-textarea" value={form.notas || ''}
                            onChange={e => set('notas', e.target.value || null)}
                            placeholder="Observaciones, idiomas, referencias de audio, etc." />
                    </div>

                    {/* Datos económicos doblaje */}
                    <div style={{ marginTop: '8px', background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '12px', padding: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calculator size={11} /> Datos Económicos
                        </div>

                        <div className="form-grid">
                            <EuroInput label="Importe Bruto" value={form.tarifa_jornada} onChange={v => set('tarifa_jornada', v)} />
                            <EuroInput label="Importe Neto" hint="lo que recibes tú" value={form.tarifa_neta_jornada} onChange={v => set('tarifa_neta_jornada', v)} />
                        </div>
                        <div className="form-grid" style={{ marginTop: '16px' }}>
                            <div className="form-group">
                                <label className="form-label">Fecha Límite de Cobro</label>
                                <input type="date" className="form-input" value={form.fecha_limite_cobro || ''}
                                    onChange={e => set('fecha_limite_cobro', e.target.value || null)} />
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                                <input type="checkbox" checked={forceFinanzas} onChange={e => setForceFinanzas(e.target.checked)} />
                                <span>{initial ? 'Actualizar/Crear previsión en Finanzas (aún sin haber cobrado)' : 'Crear previsión en Finanzas (aún sin haber cobrado)'}</span>
                            </label>
                        </div>

                        {/* Resumen doblaje */}
                        {hasEcoDoblaje && (
                            <div style={{ marginTop: '12px', padding: '14px 16px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Euro size={10} /> Resumen
                                </div>
                                {ecoDoblaje.bruto > 0 && <SummaryRow label="Importe bruto" value={fmt(ecoDoblaje.bruto)} />}
                                {ecoDoblaje.neto > 0 && <SummaryRow label="Importe neto" value={fmt(ecoDoblaje.neto)} accent="#34d399" big />}
                                {ecoDoblaje.bruto > 0 && ecoDoblaje.neto > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px', opacity: 0.6 }}>
                                        Diferencia (retenciones): {fmt(ecoDoblaje.bruto - ecoDoblaje.neto)}
                                    </div>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', color: 'var(--text-secondary)', fontSize: '10.5px', opacity: 0.6 }}>
                                    <Info size={10} /> Al guardar se crea la entrada en Finanzas con fecha límite a 90 días.
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FORMULARIO EVENTO
            ══════════════════════════════════════════════════════════════ */}
            {isEvento && (
                <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarDays size={11} /> Datos del Evento
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Nombre del Evento *</label>
                            <input className="form-input" value={form.proyecto}
                                onChange={e => set('proyecto', e.target.value)} placeholder="Nombre del evento" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Empresa</label>
                            <input className="form-input" value={form.empresa || ''}
                                onChange={e => set('empresa', e.target.value || null)} placeholder="Empresa organizadora" />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Fecha de Inicio</label>
                            <input type="date" className="form-input" value={form.fecha_inicio || ''}
                                onChange={e => set('fecha_inicio', e.target.value || null)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha de Fin</label>
                            <input type="date" className="form-input" value={form.fecha_fin || ''}
                                onChange={e => handleFechaFinChange(e.target.value || null)} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notas</label>
                        <textarea className="form-textarea" value={form.notas || ''}
                            onChange={e => set('notas', e.target.value || null)}
                            placeholder="Detalles del evento, ubicación, contacto, etc." />
                    </div>

                    {/* Datos económicos evento */}
                    <div style={{ marginTop: '8px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '12px', padding: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calculator size={11} /> Datos Económicos
                        </div>

                        <div className="form-grid">
                            <EuroInput label="Tarifa bruta por jornada" value={form.tarifa_jornada} onChange={v => set('tarifa_jornada', v)} />
                            <EuroInput label="Tarifa neta por jornada" hint="lo que recibes tú" value={form.tarifa_neta_jornada} onChange={v => set('tarifa_neta_jornada', v)} />
                        </div>

                        <div className="form-grid">
                            <NumInput label="Número de jornadas" value={form.num_jornadas} onChange={v => set('num_jornadas', v)} min={1} />
                            <EuroInput label="Tarifa por Traslado / Viaje" hint="importe total" value={form.tarifa_traslado} onChange={v => set('tarifa_traslado', v)} />
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <NumInput label="Horas extra" value={form.horas_extra_evento} onChange={v => set('horas_extra_evento', v)} step={0.5} />
                                {(form.horas_extra_evento ?? 0) > 0 && ecoEvento.tarifaHora > 0 && (
                                    <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>
                                        → {form.horas_extra_evento}h × {fmt(ecoEvento.tarifaHora)}/h = <strong>{fmt(ecoEvento.totalHorasExtra)}</strong>
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Fecha Límite de Cobro</label>
                                <input type="date" className="form-input" value={form.fecha_limite_cobro || ''}
                                    onChange={e => set('fecha_limite_cobro', e.target.value || null)} />
                            </div>
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                                <input type="checkbox" checked={forceFinanzas} onChange={e => setForceFinanzas(e.target.checked)} />
                                <span>{initial ? 'Actualizar/Crear previsión en Finanzas (aún sin haber cobrado)' : 'Crear previsión en Finanzas (aún sin haber cobrado)'}</span>
                            </label>
                        </div>

                        {hasEcoEvento && (
                            <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Euro size={10} /> Resumen estimado
                                </div>
                                {(form.tarifa_jornada ?? 0) > 0 && <SummaryRow label="Bruto" sub={`${form.num_jornadas ?? 1} jornada${(form.num_jornadas ?? 1) !== 1 ? 's' : ''} × ${fmt(form.tarifa_jornada ?? 0)}`} value={fmt(ecoEvento.totalBruto)} />}
                                {(form.tarifa_neta_jornada ?? 0) > 0 && <SummaryRow label="Neto" sub={`${form.num_jornadas ?? 1} × ${fmt(form.tarifa_neta_jornada ?? 0)}`} value={fmt(ecoEvento.totalNeto)} accent="var(--success)" />}
                                {(form.tarifa_traslado ?? 0) > 0 && <SummaryRow label="Traslado/Viaje" value={fmt(ecoEvento.totalTraslado)} accent="#60a5fa" />}
                                {ecoEvento.totalHorasExtra > 0 && <SummaryRow label="Horas extra" sub={`${form.horas_extra_evento}h × ${fmt(ecoEvento.tarifaHora)}/h`} value={fmt(ecoEvento.totalHorasExtra)} accent="#34d399" />}
                                <div style={{ borderTop: '1px solid rgba(245,158,11,0.2)', marginTop: '8px', paddingTop: '8px' }}>
                                    <SummaryRow label="TOTAL ESTIMADO" value={fmt(ecoEvento.totalEstimado)} accent="#f59e0b" big />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', color: 'var(--text-secondary)', fontSize: '10.5px', opacity: 0.6 }}>
                                    <Info size={10} /> Al guardar se crean las entradas en Finanzas con fecha límite a 90 días.
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FORMULARIO RODAJE (serie, cine, tv, publicidad, teatro)
            ══════════════════════════════════════════════════════════════ */}
            {isRodaje && (
                <>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Briefcase size={11} /> Datos del Proyecto
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Proyecto *</label>
                            <input className="form-input" value={form.proyecto}
                                onChange={e => set('proyecto', e.target.value)} placeholder="Nombre del proyecto" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Personaje</label>
                            <input className="form-input" value={form.personaje}
                                onChange={e => set('personaje', e.target.value)} placeholder="Nombre del personaje" />
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Productora</label>
                            <AutocompleteInput value={form.productora || ''}
                                onChange={val => set('productora', val || null)} placeholder="Nombre de la productora" suggestions={acProductoras} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Director/a</label>
                            <AutocompleteInput value={form.director || ''}
                                onChange={val => set('director', val || null)} placeholder="Nombre del director/a" suggestions={acDirectores} />
                        </div>
                    </div>

                    <div className="form-grid-3">
                        <div className="form-group">
                            <label className="form-label">Fecha de Inicio</label>
                            <input type="date" className="form-input" value={form.fecha_inicio || ''}
                                onChange={e => set('fecha_inicio', e.target.value || null)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha de Fin</label>
                            <input type="date" className="form-input" value={form.fecha_fin || ''}
                                onChange={e => set('fecha_fin', e.target.value || null)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fecha/s de Rodaje</label>
                            <input className="form-input" value={form.fecha_rodaje || ''}
                                onChange={e => set('fecha_rodaje', e.target.value || null)} placeholder="Ej: 12-13 mar 2026" />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notas</label>
                        <textarea className="form-textarea" value={form.notas || ''}
                            onChange={e => set('notas', e.target.value || null)}
                            placeholder="Observaciones, localizaciones, contactos del rodaje, etc." />
                    </div>

                    {/* Datos económicos rodaje */}
                    <div style={{ marginTop: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calculator size={11} /> Datos Económicos
                        </div>

                        {/* ROL */}
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">Rol</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {(['ocp', 'secundario', 'fe'] as RolActorPublicidad[]).map(r => (
                                    <button key={r} type="button" onClick={() => set('rol', form.rol === r ? null : r)}
                                        style={{
                                            flex: 1, padding: '8px 6px', borderRadius: '8px', border: '1px solid',
                                            borderColor: form.rol === r ? ROL_COLORS[r] : 'var(--border)',
                                            background: form.rol === r ? `${ROL_COLORS[r]}18` : 'transparent',
                                            color: form.rol === r ? ROL_COLORS[r] : 'var(--text-secondary)',
                                            fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                            transition: 'all 0.15s ease', textAlign: 'center',
                                        }}>
                                        {ROL_LABELS[r]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Jornadas */}
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                            <SectionTitle color="var(--accent-light)" emoji="🎬" title="Jornadas de Rodaje" />
                            <div className="form-grid">
                                <EuroInput label="Tarifa bruta por jornada" value={form.tarifa_jornada} onChange={v => set('tarifa_jornada', v)} />
                                <NumInput label="Número de jornadas" value={form.num_jornadas} onChange={v => set('num_jornadas', v)} min={1} />
                            </div>
                        </div>

                        {/* Fitting */}
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                            <SectionTitle color="#fbbf24" emoji="👗" title="Fitting" subtitle="— 2h incluidas, se cobra por hora las adicionales" />
                            <div className="form-grid">
                                <NumInput label="Horas de fitting extra" hint="por encima de 2h" value={form.horas_fitting_extra} onChange={v => set('horas_fitting_extra', v)} step={0.5} />
                                <EuroInput label="Tarifa hora extra" hint="fitting y horas extra convenio" value={form.tarifa_hora_extra}
                                    onChange={v => set('tarifa_hora_extra', v)}
                                    placeholder={form.tarifa_jornada ? (form.tarifa_jornada / 8).toFixed(2) : '0.00'} />
                            </div>
                        </div>

                        {/* Travel Days */}
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                            <SectionTitle color="#60a5fa" emoji="✈️" title="Travel Days" subtitle="— 50% de tarifa jornada por día de viaje" />
                            <div style={{ maxWidth: '50%' }}>
                                <NumInput label="Número de travel days" value={form.num_travel_days} onChange={v => set('num_travel_days', v)} />
                            </div>
                            {(form.num_travel_days ?? 0) > 0 && (form.tarifa_jornada ?? 0) > 0 && (
                                <div style={{ fontSize: '12px', color: '#60a5fa', marginTop: '4px' }}>
                                    → {form.num_travel_days} × {fmt((form.tarifa_jornada ?? 0) * 0.5)} = <strong>{fmt((form.num_travel_days ?? 0) * (form.tarifa_jornada ?? 0) * 0.5)}</strong>
                                </div>
                            )}
                        </div>

                        {/* Horas extra convenio */}
                        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '14px' }}>
                            <SectionTitle color="#34d399" emoji="⏱️" title="Horas Extra Convenio" subtitle="— horas extra al finalizar el proyecto" />
                            <div style={{ maxWidth: '50%' }}>
                                <NumInput label="Horas extra" value={form.horas_extra_convenio} onChange={v => set('horas_extra_convenio', v)} step={0.5} />
                            </div>
                            {(form.horas_extra_convenio ?? 0) > 0 && (
                                <div style={{ fontSize: '12px', color: '#34d399', marginTop: '4px' }}>
                                    → {form.horas_extra_convenio}h × {fmt(ecoRodaje.tarifaHora)}/h = <strong>{fmt(ecoRodaje.nomHorasExtra)}</strong>
                                </div>
                            )}
                        </div>

                        {/* Derechos de imagen */}
                        <div>
                            <SectionTitle color="#a78bfa" emoji="📸" title="Derechos de Imagen" />
                            <div className="form-grid">
                                <EuroInput label="Importe bruto" value={form.derechos_imagen} onChange={v => set('derechos_imagen', v)} />
                                <div className="form-group">
                                    <label className="form-label">Comisión agencia / representante (%)</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="number" min="0" max="100" step="0.5" className="form-input"
                                            style={{ paddingRight: '32px' }}
                                            value={form.comision_pct ?? ''}
                                            onChange={e => set('comision_pct', e.target.value === '' ? null : parseFloat(e.target.value))}
                                            placeholder="10" />
                                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none' }}>%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Facturado vía</label>
                                    <input className="form-input" value={form.facturado_via || ''}
                                        onChange={e => set('facturado_via', e.target.value || null)}
                                        placeholder="Agencia o representante que gestiona la factura" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha Límite de Cobro</label>
                                    <input type="date" className="form-input" value={form.fecha_limite_cobro || ''}
                                        onChange={e => set('fecha_limite_cobro', e.target.value || null)} />
                                </div>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-primary)' }}>
                                    <input type="checkbox" checked={forceFinanzas} onChange={e => setForceFinanzas(e.target.checked)} />
                                    <span>{initial ? 'Actualizar/Crear previsión en Finanzas (aún sin haber cobrado)' : 'Crear previsión en Finanzas (aún sin haber cobrado)'}</span>
                                </label>
                            </div>
                        </div>

                        {/* Resumen rodaje */}
                        {hasEcoRodaje && (
                            <div style={{ marginTop: '16px', padding: '14px 16px', background: 'rgba(124,106,247,0.06)', border: '1px solid rgba(124,106,247,0.2)', borderRadius: '10px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-light)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Euro size={10} /> Resumen estimado
                                </div>
                                {ecoRodaje.nomBase > 0 && <SummaryRow label="Nómina base" sub={`${form.num_jornadas ?? 1} × ${fmt(form.tarifa_jornada ?? 0)}`} value={fmt(ecoRodaje.nomBase)} />}
                                {ecoRodaje.nomFitting > 0 && <SummaryRow label="Fitting extra" sub={`${form.horas_fitting_extra}h × ${fmt(ecoRodaje.tarifaHora)}/h`} value={fmt(ecoRodaje.nomFitting)} accent="#fbbf24" />}
                                {ecoRodaje.nomTravel > 0 && <SummaryRow label="Travel days" sub={`${form.num_travel_days} × 50%`} value={fmt(ecoRodaje.nomTravel)} accent="#60a5fa" />}
                                {ecoRodaje.nomHorasExtra > 0 && <SummaryRow label="Horas extra convenio" sub={`${form.horas_extra_convenio}h × ${fmt(ecoRodaje.tarifaHora)}/h`} value={fmt(ecoRodaje.nomHorasExtra)} accent="#34d399" />}
                                {ecoRodaje.totalNomina > 0 && <SummaryRow label="Subtotal nómina" value={fmt(ecoRodaje.totalNomina)} big />}
                                {(form.derechos_imagen ?? 0) > 0 && (
                                    <>
                                        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', margin: '8px 0' }} />
                                        <SummaryRow label="Derechos de imagen (bruto)" value={fmt(form.derechos_imagen ?? 0)} />
                                        <SummaryRow label={`Comisión ${form.comision_pct ?? 0}%`} sub={form.facturado_via || undefined} value={`− ${fmt(ecoRodaje.comisionImporte)}`} accent="var(--danger)" />
                                        <SummaryRow label="Derechos neto" value={fmt(ecoRodaje.derechosNeto)} accent="#a78bfa" big />
                                    </>
                                )}
                                <div style={{ borderTop: '1px solid rgba(124,106,247,0.25)', marginTop: '10px', paddingTop: '10px' }}>
                                    <SummaryRow label="TOTAL ESTIMADO BRUTO" value={fmt(ecoRodaje.totalEstimado)} accent="var(--accent-light)" big />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', color: 'var(--text-secondary)', fontSize: '10.5px', opacity: 0.6 }}>
                                    <Info size={10} /> Importes brutos antes de IRPF. Se crean entradas en Finanzas con fecha límite a 90 días.
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </Modal>
    )
}
