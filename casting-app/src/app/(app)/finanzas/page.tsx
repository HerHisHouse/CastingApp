'use client'
import { useState, useMemo } from 'react'
import { useFinanzas } from '@/hooks/useData'
import FinanzaFormModal from '@/components/FinanzaFormModal'
import { formatDate, formatCurrency, LoadingSkeleton, EmptyState } from '@/components/ui'
import { Finanza, EstadoPago, TipoIngreso } from '@/lib/supabase'
import { DollarSign, Plus, Search, Pencil, Trash2, TrendingUp, Clock, CheckCircle, Eye, EyeOff } from 'lucide-react'

function BadgePago({ estado }: { estado: EstadoPago }) {
    return <span className={`badge badge-${estado}`}>
        {estado === 'pendiente' ? 'Pendiente' : estado === 'pagado' ? 'Pagado' : 'Parcial'}
    </span>
}

function BadgeTipoIngreso({ tipo }: { tipo: TipoIngreso }) {
    const labels: Record<TipoIngreso, string> = {
        nomina: 'Nómina', derechos_imagen: 'Derechos de Imagen',
        buyout: 'Buyout', royalties: 'Royalties', callback: 'Callback'
    }
    return <span className={`badge badge-${tipo}`}>{labels[tipo]}</span>
}

