'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useCastings, useProyectos, useFinanzas } from '@/hooks/useData'
import CastingFormModal from '@/components/CastingFormModal'
import {
    BadgeEstado, BadgeTipoProyecto,
    formatDate, LoadingSkeleton, EmptyState
} from '@/components/ui'
import { Casting, EstadoCasting } from '@/lib/supabase'
import {
    Film, Plus, Search, Pencil, Trash2,
    Clapperboard, ChevronDown, CheckCircle2, Circle, Bell, X,
    Eye, EyeOff
} from 'lucide-react'

const ESTADOS_OPCIONES: { val: EstadoCasting; label: string; color: string }[] = [
    { val: 'pendiente', label: 'Recibido', color: 'var(--text-secondary)' },
    { val: 'enviado', label: 'En proceso', color: 'var(--info)' },
    { val: 'seleccionado', label: 'Seleccionado', color: 'var(--success)' },
    { val: 'descartado', label: 'Descartado', color: 'var(--danger)' },
]

const estadoFilters = [
    { val: '', label: 'Todos' },
    { val: 'pendiente', label: 'No enviados' },
    { val: 'en_proceso', label: 'En proceso' },
    { val: 'opcionado', label: 'Opcionados', color: '#f97316' },
    { val: 'callback', label: 'Con Callback' },
    { val: 'seleccionado', label: 'Seleccionado' },
    { val: 'descartado', label: 'Descartado' },
]

function CastingProgresionDropdown({ casting, onUpdate }: { casting: Casting, onUpdate: (id: string, data: Partial<Casting>) => Promise<void> }) {
    const [open, setOpen] = useState(false)
    const [updating, setUpdating] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const toggleFlag = async (field: 'fue_opcionado' | 'tuvo_callback') => {
        setUpdating(true)
        try {
            await onUpdate(casting.id, { [field]: !casting[field] })
        } finally {
            setUpdating(false)
        }
    }

    // Determinar hito principal para mostrar en el botón
    const getActiveMilestone = () => {
        if (casting.estado === 'seleccionado') return { label: 'Seleccionado', color: 'var(--success)', icon: <CheckCircle2 size={12} /> }
        if (casting.estado === 'descartado') return { label: 'Descartado', color: 'var(--danger)', icon: <X size={12} /> }
        if (casting.tuvo_callback) return { label: 'Callback', color: 'var(--warning)', icon: <CheckCircle2 size={12} /> }
        if (casting.fue_opcionado) return { label: 'Opcionado', color: '#f97316', icon: <CheckCircle2 size={12} /> }
        if (casting.estado === 'enviado') return { label: 'Enviado', color: 'var(--info)', icon: <CheckCircle2 size={12} /> }
        return { label: 'Recibido', color: 'var(--text-secondary)', icon: <Circle size={12} /> }
    }

    const current = getActiveMilestone()

    return (
        <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button 
                onClick={() => setOpen(!open)}
                disabled={updating}
                style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    padding: '4px 10px', borderRadius: '20px', 
                    background: `${current.color}15`, border: `1px solid ${current.color}40`,
                    color: current.color, fontSize: '11px', fontWeight: 700, 
                    cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
                }}
            >
                {current.icon}
                {current.label}
                <ChevronDown size={10} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {open && (
                <div style={{ 
                    position: 'absolute', top: 'calc(100% + 5px)', left: 0, zIndex: 100,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '10px', padding: '6px', minWidth: '150px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'scaleUp 0.1s ease-out'
                }}>
                    <div style={{ padding: '4px 8px', fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Hitos del Proceso</div>
                    
                    <MilestoneItem label="Enviado" done={casting.estado !== 'pendiente'} color="var(--info)" onClick={() => onUpdate(casting.id, { estado: casting.estado === 'pendiente' ? 'enviado' : 'pendiente' })} isAction />
                    
                    <MilestoneItem label="No enviado" done={casting.estado === 'pendiente'} color="var(--text-secondary)" onClick={() => onUpdate(casting.id, { estado: 'pendiente' })} isAction />

                    <MilestoneItem 
                        label="Opcionado" 
                        done={casting.fue_opcionado} 
                        color="#f97316" 
                        onClick={() => toggleFlag('fue_opcionado')}
                        isAction
                    />
                    
                    <MilestoneItem 
                        label={casting.tipo_callback === 'zoom' ? 'Callback Zoom' : 'Callback'} 
                        done={casting.tuvo_callback} 
                        color="var(--warning)" 
                        onClick={() => toggleFlag('tuvo_callback')}
                        isAction
                    />

                    {casting.estado === 'seleccionado' && (
                        <MilestoneItem label="¡Seleccionado!" done={true} color="var(--success)" />
                    )}
                </div>
            )}
        </div>
    )
}

