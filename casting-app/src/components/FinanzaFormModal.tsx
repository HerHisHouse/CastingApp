'use client'
import { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/Modal'
import { Finanza, TipoIngreso, EstadoPago } from '@/lib/supabase'
import { Save, Euro, Info } from 'lucide-react'

type FinanzaForm = Omit<Finanza, 'id' | 'created_at'>

// Calcula fecha + 90 días en formato YYYY-MM-DD
function add90Days(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() + 90)
    return d.toISOString().split('T')[0]
}

const defaultForm: FinanzaForm = {
    proyecto_id: null,
    proyecto_nombre: '',
    tipo_ingreso: 'nomina',
    cantidad: null as unknown as number,   // null → campo vacío
    fecha_factura: new Date().toISOString().split('T')[0],
    fecha_limite_cobro: add90Days(new Date().toISOString().split('T')[0]),
    fecha_pago: null,
    estado_pago: 'pendiente',
    comision_representante: null,
    impuestos_estimados: null,
    notas: null,
}

const tiposIngreso: [TipoIngreso, string][] = [
    ['nomina', 'Nómina'],
    ['derechos_imagen', 'Derechos de Imagen'],
    ['callback', 'Callback'],
    ['buyout', 'Buyout'],
    ['royalties', 'Royalties'],
]
const estadosPago: [EstadoPago, string][] = [
    ['pendiente', 'Pendiente'],
    ['parcial', 'Pago Parcial'],
    ['pagado', 'Pagado'],
]

