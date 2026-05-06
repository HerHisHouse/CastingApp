'use client'
import { useState, useMemo } from 'react'
import { useFinanzas } from '@/hooks/useData'
import FinanzaFormModal from '@/components/FinanzaFormModal'
import { formatDate, formatCurrency, LoadingSkeleton, EmptyState } from '@/components/ui'
import { Finanza, EstadoPago, TipoIngreso } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { DollarSign, Plus, Search, Pencil, Trash2, TrendingUp, Clock, CheckCircle, Eye, EyeOff, Download, ChevronDown, FileText } from 'lucide-react'

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
    const [showAmounts, setShowAmounts] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('finanzas_show_amounts') !== 'false'
        }
        return true
    })
    const [showExportMenu, setShowExportMenu] = useState(false)
    const { username } = useAuth()

    const filtered = useMemo(() =>
        data.filter(f => {
            const q = search.toLowerCase()
            const matchSearch = !q || f.proyecto_nombre.toLowerCase().includes(q)
            const matchEstado = !estadoFilter || f.estado_pago === estadoFilter
            return matchSearch && matchEstado
        }), [data, search, estadoFilter])

    const totals = useMemo(() => {
        const total = data.reduce((s, f) => {
            const extras = (f.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0)
            return s + f.cantidad + extras
        }, 0)
        
        const cobrado = data.filter(f => f.estado_pago === 'pagado').reduce((s, f) => {
            const extras = (f.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0)
            return s + f.cantidad + extras
        }, 0)
        
        const pendiente = data.filter(f => f.estado_pago !== 'pagado').reduce((s, f) => {
            const extras = (f.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0)
            return s + f.cantidad + extras
        }, 0)
        
        const netoCobrado = data.filter(f => f.estado_pago === 'pagado').reduce((s, f) => {
            if (f.importe_neto != null) return s + f.importe_neto
            
            const base = f.cantidad
            const extras = (f.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0)
            const brutoTotal = base + extras
            
            const comisionImporte = base * ((f.comision_representante || 0) / 100)
            const impuestosImporte = brutoTotal * ((f.impuestos_estimados || 0) / 100)
            
            let otrosImporte = 0
            if (f.otros_impuestos) {
                f.otros_impuestos.forEach(imp => {
                    if (imp.tipo === 'porcentaje') {
                        otrosImporte += brutoTotal * (imp.valor / 100)
                    } else {
                        otrosImporte += (imp.valor || 0)
                    }
                })
            }
            return s + brutoTotal - comisionImporte - impuestosImporte - otrosImporte
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

    const toggleAmounts = () => {
        const newValue = !showAmounts
        setShowAmounts(newValue)
        localStorage.setItem('finanzas_show_amounts', String(newValue))
    }

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
        const base = finanza.cantidad
    const totalExtras = (finanza.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0)
    const brutoTotal = base + totalExtras
    
    const comisionImporte = base * ((finanza.comision_representante || 0) / 100)
    const impuestosImporte = brutoTotal * ((finanza.impuestos_estimados || 0) / 100)
    
    let otrosImporte = 0
    if (finanza.otros_impuestos) {
        finanza.otros_impuestos.forEach(imp => {
            if (imp.tipo === 'porcentaje') {
                otrosImporte += brutoTotal * (imp.valor / 100)
            } else {
                otrosImporte += (imp.valor || 0)
            }
        })
    }
    
    const netoCalculado = brutoTotal - comisionImporte - impuestosImporte - otrosImporte
    const neto = finanza.importe_neto != null ? finanza.importe_neto : netoCalculado

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
                <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--success)', marginTop: '4px' }}>{formatCurrency(brutoTotal)}</div>
                {totalExtras > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Base: {formatCurrency(base)} + Extras: {formatCurrency(totalExtras)}
                    </div>
                )}
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
                    {totalExtras > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '4px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 600 }}>PAGOS EXTRA:</span>
                            {(finanza.pagos_extra || []).map((p, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{p.concepto}:</span>
                                    <span style={{ color: 'var(--success)' }}>+{formatCurrency(p.cantidad)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Comisión:</span>
                        <span style={{ color: 'var(--danger)' }}>{finanza.comision_representante ? `${finanza.comision_representante}% (${formatCurrency(comisionImporte)})` : '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Impuestos:</span>
                        <span style={{ color: 'var(--warning)' }}>{finanza.impuestos_estimados ? `${finanza.impuestos_estimados}% (${formatCurrency(impuestosImporte)})` : '—'}</span>
                    </div>
                    {(finanza.otros_impuestos || []).map((imp, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{imp.nombre || 'Deducción'}:</span>
                            <span style={{ color: 'var(--danger)' }}>
                                −{formatCurrency(imp.tipo === 'porcentaje' ? brutoTotal * (imp.valor / 100) : imp.valor)}
                            </span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Neto{finanza.importe_neto != null ? ' (Manual)' : ''}:</span>
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


    const calcNeto = (f: Finanza) => {
        if (f.importe_neto != null) return f.importe_neto
        const base = f.cantidad
        const extras = (f.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0)
        const brutoTotal = base + extras
        const comisionImporte = base * ((f.comision_representante || 0) / 100)
        const impuestosImporte = brutoTotal * ((f.impuestos_estimados || 0) / 100)
        let otrosImporte = 0
        if (f.otros_impuestos) f.otros_impuestos.forEach(imp => { otrosImporte += imp.tipo === 'porcentaje' ? brutoTotal * (imp.valor / 100) : (imp.valor || 0) })
        return brutoTotal - comisionImporte - impuestosImporte - otrosImporte
    }

    const exportCSV = () => {
        const tipoLabel: Record<string, string> = { nomina: 'Nómina', derechos_imagen: 'Derechos', buyout: 'Buyout', royalties: 'Royalties', callback: 'Callback' }
        const headers = ['Proyecto','Tipo','Cantidad','Comisión %','Impuestos %','Neto','Fecha Factura','Fecha Límite','Fecha Pago','Estado']
        const rows = filtered.map(f => [
            f.proyecto_nombre, tipoLabel[f.tipo_ingreso] || f.tipo_ingreso,
            f.cantidad.toFixed(2), f.comision_representante || 0, f.impuestos_estimados || 0,
            calcNeto(f).toFixed(2), f.fecha_factura || '', f.fecha_limite_cobro || '', f.fecha_pago || '', f.estado_pago
        ])
        const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `cache-finanzas-${new Date().toISOString().split('T')[0]}.csv`
        a.click(); URL.revokeObjectURL(url)
    }

    const exportPDF = async () => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
        const now = new Date()
        const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
        const filterLabel = estadoFilter ? estadoFilter.charAt(0).toUpperCase() + estadoFilter.slice(1) : 'Todos'
        doc.setFillColor(18, 16, 30); doc.rect(0, 0, 297, 25, 'F')
        doc.setFontSize(18); doc.setTextColor(167, 139, 250); doc.text('Caché', 14, 16)
        doc.setFontSize(9); doc.setTextColor(150, 150, 180); doc.text('Gestiona tu carrera artística', 14, 22)
        doc.setFontSize(10); doc.setTextColor(200, 200, 220)
        doc.text(`${username || 'Usuario'} — Exportado el ${dateStr}`, 297 - 14, 16, { align: 'right' })
        doc.text(`Filtro: ${filterLabel}`, 297 - 14, 22, { align: 'right' })
        doc.setFontSize(8); doc.setTextColor(100, 100, 130)
        doc.text(`Total: ${formatCurrency(totals.total)}   Cobrado: ${formatCurrency(totals.cobrado)}   Pendiente: ${formatCurrency(totals.pendiente)}   Neto: ${formatCurrency(totals.netoCobrado)}`, 14, 32)
        const tipoLabel: Record<string, string> = { nomina: 'Nómina', derechos_imagen: 'Derechos', buyout: 'Buyout', royalties: 'Royalties', callback: 'Callback' }
        const tableRows = filtered.map(f => [
            f.proyecto_nombre, tipoLabel[f.tipo_ingreso] || f.tipo_ingreso,
            `${f.cantidad.toFixed(2)} €`, f.comision_representante ? `${f.comision_representante}%` : '—',
            f.impuestos_estimados ? `${f.impuestos_estimados}%` : '—',
            `${calcNeto(f).toFixed(2)} €`, f.fecha_factura || '—', f.fecha_limite_cobro || '—', f.fecha_pago || '—', f.estado_pago
        ])
        autoTable(doc, {
            startY: 37,
            head: [['Proyecto','Tipo','Cantidad','Comisión','IRPF','Neto','F. Factura','F. Límite','F. Pago','Estado']],
            body: tableRows,
            styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [220, 220, 240] as [number,number,number] },
            headStyles: { fillColor: [30, 27, 60] as [number,number,number], textColor: [167, 139, 250] as [number,number,number], fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [20, 18, 35] as [number,number,number] },
            margin: { left: 14, right: 14 },
        })
        const pageCount = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i); doc.setFontSize(7); doc.setTextColor(80, 80, 110)
            doc.text('Caché — Gestiona tu carrera artística', 14, doc.internal.pageSize.height - 6)
            doc.text(`Página ${i} de ${pageCount}`, 297 - 14, doc.internal.pageSize.height - 6, { align: 'right' })
        }
        doc.save(`cache-finanzas-${now.toISOString().split('T')[0]}.pdf`)
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Finanzas</h2>
                    <p style={{ margin: 0 }}>Gestión de ingresos y pagos</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px', margin: '0 auto' }}>
                    <button className="btn btn-primary" onClick={openNew} style={{ width: '100%', justifyContent: 'center' }}>
                        <Plus size={14} /> Nuevo Ingreso
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={toggleAmounts} style={{ width: '100%', justifyContent: 'center' }}>
                            {showAmounts ? <EyeOff size={14} /> : <Eye size={14} />}
                            <span>{showAmounts ? 'Ocultar' : 'Mostrar'}</span>
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button className="btn btn-secondary" onClick={() => setShowExportMenu(v => !v)} style={{ width: '100%', justifyContent: 'center' }}>
                                <Download size={14} />
                                <span>Exportar</span>
                                <ChevronDown size={12} />
                            </button>
                            {showExportMenu && (
                                <div style={{
                                    position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
                                    background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                                    borderRadius: '10px', padding: '6px', minWidth: '160px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    animation: 'scaleUp 0.1s ease-out',
                                }}>
                                    <button onClick={() => { exportCSV(); setShowExportMenu(false) }} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        width: '100%', padding: '9px 12px', borderRadius: '7px',
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', textAlign: 'left',
                                    }}>
                                        <Download size={14} color="var(--accent-light)" /> Exportar CSV
                                    </button>
                                    <button onClick={() => { exportPDF(); setShowExportMenu(false) }} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        width: '100%', padding: '9px 12px', borderRadius: '7px',
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', textAlign: 'left',
                                    }}>
                                        <FileText size={14} color="var(--danger)" /> Exportar PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Summary cards */}
                <div className="stat-grid mb-6">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(124,106,247,0.12)' }}>
                            <DollarSign size={18} color="#9d8fff" />
                        </div>
                        <div className="stat-value">{showAmounts ? formatCurrency(totals.total) : '••••'}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Total Facturado</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(52,211,153,0.12)' }}>
                            <CheckCircle size={18} color="#34d399" />
                        </div>
                        <div className="stat-value">{showAmounts ? formatCurrency(totals.cobrado) : '••••'}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Cobrado</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.12)' }}>
                            <Clock size={18} color="#fbbf24" />
                        </div>
                        <div className="stat-value">{showAmounts ? formatCurrency(totals.pendiente) : '••••'}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Pendiente</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(96,165,250,0.12)' }}>
                            <TrendingUp size={18} color="#60a5fa" />
                        </div>
                        <div className="stat-value">{showAmounts ? formatCurrency(totals.netoCobrado) : '••••'}</div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Neto Real</div>
                        <div className="stat-sublabel desktop-only">Tras comisiones e impuestos</div>
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
                                            const bruto = f.cantidad
                                            const comisionImporte = bruto * ((f.comision_representante || 0) / 100)
                                            const impuestosImporte = bruto * ((f.impuestos_estimados || 0) / 100)
                                            
                                            let otrosImporte = 0
                                            if (f.otros_impuestos) {
                                                f.otros_impuestos.forEach(imp => {
                                                    if (imp.tipo === 'porcentaje') {
                                                        otrosImporte += bruto * (imp.valor / 100)
                                                    } else {
                                                        otrosImporte += (imp.valor || 0)
                                                    }
                                                })
                                            }
                                            
                                            const netoCalculado = bruto - comisionImporte - impuestosImporte - otrosImporte
                                            const neto = f.importe_neto != null ? f.importe_neto : netoCalculado
                                            
                                            return (
                                                <tr key={f.id}>
                                                    <td><div style={{ fontWeight: 600 }}>{f.proyecto_nombre}</div></td>
                                                    <td><BadgeTipoIngreso tipo={f.tipo_ingreso} /></td>
                                                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                                                        {formatCurrency(f.cantidad + (f.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0))}
                                                        {(f.pagos_extra || []).length > 0 && (
                                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', fontWeight: 400 }}>
                                                                Base: {formatCurrency(f.cantidad)} + {formatCurrency((f.pagos_extra || []).reduce((sum, p) => sum + (p.cantidad || 0), 0))} extras
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ color: 'var(--danger)' }}>{f.comision_representante ? `${f.comision_representante.toString().replace('.', ',')}%` : '—'}</td>
                                                    <td style={{ color: 'var(--warning)' }}>{f.impuestos_estimados ? `${f.impuestos_estimados.toString().replace('.', ',')}%` : '—'}</td>
                                                    <td style={{ fontWeight: 600 }}>
                                                        {formatCurrency(neto)}
                                                        {f.importe_neto != null && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', fontWeight: 400 }}>(Manual)</span>}
                                                    </td>
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