function MilestoneItem({ label, done, color, onClick, isAction }: { label: string, done: boolean, color: string, onClick?: () => void, isAction?: boolean }) {
    return (
        <button 
            onClick={onClick}
            disabled={!isAction}
            style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                width: '100%', padding: '7px 10px', borderRadius: '6px',
                background: 'transparent', border: 'none',
                color: done ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '12px', cursor: isAction ? 'pointer' : 'default',
                textAlign: 'left', transition: 'background 0.2s'
            }}
            onMouseEnter={e => isAction && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => isAction && (e.currentTarget.style.background = 'transparent')}
        >
            {done ? <CheckCircle2 size={13} color={color} /> : <Circle size={13} style={{ opacity: 0.2 }} />}
            <span style={{ flex: 1, fontWeight: done ? 600 : 400 }}>{label}</span>
            {isAction && <span style={{ fontSize: '9px', opacity: 0.4 }}>{done ? 'Quitar' : 'Marcar'}</span>}
        </button>
    )
}

function DeadlineBadge({ date }: { date: string }) {
    const now = new Date()
    const deadline = new Date(date + 'T23:59:59')
    const diffH = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (diffH <= 0) return <span style={{ fontSize: '10px', color: 'var(--danger)', fontWeight: 700 }}>¡PLAZO VENCIDO!</span>

    let color = 'var(--text-secondary)'
    let label = ''

    if (diffH <= 12) { color = 'var(--danger)'; label = '12h' }
    else if (diffH <= 24) { color = 'var(--warning)'; label = '24h' }
    else if (diffH <= 48) { color = '#60a5fa'; label = '48h' }
    else return <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(date)}</span>

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color, fontWeight: 700, fontSize: '11px' }}>
            <Bell size={10} />
            {label}
        </div>
    )
}