const fmt = (n: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

interface Props {
    open: boolean
    onClose: () => void
    onSave: (data: FinanzaForm) => Promise<void>
    initial?: Finanza | null
}

export default function FinanzaFormModal({ open, onClose, onSave, initial }: Props) {
    const [form, setForm] = useState<FinanzaForm>(initial ? { ...initial } : defaultForm)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Re-sync on open/initial change
    useEffect(() => {
        setForm(initial ? { ...initial } : defaultForm)
        setError(null)
    }, [initial, open])

    const set = <K extends keyof FinanzaForm>(key: K, val: FinanzaForm[K]) =>
        setForm(prev => ({ ...prev, [key]: val }))

    // Cuando cambia fecha_factura → actualizar fecha_limite_cobro automáticamente
    const handleFechaFactura = (val: string) => {
        setForm(prev => ({
            ...prev,
            fecha_factura: val,
            fecha_limite_cobro: val ? add90Days(val) : null,
        }))
    }

    // Cálculos en tiempo real
    const bruto = form.cantidad ?? 0
    const eco = useMemo(() => {
        const comisionPct = form.comision_representante ?? 0
        const impuestosPct = form.impuestos_estimados ?? 0
        const comisionImporte = bruto * (comisionPct / 100)
        const impuestosImporte = bruto * (impuestosPct / 100)
        const neto = bruto - comisionImporte - impuestosImporte
        return { comisionImporte, impuestosImporte, neto }
    }, [bruto, form.comision_representante, form.impuestos_estimados])

    const hasCalc = bruto > 0 && ((form.comision_representante ?? 0) > 0 || (form.impuestos_estimados ?? 0) > 0)

    const handleSave = async () => {
        if (!form.proyecto_nombre) { setError('El nombre del proyecto es obligatorio.'); return }
        if (!form.cantidad || form.cantidad <= 0) { setError('La cantidad debe ser mayor que 0.'); return }
        setSaving(true); setError(null)
        try {
            // Guardar los porcentajes tal cual — el consumidor los interpreta como %
            await onSave(form)
            onClose()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error al guardar')
        } finally { setSaving(false) }
    }

    const handleClose = () => {
        setForm(initial ? { ...initial } : defaultForm)
        setError(null); onClose()
    }

    return (
        <Modal
            open={open} onClose={handleClose}
            title={initial ? 'Editar Ingreso' : 'Nuevo Ingreso'}
            maxWidth={600}
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
            {/* Proyecto + Tipo */}
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">Proyecto *</label>
                    <input
                        className="form-input"
                        value={form.proyecto_nombre}
                        onChange={e => set('proyecto_nombre', e.target.value)}
                        placeholder="Nombre del proyecto"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Tipo de Ingreso</label>
                    <select
                        className="form-select"
                        value={form.tipo_ingreso}
                        onChange={e => set('tipo_ingreso', e.target.value as TipoIngreso)}
                    >
                        {tiposIngreso.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
            </div>

            {/* Cantidad bruta */}
            <div className="form-group">
                <label className="form-label">Cantidad bruta *</label>
                <div style={{ position: 'relative' }}>
                    <span style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)', fontSize: '14px', pointerEvents: 'none',
                    }}>€</span>
                    <input
                        type="number"
                        className="form-input"
                        style={{ paddingLeft: '28px', fontSize: '18px', fontWeight: 600 }}
                        value={form.cantidad ?? ''}
                        onChange={e => set('cantidad', e.target.value === '' ? (null as unknown as number) : parseFloat(e.target.value))}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Descuentos en % */}
            <div className="form-grid">
                <div className="form-group">
                    <label className="form-label">
                        Comisión Agencia / Representante
                        <span style={{ marginLeft: '5px', fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>% sobre bruto</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            className="form-input"
                            style={{ paddingRight: '32px' }}
                            value={form.comision_representante ?? ''}
                            onChange={e => set('comision_representante', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.5"
                        />
                        <span style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none',
                        }}>%</span>
                    </div>
                    {(form.comision_representante ?? 0) > 0 && bruto > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '3px' }}>
                            − {fmt(eco.comisionImporte)}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">
                        Impuestos Estimados (IRPF)
                        <span style={{ marginLeft: '5px', fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>% sobre bruto</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            className="form-input"
                            style={{ paddingRight: '32px' }}
                            value={form.impuestos_estimados ?? ''}
                            onChange={e => set('impuestos_estimados', e.target.value === '' ? null : parseFloat(e.target.value))}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.5"
                        />
                        <span style={{
                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)', fontSize: '13px', pointerEvents: 'none',
                        }}>%</span>
                    </div>
                    {(form.impuestos_estimados ?? 0) > 0 && bruto > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '3px' }}>
                            − {fmt(eco.impuestosImporte)}
                        </div>
                    )}
                </div>
            </div>

            {/* Resumen neto */}
            {hasCalc && (
                <div style={{
                    padding: '12px 14px', borderRadius: '8px',
                    background: 'rgba(52,211,153,0.06)',
                    border: '1px solid rgba(52,211,153,0.18)',
                    marginBottom: '4px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Bruto</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{fmt(bruto)}</span>
                    </div>
                    {(form.comision_representante ?? 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comisión {form.comision_representante}%</span>
                            <span style={{ fontSize: '13px', color: 'var(--danger)' }}>− {fmt(eco.comisionImporte)}</span>
                        </div>
                    )}
                    {(form.impuestos_estimados ?? 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>IRPF {form.impuestos_estimados}%</span>
                            <span style={{ fontSize: '13px', color: 'var(--danger)' }}>− {fmt(eco.impuestosImporte)}</span>
                        </div>
                    )}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderTop: '1px solid rgba(52,211,153,0.2)', paddingTop: '8px', marginTop: '4px',
                    }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>Neto estimado</span>
                        <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--success)', letterSpacing: '-0.5px' }}>{fmt(eco.neto)}</span>
                    </div>
                </div>
            )}

            {/* Fechas + Estado */}
            <div className="form-grid-3">
                <div className="form-group">
                    <label className="form-label">Fecha Factura</label>
                    <input
                        type="date"
                        className="form-input"
                        value={form.fecha_factura || ''}
                        onChange={e => handleFechaFactura(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">
                        Fecha Límite de Cobro
                        <span style={{ marginLeft: '5px', fontSize: '9.5px', color: 'var(--text-secondary)', opacity: 0.7 }}>+90 días</span>
                    </label>
                    <input
                        type="date"
                        className="form-input"
                        style={{ color: form.fecha_limite_cobro ? 'var(--warning)' : undefined }}
                        value={form.fecha_limite_cobro || ''}
                        onChange={e => set('fecha_limite_cobro', e.target.value || null)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Estado de Pago</label>
                    <select
                        className="form-select"
                        value={form.estado_pago}
                        onChange={e => set('estado_pago', e.target.value as EstadoPago)}
                    >
                        {estadosPago.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
            </div>

            {/* Fecha real de pago — solo si pagado */}
            {form.estado_pago !== 'pendiente' && (
                <div className="form-group">
                    <label className="form-label">Fecha de Pago Real</label>
                    <input
                        type="date"
                        className="form-input"
                        value={form.fecha_pago || ''}
                        onChange={e => set('fecha_pago', e.target.value || null)}
                    />
                </div>
            )}

            {/* Aviso fecha límite */}
            {form.fecha_limite_cobro && form.estado_pago === 'pendiente' && (() => {
                const limite = new Date(form.fecha_limite_cobro + 'T12:00:00')
                const hoy = new Date()
                const diasRestantes = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
                if (diasRestantes <= 30 && diasRestantes > 0) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                            <Info size={12} color="var(--danger)" />
                            <span style={{ fontSize: '11.5px', color: 'var(--danger)' }}>
                                ⚠️ Quedan <strong>{diasRestantes} días</strong> para reclamar este cobro.
                            </span>
                        </div>
                    )
                }
                if (diasRestantes <= 0) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)' }}>
                            <Info size={12} color="var(--danger)" />
                            <span style={{ fontSize: '11.5px', color: 'var(--danger)', fontWeight: 600 }}>
                                🚨 El plazo de cobro ha vencido. Reclama cuanto antes.
                            </span>
                        </div>
                    )
                }
                return null
            })()}

            <div className="form-group" style={{ marginTop: '4px' }}>
                <label className="form-label">Notas</label>
                <textarea
                    className="form-textarea"
                    value={form.notas || ''}
                    onChange={e => set('notas', e.target.value || null)}
                    placeholder="Datos adicionales, detalles del contrato, etc."
                />
            </div>
        </Modal>
    )
}
