'use client'
import { useState, useMemo } from 'react'
import { useProyectos, useFinanzas } from '@/hooks/useData'
import ProyectoFormModal from '@/components/ProyectoFormModal'
import { BadgeTipoProyecto, formatDate, formatCurrency, LoadingSkeleton, EmptyState } from '@/components/ui'
import { Proyecto } from '@/lib/supabase'
import { Clapperboard, Plus, Search, Pencil, Trash2, Calendar, Euro, BadgeCheck } from 'lucide-react'

const ROL_LABELS: Record<string, string> = {
    ocp: 'OCP — Principal',
    secundario: 'Secundario',
    fe: 'FE — Featuring Extra',
}
const ROL_COLORS: Record<string, string> = {
    ocp: '#7c6af7',
    secundario: '#60a5fa',
    fe: '#34d399',
}

const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

function calcTotales(p: Proyecto) {
    if (p.tipo_proyecto === 'doblaje') {
        const bruto = p.tarifa_jornada ?? 0
        const neto = p.tarifa_neta_jornada ?? 0
        return { nomBase: bruto, nomFitting: 0, nomTravel: 0, nomHorasExtra: 0, totalNomina: bruto, derechosNeto: neto, total: bruto }
    }
    if (p.tipo_proyecto === 'evento') {
        const jornadas = p.num_jornadas ?? 1
        const tarifaNeta = p.tarifa_neta_jornada ?? 0
        const tarifaBruta = p.tarifa_jornada ?? 0
        const tarifa = tarifaNeta > 0 ? tarifaNeta : tarifaBruta
        const traslado = p.tarifa_traslado ?? 0
        const tarifaHora = tarifaBruta > 0 ? tarifaBruta / 8 : tarifaNeta / 8
        const horasExtra = (p.horas_extra_evento ?? 0) * tarifaHora
        const totalNomina = tarifa * jornadas + traslado + horasExtra
        return { nomBase: tarifa * jornadas, nomFitting: 0, nomTravel: traslado, nomHorasExtra: horasExtra, totalNomina, derechosNeto: 0, total: totalNomina }
    }
    const tarifa = p.tarifa_jornada ?? 0
    const jornadas = p.num_jornadas ?? 0
    const tarifaHora = p.tarifa_hora_extra ?? (tarifa / 8)
    const horasFitting = p.horas_fitting_extra ?? 0
    const travelDays = p.num_travel_days ?? 0
    const horasExtra = p.horas_extra_convenio ?? 0
    const derechos = p.derechos_imagen ?? 0
    const comision = p.comision_pct ?? 0

    const nomBase = tarifa * jornadas
    const nomFitting = tarifaHora * horasFitting
    const nomTravel = tarifa * 0.5 * travelDays
    const nomHorasExtra = tarifaHora * horasExtra
    const totalNomina = nomBase + nomFitting + nomTravel + nomHorasExtra
    const derechosNeto = derechos * (1 - comision / 100)
    return { nomBase, nomFitting, nomTravel, nomHorasExtra, totalNomina, derechosNeto, total: totalNomina + derechosNeto }
}