// ── Inline estado badge + dropdown ──────────────────────────────────────────
function EstadoBadgeInline({
    casting,
    onUpdate,
}: {
    casting: Casting
    onUpdate: (id: string, estado: EstadoCasting) => Promise<void>
}) {
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ top: 0, left: 0 })
    const [updating, setUpdating] = useState(false)
    const btnRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current && !menuRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const handleOpen = () => {
        if (!btnRef.current) return
        const rect = btnRef.current.getBoundingClientRect()
        const menuWidth = 210
        const left = rect.left + menuWidth > window.innerWidth ? rect.right - menuWidth : rect.left
        setPos({ top: rect.bottom + 6, left })
        setOpen(o => !o)
    }

    const handleSelect = async (val: EstadoCasting) => {
        if (val === casting.estado) { setOpen(false); return }
        setUpdating(true); setOpen(false)
        try { await onUpdate(casting.id, val) }
        finally { setUpdating(false) }
    }

    return (
        <>
            <button ref={btnRef} onClick={handleOpen} disabled={updating} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', padding: 0, cursor: updating ? 'wait' : 'pointer', opacity: updating ? 0.6 : 1 }}>
                <BadgeEstado estado={casting.estado} />
                <ChevronDown size={11} color="var(--text-secondary)" />
            </button>
            {open && (
                <div ref={menuRef} style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '6px', width: '210px', boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
                    {ESTADOS_OPCIONES.map(({ val, label, color }) => (
                        <button key={val} onClick={() => handleSelect(val)} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', borderRadius: '7px', background: val === casting.estado ? 'rgba(255,255,255,0.07)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: val === casting.estado ? color : 'var(--text-primary)', fontSize: '13.5px', fontWeight: val === casting.estado ? 600 : 400, fontFamily: 'inherit' }}>
                            <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </>
    )
}

function CastingMobileCard({ 
    casting, 
    onEdit, 
    onDelete, 
    onUpdate,
    onConvertToProject,
    converting
}: { 
    casting: Casting, 
    onEdit: (c: Casting) => void, 
    onDelete: (id: string) => void,
    onUpdate: (id: string, data: Partial<Casting>) => Promise<void>,
    onConvertToProject: (c: Casting) => Promise<void>,
    converting: string | null
}) {
    const [showMore, setShowMore] = useState(false)

    return (
        <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <BadgeTipoProyecto tipo={casting.tipo_proyecto} />
                    <EstadoBadgeInline casting={casting} onUpdate={async (id, est) => { await onUpdate(id, { estado: est }) }} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-icon btn-ghost" onClick={() => onEdit(casting)}><Pencil size={14} /></button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => onDelete(casting.id)}><Trash2 size={14} /></button>
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{casting.proyecto}</div>
                <div style={{ fontSize: '13px', color: 'var(--accent-light)', fontWeight: 500 }}>{casting.personaje}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {casting.tipo_casting === 'presencial' ? 'Fecha Casting:' : 'Entrega Máx:'}
                    </span>
                    <DeadlineBadge date={casting.fecha_casting} />
                </div>
                
                {casting.localizacion && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Localización:</span>
                        <span style={{ color: 'var(--text-primary)' }}>📍 {casting.localizacion}</span>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Progresión:</span>
                    <CastingProgresionDropdown casting={casting} onUpdate={onUpdate} />
                </div>
            </div>

            {showMore && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', animation: 'fadeIn 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Director Casting:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{casting.director_casting || '—'}</span>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                <button 
                    className="btn btn-secondary btn-sm" 
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setShowMore(!showMore)}
                >
                    {showMore ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showMore ? 'Ver menos' : 'Ver más'}
                </button>
                
                {casting.estado === 'seleccionado' && (
                    <button 
                        className="btn btn-primary btn-sm" 
                        style={{ flex: 1, justifyContent: 'center', background: 'var(--success)', borderColor: 'var(--success)' }}
                        onClick={() => onConvertToProject(casting)}
                        disabled={converting === casting.id}
                    >
                        <Clapperboard size={14} /> {converting === casting.id ? '…' : 'A Proyecto'}
                    </button>
                )}
            </div>
        </div>
    )
}

export default function CastingsPage() {
    const { data, loading, create, update, remove } = useCastings()
    const { create: createProyecto } = useProyectos()
    const { create: createFinanza, data: finanzas } = useFinanzas()
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Casting | null>(null)
    const [search, setSearch] = useState('')
    const [estadoFilter, setEstadoFilter] = useState('')
    const [tipoFilter, setTipoFilter] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [converting, setConverting] = useState<string | null>(null)

    const filtered = useMemo(() => {
        return data.filter(c => {
            const q = search.toLowerCase()
            const matchSearch = !q || c.proyecto.toLowerCase().includes(q) || c.personaje.toLowerCase().includes(q)
            let matchEstado = true
            if (estadoFilter === 'opcionado') matchEstado = c.fue_opcionado
            else if (estadoFilter === 'callback') matchEstado = c.tuvo_callback
            else if (estadoFilter === 'en_proceso') matchEstado = c.estado === 'enviado'
            else if (estadoFilter) matchEstado = c.estado === estadoFilter
            const matchTipo = !tipoFilter || c.tipo_proyecto === tipoFilter
            return matchSearch && matchEstado && matchTipo
        })
    }, [data, search, estadoFilter, tipoFilter])

    const handleSave = async (form: Omit<Casting, 'id' | 'created_at'>) => {
        if (editing) await update(editing.id, form)
        else await create(form)

        const esDescartado = form.estado === 'descartado'
        const tieneCallbackCobrable = form.tuvo_callback && form.cobra_callback && (form.tarifa_callback ?? 0) > 0

        if (esDescartado && tieneCallbackCobrable) {
            const yaExiste = finanzas.some((f: { proyecto_nombre: string; tipo_ingreso: string }) => f.proyecto_nombre === form.proyecto && f.tipo_ingreso === 'callback')
            if (!yaExiste) {
                const fechaBase = form.fecha_casting
                const fechaLimite = (() => { const d = new Date(fechaBase + 'T12:00:00'); d.setDate(d.getDate() + 90); return d.toISOString().split('T')[0] })()
                await createFinanza({
                    proyecto_id: null, proyecto_nombre: form.proyecto, tipo_ingreso: 'callback', cantidad: form.tarifa_callback!,
                    fecha_factura: fechaBase, fecha_limite_cobro: fechaLimite, fecha_pago: null, estado_pago: 'pendiente',
                    comision_representante: null, impuestos_estimados: null, notas: `Callback ${form.tipo_callback === 'zoom' ? 'online/Zoom' : 'presencial'} · ${form.personaje} · Descartado`,
                })
            }
        }
    }

    const handleEstadoUpdate = async (id: string, estado: EstadoCasting) => { await update(id, { estado }) }
    const handleDelete = async (id: string) => { await remove(id); setDeleteConfirm(null) }

    const handleConvertToProject = async (casting: Casting) => {
        setConverting(casting.id)
        try {
            await createProyecto({
                casting_id: casting.id, proyecto: casting.proyecto, personaje: casting.personaje,
                tipo_proyecto: casting.tipo_proyecto, productora: casting.productora, director: casting.director_casting,
                fecha_inicio: casting.fecha_inicio || null, fecha_fin: casting.fecha_fin || null, 
                fecha_rodaje: casting.fechas_rodaje || null,
                prueba_vestuario_fecha: casting.prueba_vestuario_fecha || null,
                travel_ida: casting.travel_ida || casting.travel_fecha || null,
                travel_vuelta: casting.travel_vuelta || null,
                notas: casting.notas ?? null,
                rol: casting.rol_seleccionado as any || null,
                tarifa_jornada: casting.tarifa_jornada || (casting.rol_seleccionado === 'ocp' ? casting.ocp_tarifa_bruta : casting.rol_seleccionado === 'secundario' ? casting.sec_tarifa_bruta : casting.rol_seleccionado === 'fe' ? casting.fe_tarifa_bruta : null),
                num_jornadas: casting.num_jornadas || 1,
                derechos_imagen: casting.derechos_imagen || (casting.rol_seleccionado === 'ocp' ? casting.ocp_buyout : casting.rol_seleccionado === 'secundario' ? casting.sec_buyout : casting.rol_seleccionado === 'fe' ? casting.fe_buyout : null),
                comision_pct: casting.comision_pct || 10,
                facturado_via: casting.nombre_agencia ?? null,
                horas_fitting_extra: casting.horas_fitting_extra, tarifa_hora_extra: casting.tarifa_hora_extra,
                num_travel_days: casting.num_travel_days, horas_extra_convenio: casting.horas_extra_convenio,
                empresa: null, tarifa_neta_jornada: casting.tarifa_neta_jornada, tarifa_traslado: casting.tarifa_traslado, horas_extra_evento: null,
                estudio_doblaje: null, num_takes: casting.num_takes, fecha_limite_cobro: null,
            })
            alert(`✅ Proyecto "${casting.proyecto}" creado.`)
        } catch { alert('Error al crear el proyecto.') } finally { setConverting(null) }
    }

    const openEdit = (c: Casting) => { setEditing(c); setModalOpen(true) }
    const openNew = () => { setEditing(null); setModalOpen(true) }

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>Castings</h2>
                        <p>{data.length} castings registrados</p>
                    </div>
                    <button className="btn btn-primary" onClick={openNew}><Plus size={14} /> Nuevo Casting</button>
                </div>
            </div>

            <div className="page-body">
                {/* Stats Summary */}
                <div className="stat-grid mb-6">
                    {[
                        { val: 'total', label: 'Recibidos', color: '#9d8fff', count: data.length },
                        { val: 'enviados', label: 'Enviados', color: 'var(--info)', count: data.filter(c => c.estado !== 'pendiente').length },
                        { val: 'no_enviado', label: 'No enviados', color: 'var(--text-secondary)', count: data.filter(c => c.estado === 'pendiente').length },
                        { val: 'opcionado', label: 'Opcionados', color: '#f97316', count: data.filter(c => c.fue_opcionado).length },
                        { val: 'callback', label: 'Callbacks', color: 'var(--warning)', count: data.filter(c => c.tuvo_callback).length },
                        { val: 'seleccionado', label: 'Selecc.', color: 'var(--success)', count: data.filter(c => c.estado === 'seleccionado').length },
                    ].map(({ val, label, color, count }) => (
                        <div
                            key={val}
                            className={`stat-card cursor-pointer ${estadoFilter === (val === 'total' ? '' : val === 'no_enviado' ? 'pendiente' : val === 'enviados' ? 'en_proceso' : val) ? 'active' : ''}`}
                            onClick={() => setEstadoFilter(val === 'total' ? '' : val === 'no_enviado' ? 'pendiente' : val === 'enviados' ? 'en_proceso' : val)}
                            style={{
                                borderLeft: `3px solid ${color}`,
                                background: (estadoFilter === (val === 'total' ? '' : val === 'no_enviado' ? 'pendiente' : val === 'enviados' ? 'en_proceso' : val)) ? 'rgba(255,255,255,0.04)' : 'var(--bg-card)'
                            }}
                        >
                            <div className="stat-value" style={{ color, fontSize: '20px' }}>{count}</div>
                            <div className="stat-label" style={{ marginBottom: 0, fontSize: '10px' }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Received vs Sent Progress Bar */}
                <div className="card mb-6" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontWeight: 600 }}>
                        <span>Progreso de Castings: Recibidos ({data.length}) vs Enviados ({data.filter(c => c.estado !== 'pendiente').length})</span>
                        <span style={{ color: 'var(--info)' }}>{data.length ? Math.round((data.filter(c => c.estado !== 'pendiente').length / data.length) * 100) : 0}% efectividad</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${data.length ? (data.filter(c => c.estado !== 'pendiente').length / data.length) * 100 : 0}%`, background: 'var(--info)', borderRadius: '4px' }} />
                    </div>
                </div>

                <div className="action-row">
                    <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                        <Search size={14} color="var(--text-secondary)" />
                        <input placeholder="Buscar proyecto..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="filter-pills">
                        {estadoFilters.map(f => (
                            <button key={f.val} className={`filter-pill ${estadoFilter === f.val ? 'active' : ''}`} onClick={() => setEstadoFilter(f.val)}>{f.label}</button>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: 0, background: 'transparent', border: 'none' }}>
                    {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
                        <EmptyState icon={<Film size={48} />} title="No hay castings" description="Registra tu primer casting para empezar." action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} />Nuevo Casting</button>} />
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="table-wrapper desktop-only" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Proyecto / Personaje</th>
                                            <th>Tipo / Localiz.</th>
                                            <th>Entrega Máx. / Fecha</th>
                                            <th>Director Casting</th>
                                            <th>Progresión</th>
                                            <th>Estado</th>
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(c => (
                                            <tr key={c.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{c.proyecto}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pe: {c.personaje}</div>
                                                </td>
                                                <td>
                                                    <BadgeTipoProyecto tipo={c.tipo_proyecto} />
                                                    {c.localizacion && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>📍 {c.localizacion}</div>}
                                                </td>
                                                <td><DeadlineBadge date={c.fecha_casting} /></td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{c.director_casting || '—'}</td>
                                                <td><CastingProgresionDropdown casting={c} onUpdate={update} /></td>
                                                <td><EstadoBadgeInline casting={c} onUpdate={handleEstadoUpdate} /></td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                        {c.estado === 'seleccionado' && (
                                                            <button className="btn btn-sm" style={{ fontSize: '11px', background: 'var(--success-dim)', color: 'var(--success)', borderColor: 'rgba(52,211,153,0.3)' }} onClick={() => handleConvertToProject(c)} disabled={converting === c.id}>
                                                                <Clapperboard size={11} /> {converting === c.id ? '…' : 'Proyecto'}
                                                            </button>
                                                        )}
                                                        <button className="btn btn-icon btn-ghost" onClick={() => openEdit(c)}><Pencil size={13} /></button>
                                                        <button className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(c.id)}><Trash2 size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="mobile-only">
                                {filtered.map(c => (
                                    <CastingMobileCard 
                                        key={c.id} 
                                        casting={c} 
                                        onEdit={openEdit} 
                                        onDelete={setDeleteConfirm} 
                                        onUpdate={update}
                                        onConvertToProject={handleConvertToProject}
                                        converting={converting}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <CastingFormModal
                key={editing?.id || 'new'}
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditing(null) }}
                onSave={handleSave}
                initial={editing}
            />

            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Eliminar casting</h3></div>
                        <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>¿Seguro que quieres eliminar este casting?</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
