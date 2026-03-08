'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useCastings, useProyectos, useFinanzas } from '@/hooks/useData'
import CastingFormModal from '@/components/CastingFormModal'
import {
    BadgeEstado, BadgeTipoProyecto, BadgeTipoCasting,
    formatDate, LoadingSkeleton, EmptyState
} from '@/components/ui'
import { Casting, EstadoCasting } from '@/lib/supabase'
import {
    Film, Plus, Search, Pencil, Trash2, ExternalLink,
    Clapperboard, ChevronDown, CheckCircle2, Circle
} from 'lucide-react'

const ESTADOS_OPCIONES: { val: EstadoCasting; label: string; color: string }[] = [
    { val: 'enviado', label: 'En proceso', color: 'var(--info)' },
    { val: 'seleccionado', label: 'Seleccionado', color: 'var(--success)' },
    { val: 'descartado', label: 'Descartado', color: 'var(--danger)' },
]

const estadoFilters = [
    { val: '', label: 'Todos' },
    { val: 'en_proceso', label: 'En proceso' },
    { val: 'opcionado', label: 'Opcionados' },
    { val: 'callback', label: 'Con Callback' },
    { val: 'seleccionado', label: 'Seleccionado' },
    { val: 'descartado', label: 'Descartado' },
]

// ── Mini pipeline para mostrar en la tabla ────────────────────────────────────
function CastingMilestones({ casting }: { casting: Casting }) {
    const dot = (done: boolean, label: string, color: string) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
            {done
                ? <CheckCircle2 size={13} color={color} />
                : <Circle size={13} color='rgba(255,255,255,0.15)' />}
            <span style={{ fontSize: '9px', color: done ? color : 'rgba(255,255,255,0.2)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {label}
            </span>
        </div>
    )
    const arrow = (active: boolean) => (
        <span style={{ color: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', fontSize: '10px', marginTop: '-6px' }}>›</span>
    )
    const resultColor = casting.estado === 'seleccionado' ? 'var(--success)'
        : casting.estado === 'descartado' ? 'var(--danger)'
            : 'rgba(255,255,255,0.2)'
    const resultLabel = casting.estado === 'seleccionado' ? 'Elegido'
        : casting.estado === 'descartado' ? 'Descartado'
            : 'Pendiente'

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {dot(true, 'Enviado', 'var(--info)')}
            {arrow(true)}
            {dot(casting.fue_opcionado, 'Opcionado', '#a78bfa')}
            {arrow(casting.fue_opcionado)}
            {dot(casting.tuvo_callback, casting.tipo_callback === 'zoom' ? 'CB Zoom' : casting.tipo_callback === 'presencial' ? 'CB Presencial' : 'Callback', 'var(--warning)')}
            {arrow(casting.fue_opcionado)}
            {dot(casting.estado !== 'enviado', resultLabel, resultColor)}
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

    // Cerrar al clicar fuera
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
        // Si estaría fuera de la pantalla por la derecha, lo ancla a la derecha del botón
        const menuWidth = 210
        const left = rect.left + menuWidth > window.innerWidth
            ? rect.right - menuWidth
            : rect.left
        setPos({ top: rect.bottom + 6, left })
        setOpen(o => !o)
    }

    const handleSelect = async (val: EstadoCasting) => {
        if (val === casting.estado) { setOpen(false); return }
        setUpdating(true)
        setOpen(false)
        try { await onUpdate(casting.id, val) }
        finally { setUpdating(false) }
    }

    return (
        <>
            <button
                ref={btnRef}
                onClick={handleOpen}
                disabled={updating}
                title="Cambiar estado"
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'none', border: 'none', padding: 0,
                    cursor: updating ? 'wait' : 'pointer',
                    opacity: updating ? 0.6 : 1,
                }}
            >
                <BadgeEstado estado={casting.estado} />
                <ChevronDown size={11} color="var(--text-secondary)" />
            </button>

            {open && (
                <div
                    ref={menuRef}
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        zIndex: 9999,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        borderRadius: '12px',
                        padding: '6px',
                        width: '210px',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
                        animation: 'slideUp 0.12s ease',
                    }}
                >
                    {ESTADOS_OPCIONES.map(({ val, label, color }) => (
                        <button
                            key={val}
                            onClick={() => handleSelect(val)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                width: '100%', padding: '9px 12px', borderRadius: '7px',
                                background: val === casting.estado ? 'rgba(255,255,255,0.07)' : 'transparent',
                                border: 'none', cursor: 'pointer', textAlign: 'left',
                                color: val === casting.estado ? color : 'var(--text-primary)',
                                fontSize: '13.5px', fontWeight: val === casting.estado ? 600 : 400,
                                fontFamily: 'inherit',
                                transition: 'background 0.1s ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                            onMouseLeave={e => (e.currentTarget.style.background = val === casting.estado ? 'rgba(255,255,255,0.07)' : 'transparent')}
                        >
                            <span style={{
                                width: 9, height: 9, borderRadius: '50%',
                                background: color, flexShrink: 0,
                            }} />
                            {label}
                            {val === casting.estado && (
                                <span style={{ marginLeft: 'auto', fontSize: '10px', opacity: 0.5 }}>actual</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </>
    )
}


// ── Main page ────────────────────────────────────────────────────────────────
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
            const matchSearch = !q || c.proyecto.toLowerCase().includes(q)
                || c.personaje.toLowerCase().includes(q)
                || (c.director_casting?.toLowerCase().includes(q) ?? false)
                || (c.productora?.toLowerCase().includes(q) ?? false)
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

        // Si hay callback cobrable Y el resultado es descartado → crear entrada en Finanzas
        const esDescartado = form.estado === 'descartado'
        const tieneCallbackCobrable = form.tuvo_callback && form.cobra_callback && (form.tarifa_callback ?? 0) > 0

        if (esDescartado && tieneCallbackCobrable) {
            // Comprobar que no existe ya una entrada de callback para este casting
            const yaExiste = finanzas.some((f: { proyecto_nombre: string; tipo_ingreso: string }) =>
                f.proyecto_nombre === form.proyecto && f.tipo_ingreso === 'callback'
            )
            if (!yaExiste) {
                const fechaBase = form.fecha_casting
                const fechaLimite = (() => {
                    const d = new Date(fechaBase + 'T12:00:00')
                    d.setDate(d.getDate() + 90)
                    return d.toISOString().split('T')[0]
                })()
                await createFinanza({
                    proyecto_id: null,
                    proyecto_nombre: form.proyecto,
                    tipo_ingreso: 'callback',
                    cantidad: form.tarifa_callback!,
                    fecha_factura: fechaBase,
                    fecha_limite_cobro: fechaLimite,
                    fecha_pago: null,
                    estado_pago: 'pendiente',
                    comision_representante: null,
                    impuestos_estimados: null,
                    notas: `Callback ${form.tipo_callback === 'zoom' ? 'online/Zoom' : 'presencial'} · ${form.personaje} · Descartado`,
                })
            }
        }
    }

    const handleEstadoUpdate = async (id: string, estado: EstadoCasting) => {
        await update(id, { estado })
    }

    const handleDelete = async (id: string) => {
        await remove(id)
        setDeleteConfirm(null)
    }

    const handleConvertToProject = async (casting: Casting) => {
        setConverting(casting.id)
        try {
            await createProyecto({
                casting_id: casting.id,
                proyecto: casting.proyecto,
                personaje: casting.personaje,
                tipo_proyecto: casting.tipo_proyecto,
                productora: casting.productora,
                director: casting.director_casting,
                fecha_inicio: null,
                fecha_fin: null,
                fecha_rodaje: null,
                notas: casting.notas ?? null,
                // Económicos rodaje — se rellenan en la pantalla Proyectos
                rol: null,
                tarifa_jornada: null,
                num_jornadas: 1,
                derechos_imagen: null,
                comision_pct: 10,
                facturado_via: casting.nombre_agencia ?? null,
                horas_fitting_extra: null,
                tarifa_hora_extra: null,
                num_travel_days: null,
                horas_extra_convenio: null,
                // Económicos evento
                empresa: null,
                tarifa_neta_jornada: null,
                tarifa_traslado: null,
                horas_extra_evento: null,
                // Doblaje
                estudio_doblaje: null,
                num_takes: null,
                // Finanzas
                fecha_limite_cobro: null,
            })
            alert(`✅ Proyecto "${casting.proyecto}" creado. Ábrelo en Proyectos para añadir los datos económicos.`)
        } catch {
            alert('Error al crear el proyecto.')
        } finally {
            setConverting(null)
        }
    }

    const openEdit = (c: Casting) => { setEditing(c); setModalOpen(true) }
    const openNew = () => { setEditing(null); setModalOpen(true) }

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>Castings</h2>
                        <p>{data.length} castings registrados en total</p>
                    </div>
                    <button className="btn btn-primary" onClick={openNew}>
                        <Plus size={14} /> Nuevo Casting
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Filters */}
                <div className="action-row">
                    <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                        <Search size={14} color="var(--text-secondary)" />
                        <input
                            placeholder="Buscar proyecto, personaje, director..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="filter-pills">
                        {estadoFilters.map(f => (
                            <button
                                key={f.val}
                                className={`filter-pill ${estadoFilter === f.val ? 'active' : ''}`}
                                onClick={() => setEstadoFilter(f.val)}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <select
                        className="form-select"
                        style={{ width: 150 }}
                        value={tipoFilter}
                        onChange={e => setTipoFilter(e.target.value)}
                    >
                        <option value="">Todos los tipos</option>
                        <option value="serie">Serie</option>
                        <option value="cine">Cine</option>
                        <option value="publicidad">Publicidad</option>
                        <option value="teatro">Teatro</option>
                        <option value="doblaje">Doblaje</option>
                    </select>
                </div>

                <div className="card" style={{ padding: 0 }}>
                    {loading ? <LoadingSkeleton /> : filtered.length === 0 ? (
                        <EmptyState
                            icon={<Film size={48} />}
                            title="No hay castings"
                            description="Registra tu primer casting para empezar a hacer seguimiento."
                            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} />Nuevo Casting</button>}
                        />
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Proyecto</th>
                                        <th>Personaje</th>
                                        <th>Tipo</th>
                                        <th>Fecha</th>
                                        <th>Director/a Casting</th>
                                        <th>Progresión</th>
                                        <th>Resultado</th>
                                        <th style={{ textAlign: 'right' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(c => (
                                        <tr key={c.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{c.proyecto}</div>
                                                {c.productora && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.productora}</div>}
                                            </td>
                                            <td>{c.personaje}</td>
                                            <td><BadgeTipoProyecto tipo={c.tipo_proyecto} /></td>
                                            <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.fecha_casting)}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{c.director_casting || '—'}</td>
                                            <td>
                                                <CastingMilestones casting={c} />
                                            </td>
                                            <td>
                                                <EstadoBadgeInline
                                                    casting={c}
                                                    onUpdate={handleEstadoUpdate}
                                                />
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                    {c.enlace_self_tape && (
                                                        <a href={c.enlace_self_tape} target="_blank" rel="noopener" className="btn btn-icon btn-ghost" title="Ver self tape">
                                                            <ExternalLink size={13} />
                                                        </a>
                                                    )}
                                                    {c.estado === 'seleccionado' && (
                                                        <button
                                                            className="btn btn-sm"
                                                            style={{ fontSize: '11px', background: 'var(--success-dim)', color: 'var(--success)', borderColor: 'rgba(52,211,153,0.3)' }}
                                                            onClick={() => handleConvertToProject(c)}
                                                            disabled={converting === c.id}
                                                            title="Convertir en Proyecto"
                                                        >
                                                            <Clapperboard size={11} />
                                                            {converting === c.id ? '…' : 'Proyecto'}
                                                        </button>
                                                    )}
                                                    <button className="btn btn-icon btn-ghost" onClick={() => openEdit(c)} title="Editar todo">
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-ghost"
                                                        style={{ color: 'var(--danger)' }}
                                                        onClick={() => setDeleteConfirm(c.id)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats row */}
                {!loading && data.length > 0 && (
                    <div className="stat-grid" style={{ marginTop: '16px', gridTemplateColumns: 'repeat(5, 1fr)' }}>
                        {[
                            { val: '', label: 'Total', color: 'var(--text-secondary)', count: data.length },
                            { val: 'opcionado', label: 'Opcionados', color: '#a78bfa', count: data.filter(c => c.fue_opcionado).length },
                            { val: 'callback', label: 'Con Callback', color: 'var(--warning)', count: data.filter(c => c.tuvo_callback).length },
                            { val: 'seleccionado', label: 'Seleccionados', color: 'var(--success)', count: data.filter(c => c.estado === 'seleccionado').length },
                            { val: 'descartado', label: 'Descartados', color: 'var(--danger)', count: data.filter(c => c.estado === 'descartado').length },
                        ].map(({ val, label, color, count }) => (
                            <div
                                key={val}
                                className="stat-card"
                                style={{ padding: '14px 16px', cursor: 'pointer', borderColor: estadoFilter === val ? color : undefined }}
                                onClick={() => setEstadoFilter(estadoFilter === val ? '' : val)}
                                title={`Filtrar por ${label}`}
                            >
                                <div className="stat-label" style={{ marginBottom: '6px', color }}>{label}</div>
                                <div className="stat-value" style={{ fontSize: '24px' }}>{count}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CastingFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditing(null) }}
                onSave={handleSave}
                initial={editing}
            />

            {/* Delete confirmation */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirmar eliminación</h3>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)' }}>¿Seguro que quieres eliminar este casting? Esta acción no se puede deshacer.</p>
                        </div>
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