export default function ProyectosPage() {
    const { data, loading, create, update, remove } = useProyectos()
    const { create: createFinanza, data: finanzas, update: updateFinanza, remove: removeFinanza } = useFinanzas()
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Proyecto | null>(null)
    const [search, setSearch] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const filtered = useMemo(() =>
        data.filter(p => {
            const q = search.toLowerCase()
            return !q || p.proyecto.toLowerCase().includes(q)
                || (p.personaje?.toLowerCase().includes(q) ?? false)
                || (p.productora?.toLowerCase().includes(q) ?? false)
                || (p.director?.toLowerCase().includes(q) ?? false)
        }), [data, search])

    const handleSave = async (form: Omit<Proyecto, 'id' | 'created_at'>, forceFinanzas: boolean = false) => {
        let savedId: string

        if (editing) {
            await update(editing.id, form)
            savedId = editing.id
        } else {
            // create returns void — refetch and get the last created id
            await create(form)
            // we'll link finanzas via proyecto nombre since we don't have the id yet
            savedId = ''
        }

        // ── Sincronizar con Finanzas ────────────────────────────────────────
        const nombreProyecto = form.proyecto
        const totales = calcTotales(form as Proyecto)
        const today = new Date().toISOString().split('T')[0]
        const fechaBase = form.fecha_inicio ?? today

        // Fecha límite de cobro: la configurada en el formulario o 90 días por defecto
        const fechaLimite = form.fecha_limite_cobro || (() => {
            const d = new Date(fechaBase + 'T12:00:00')
            d.setDate(d.getDate() + 90)
            return d.toISOString().split('T')[0]
        })()

        // Nota detallada de la nómina
        const notaNomina = [
            form.rol ? `Rol: ${ROL_LABELS[form.rol] ?? form.rol}` : null,
            (form.num_jornadas ?? 0) > 0 && (form.tarifa_jornada ?? 0) > 0
                ? `${form.num_jornadas} jornada${(form.num_jornadas ?? 1) !== 1 ? 's' : ''} × ${fmt(form.tarifa_jornada ?? 0)}` : null,
            (form.horas_fitting_extra ?? 0) > 0
                ? `Fitting extra: ${form.horas_fitting_extra}h` : null,
            (form.num_travel_days ?? 0) > 0
                ? `Travel days: ${form.num_travel_days} × 50%` : null,
            (form.horas_extra_convenio ?? 0) > 0
                ? `Horas extra convenio: ${form.horas_extra_convenio}h` : null,
        ].filter(Boolean).join(' · ')

        const buildNomina = (proyectoId: string | null) => ({
            proyecto_id: proyectoId,
            proyecto_nombre: nombreProyecto,
            tipo_ingreso: 'nomina' as const,
            cantidad: totales.totalNomina,
            fecha_factura: fechaBase,
            fecha_limite_cobro: fechaLimite,
            fecha_pago: null,
            estado_pago: 'pendiente' as const,
            comision_representante: null,
            impuestos_estimados: null,
            notas: notaNomina || null,
        })

        const buildDerechos = (proyectoId: string | null) => ({
            proyecto_id: proyectoId,
            proyecto_nombre: nombreProyecto,
            tipo_ingreso: 'derechos_imagen' as const,
            cantidad: totales.derechosNeto,
            fecha_factura: fechaBase,
            fecha_limite_cobro: fechaLimite,
            fecha_pago: null,
            estado_pago: 'pendiente' as const,
            comision_representante: form.comision_pct,
            impuestos_estimados: null,
            notas: form.facturado_via ? `Facturado vía: ${form.facturado_via}` : null,
        })

        if (editing) {
            const existingNomina = finanzas.find(f => f.proyecto_nombre === nombreProyecto && f.tipo_ingreso === 'nomina')
            const existingDerechos = finanzas.find(f => f.proyecto_nombre === nombreProyecto && f.tipo_ingreso === 'derechos_imagen')

            if (totales.totalNomina > 0 || forceFinanzas) {
                if (existingNomina) await updateFinanza(existingNomina.id, buildNomina(editing.id))
                else await createFinanza(buildNomina(editing.id))
            }
            if (totales.derechosNeto > 0) {
                if (existingDerechos) await updateFinanza(existingDerechos.id, buildDerechos(editing.id))
                else await createFinanza(buildDerechos(editing.id))
            }
        } else {
            if (totales.totalNomina > 0 || forceFinanzas) await createFinanza(buildNomina(null))
            if (totales.derechosNeto > 0) await createFinanza(buildDerechos(null))
        }
    }

    const openEdit = (p: Proyecto) => { setEditing(p); setModalOpen(true) }
    const openNew = () => { setEditing(null); setModalOpen(true) }

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>Proyectos</h2>
                        <p>{data.length} proyectos conseguidos en total</p>
                    </div>
                    <button className="btn btn-primary" onClick={openNew}>
                        <Plus size={14} /> Nuevo Proyecto
                    </button>
                </div>
            </div>

            <div className="page-body">
                <div className="action-row">
                    <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                        <Search size={14} color="var(--text-secondary)" />
                        <input
                            placeholder="Buscar proyectos..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? <LoadingSkeleton rows={4} /> : filtered.length === 0 ? (
                    <EmptyState
                        icon={<Clapperboard size={48} />}
                        title="No hay proyectos"
                        description="Los proyectos se crean cuando ganas un casting, o puedes añadirlos manualmente."
                        action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} />Nuevo Proyecto</button>}
                    />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {filtered.map(p => {
                            const { totalNomina, derechosNeto, total } = calcTotales(p)
                            const hasEconomia = totalNomina > 0 || derechosNeto > 0

                            return (
                                <div key={p.id} className="card" style={{ position: 'relative' }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <BadgeTipoProyecto tipo={p.tipo_proyecto} />
                                            {p.rol && (
                                                <span style={{
                                                    fontSize: '10px', fontWeight: 700, padding: '2px 7px',
                                                    borderRadius: '99px', background: `${ROL_COLORS[p.rol]}18`,
                                                    color: ROL_COLORS[p.rol], border: `1px solid ${ROL_COLORS[p.rol]}30`,
                                                    letterSpacing: '0.3px'
                                                }}>
                                                    {p.rol.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(p)} title="Editar">
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                className="btn btn-icon btn-ghost"
                                                style={{ color: 'var(--danger)' }}
                                                onClick={() => setDeleteConfirm(p.id)}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                                        {p.proyecto}
                                    </h3>
                                    <p style={{ color: 'var(--accent-light)', fontSize: '13px', fontWeight: 500, marginBottom: '10px' }}>
                                        {p.personaje}
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {p.empresa && (
                                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                <span style={{ opacity: 0.6 }}>Empresa:</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{p.empresa}</span>
                                            </div>
                                        )}
                                        {p.estudio_doblaje && (
                                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                <span style={{ opacity: 0.6 }}>Estudio:</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{p.estudio_doblaje}</span>
                                            </div>
                                        )}
                                        {p.num_takes != null && p.tipo_proyecto === 'doblaje' && (
                                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                <span style={{ opacity: 0.6 }}>Takes:</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{p.num_takes}</span>
                                            </div>
                                        )}
                                        {p.productora && (
                                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                <span style={{ opacity: 0.6 }}>Productora:</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{p.productora}</span>
                                            </div>
                                        )}
                                        {p.director && (
                                            <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                <span style={{ opacity: 0.6 }}>Director/a:</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{p.director}</span>
                                            </div>
                                        )}
                                        {(p.fecha_inicio || p.fecha_fin) && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                <Calendar size={11} />
                                                {formatDate(p.fecha_inicio)}
                                                {p.fecha_inicio && p.fecha_fin && ' → '}
                                                {formatDate(p.fecha_fin)}
                                            </div>
                                        )}
                                        {p.fecha_rodaje && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                                                <span style={{ opacity: 0.6 }}>Rodaje:</span>
                                                <span>{p.fecha_rodaje}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Resumen económico ────────────────────── */}
                                    {hasEconomia && (
                                        <div style={{
                                            marginTop: '14px', padding: '10px 12px',
                                            background: p.tipo_proyecto === 'evento' ? 'rgba(245,158,11,0.06)' : 'rgba(52,211,153,0.06)',
                                            border: `1px solid ${p.tipo_proyecto === 'evento' ? 'rgba(245,158,11,0.18)' : 'rgba(52,211,153,0.15)'}`,
                                            borderRadius: '8px',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                                                <Euro size={10} color={p.tipo_proyecto === 'evento' ? '#f59e0b' : 'var(--success)'} />
                                                <span style={{ fontSize: '10px', fontWeight: 700, color: p.tipo_proyecto === 'evento' ? '#f59e0b' : 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    Ingresos estimados
                                                </span>
                                            </div>
                                            {totalNomina > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                                    <span>{p.tipo_proyecto === 'evento' ? 'Jornadas + extras' : `Nómina (${p.num_jornadas ?? 1} jornada${(p.num_jornadas ?? 1) !== 1 ? 's' : ''})`}</span>
                                                    <span>{fmt(totalNomina)}</span>
                                                </div>
                                            )}
                                            {derechosNeto > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                                    <span>Derechos neto (−{p.comision_pct ?? 0}%)</span>
                                                    <span>{fmt(derechosNeto)}</span>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: p.tipo_proyecto === 'evento' ? '#f59e0b' : 'var(--success)', borderTop: `1px solid ${p.tipo_proyecto === 'evento' ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)'}`, marginTop: '6px', paddingTop: '6px' }}>
                                                <span>Total estimado</span>
                                                <span>{fmt(total)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {p.notas && (
                                        <p style={{
                                            marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)',
                                            borderTop: '1px solid var(--border)', paddingTop: '10px',
                                            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical'
                                        }}>
                                            {p.notas}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <ProyectoFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditing(null) }}
                onSave={handleSave}
                initial={editing}
            />

            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Confirmar eliminación</h3></div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)' }}>¿Seguro que quieres eliminar este proyecto?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={async () => {
                                const p = data.find(p => p.id === deleteConfirm)
                                const relatedFinanzas = finanzas.filter(f => f.proyecto_id === deleteConfirm || (p && f.proyecto_nombre === p.proyecto))
                                for (const f of relatedFinanzas) await removeFinanza(f.id)
                                await remove(deleteConfirm)
                                setDeleteConfirm(null)
                            }}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