export default function FinanzasPage() {
    const { data, loading, create, update, remove } = useFinanzas()
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Finanza | null>(null)
    const [search, setSearch] = useState('')
    const [estadoFilter, setEstadoFilter] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const filtered = useMemo(() =>
        data.filter(f => {
            const q = search.toLowerCase()
            const matchSearch = !q || f.proyecto_nombre.toLowerCase().includes(q)
            const matchEstado = !estadoFilter || f.estado_pago === estadoFilter
            return matchSearch && matchEstado
        }), [data, search, estadoFilter])

    const totals = useMemo(() => {
        const total = data.reduce((s, f) => s + f.cantidad, 0)
        const cobrado = data.filter(f => f.estado_pago === 'pagado').reduce((s, f) => s + f.cantidad, 0)
        const pendiente = data.filter(f => f.estado_pago !== 'pagado').reduce((s, f) => s + f.cantidad, 0)
        const netoCobrado = data.filter(f => f.estado_pago === 'pagado').reduce((s, f) => {
            const comisionImporte = f.cantidad * ((f.comision_representante || 0) / 100)
            const impuestosImporte = f.cantidad * ((f.impuestos_estimados || 0) / 100)
            return s + f.cantidad - comisionImporte - impuestosImporte
        }, 0)
        return { total, cobrado, pendiente, netoCobrado }
    }, [data])

    const handleSave = async (form: Omit<Finanza, 'id' | 'created_at' | 'user_id'>) => {
        if (editing) await update(editing.id, form)
        else await create(form)
        setModalOpen(false)
        setEditing(null)
    }

    const openEdit = (f: Finanza) => { setEditing(f); setModalOpen(true) }
    const openNew = () => { setEditing(null); setModalOpen(true) }

function FinanzaMobileCard({ 
    finanza, 
    onEdit, 
    onDelete 
}: { 
    finanza: Finanza, 
    onEdit: (f: Finanza) => void, 
    onDelete: (id: string) => void 
}) {
    const [showMore, setShowMore] = useState(false)
    const comisionImporte = finanza.cantidad * ((finanza.comision_representante || 0) / 100)
    const impuestosImporte = finanza.cantidad * ((finanza.impuestos_estimados || 0) / 100)
    const neto = finanza.cantidad - comisionImporte - impuestosImporte

    return (
        <div className="card" style={{ padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <BadgeTipoIngreso tipo={finanza.tipo_ingreso} />
                    <BadgePago estado={finanza.estado_pago} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-icon btn-ghost" onClick={() => onEdit(finanza)}><Pencil size={14} /></button>
                    <button className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => onDelete(finanza.id)}><Trash2 size={14} /></button>
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{finanza.proyecto_nombre}</div>
                <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--success)', marginTop: '4px' }}>{formatCurrency(finanza.cantidad)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Fecha factura:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatDate(finanza.fecha_factura) || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Fecha límite:</span>
                    <span style={{ 
                        fontWeight: 600,
                        color: (() => {
                            if (finanza.estado_pago === 'pagado' || !finanza.fecha_limite_cobro) return 'inherit'
                            const deadline = new Date(finanza.fecha_limite_cobro + 'T23:59:59')
                            const now = new Date()
                            const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                            return diff <= 0 ? 'var(--danger)' : diff <= 7 ? 'var(--warning)' : 'var(--success)'
                        })()
                    }}>
                        {formatDate(finanza.fecha_limite_cobro) || '—'}
                    </span>
                </div>
            </div>

            {showMore && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', animation: 'fadeIn 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Comisión:</span>
                        <span style={{ color: 'var(--danger)' }}>{finanza.comision_representante ? `${finanza.comision_representante}% (${formatCurrency(comisionImporte)})` : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Impuestos:</span>
                        <span style={{ color: 'var(--warning)' }}>{finanza.impuestos_estimados ? `${finanza.impuestos_estimados}% (${formatCurrency(impuestosImporte)})` : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Neto:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(neto)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Fecha pago:</span>
                        <span style={{ color: 'var(--text-primary)' }}>{formatDate(finanza.fecha_pago) || '—'}</span>
                    </div>
                    {finanza.notas && (
                        <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            {finanza.notas}
                        </div>
                    )}
                </div>
            )}

            <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
                onClick={() => setShowMore(!showMore)}
            >
                {showMore ? <EyeOff size={14} /> : <Eye size={14} />}
                {showMore ? 'Ver menos' : 'Ver más detalles'}
            </button>
        </div>
    )
}

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2>Finanzas</h2>
                        <p>Gestión de ingresos y pagos</p>
                    </div>
                    <button className="btn btn-primary" onClick={openNew}>
                        <Plus size={14} /> Nuevo Ingreso
                    </button>
                </div>
            </div>

            <div className="page-body">
                {/* Summary cards */}
                <div className="stat-grid mb-6">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(124,106,247,0.12)' }}>
                            <DollarSign size={18} color="#9d8fff" />
                        </div>
                        <div className="stat-value">{formatCurrency(totals.total)}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Total Facturado</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.12)' }}>
                            <CheckCircle size={18} color="#34d399" />
                        </div>
                        <div className="stat-value">{formatCurrency(totals.cobrado)}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Cobrado</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.12)' }}>
                            <Clock size={18} color="#fbbf24" />
                        </div>
                        <div className="stat-value">{formatCurrency(totals.pendiente)}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Pendiente</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(96,165,250,0.12)' }}>
                            <TrendingUp size={18} color="#60a5fa" />
                        </div>
                        <div className="stat-value">{formatCurrency(totals.netoCobrado)}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Neto Real</div>
                        <div className="stat-sublabel">Tras comisiones e impuestos</div>
                    </div>
                </div>

                <div className="action-row">
                    <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                        <Search size={14} color="var(--text-secondary)" />
                        <input
                            placeholder="Buscar por proyecto..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="filter-pills">
                        {[{ val: '', label: 'Todos' }, { val: 'pendiente', label: 'Pendiente' }, { val: 'parcial', label: 'Parcial' }, { val: 'pagado', label: 'Pagado' }].map(f => (
                            <button key={f.val} className={`filter-pill ${estadoFilter === f.val ? 'active' : ''}`} onClick={() => setEstadoFilter(f.val)}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: 0, background: 'transparent', border: 'none' }}>
                    {loading ? <LoadingSkeleton rows={5} /> : filtered.length === 0 ? (
                        <EmptyState
                            icon={<DollarSign size={48} />}
                            title="No hay ingresos registrados"
                            description="Registra tus ingresos aquí para llevar un control de tus finanzas."
                            action={<button className="btn btn-primary" onClick={openNew}><Plus size={14} />Nuevo Ingreso</button>}
                        />
                    ) : (
                        <>
                            {/* Desktop View */}
                            <div className="table-wrapper desktop-only" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Proyecto</th>
                                            <th>Tipo</th>
                                            <th>Cantidad</th>
                                            <th>Comisión</th>
                                            <th>Impuestos</th>
                                            <th>Neto</th>
                                            <th>Fecha Factura</th>
                                            <th>Fecha Límite</th>
                                            <th>Fecha Pago</th>
                                            <th>Estado</th>
                                            <th style={{ textAlign: 'right' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(f => {
                                            const comisionImporte = f.cantidad * ((f.comision_representante || 0) / 100)
                                            const impuestosImporte = f.cantidad * ((f.impuestos_estimados || 0) / 100)
                                            const neto = f.cantidad - comisionImporte - impuestosImporte
                                            return (
                                                <tr key={f.id}>
                                                    <td><div style={{ fontWeight: 600 }}>{f.proyecto_nombre}</div></td>
                                                    <td><BadgeTipoIngreso tipo={f.tipo_ingreso} /></td>
                                                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(f.cantidad)}</td>
                                                    <td style={{ color: 'var(--danger)' }}>{f.comision_representante ? `${f.comision_representante.toString().replace('.', ',')}%` : '—'}</td>
                                                    <td style={{ color: 'var(--warning)' }}>{f.impuestos_estimados ? `${f.impuestos_estimados.toString().replace('.', ',')}%` : '—'}</td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(neto)}</td>
                                                    <td style={{ whiteSpace: 'nowrap', opacity: f.fecha_factura ? 1 : 0.4 }}>{formatDate(f.fecha_factura) || '—'}</td>
                                                    <td style={{ whiteSpace: 'nowrap', opacity: f.fecha_limite_cobro ? 1 : 0.4 }}>
                                                        {f.fecha_limite_cobro ? (
                                                            <span style={{
                                                                fontWeight: 600,
                                                                color: (() => {
                                                                    if (f.estado_pago === 'pagado') return 'inherit'
                                                                    const deadline = new Date(f.fecha_limite_cobro + 'T23:59:59')
                                                                    const now = new Date()
                                                                    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

                                                                    if (diffDays <= 0) return 'var(--danger)'
                                                                    if (diffDays <= 3) return '#f97316' // Naranja
                                                                    if (diffDays <= 10) return '#fbbf24' // Amarillo
                                                                    return 'var(--success)'
                                                                })()
                                                            }}>
                                                                {formatDate(f.fecha_limite_cobro)}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ whiteSpace: 'nowrap', opacity: f.fecha_pago ? 1 : 0.4 }}>{formatDate(f.fecha_pago) || '—'}</td>
                                                    <td><BadgePago estado={f.estado_pago} /></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(f)}><Pencil size={13} /></button>
                                                            <button className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(f.id)}><Trash2 size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div className="mobile-only">
                                {filtered.map(f => (
                                    <FinanzaMobileCard 
                                        key={f.id} 
                                        finanza={f} 
                                        onEdit={openEdit} 
                                        onDelete={setDeleteConfirm} 
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <FinanzaFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditing(null) }}
                onSave={handleSave}
                initial={editing}
            />

            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Confirmar eliminación</h3></div>
                        <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>¿Eliminar este ingreso?</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={async () => { await remove(deleteConfirm); setDeleteConfirm(null) }}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
