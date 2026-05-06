'use client'
import { useState, useEffect, useMemo } from 'react'
import Modal from '@/components/Modal'
import { Finanza, TipoIngreso, EstadoPago, OtroImpuesto, PagoExtra } from '@/lib/supabase'
import { Save, Info, Plus, Trash2 } from 'lucide-react'

type FinanzaForm = Omit<Finanza, 'id' | 'created_at' | 'user_id'>

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
    importe_neto: null,
    otros_impuestos: [],
    fecha_factura: new Date().toISOString().split('T')[0],
    fecha_limite_cobro: add90Days(new Date().toISOString().split('T')[0]),
    fecha_pago: null,
    estado_pago: 'pendiente',
    comision_representante: null,
    impuestos_estimados: null,
    notas: null,
    pagos_extra: [],
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
    const baseCantidad = form.cantidad ?? 0
    const eco = useMemo(() => {
        let totalExtras = 0
        if (form.pagos_extra) {
            form.pagos_extra.forEach(p => { totalExtras += (p.cantidad || 0) })
        }

        const brutoTotal = baseCantidad + totalExtras
        
        const comisionPct = form.comision_representante ?? 0
        const impuestosPct = form.impuestos_estimados ?? 0
        
        // La comisión suele ser sobre el bruto base, no sobre dietas/viajes.
        const comisionImporte = baseCantidad * (comisionPct / 100)
        // El IRPF suele ser sobre el bruto total.
        const impuestosImporte = brutoTotal * (impuestosPct / 100)
        
        let otrosImporte = 0
        if (form.otros_impuestos) {
            form.otros_impuestos.forEach(imp => {
                if (imp.tipo === 'porcentaje') {
                    otrosImporte += brutoTotal * (imp.valor / 100)
                } else {
                    otrosImporte += (imp.valor || 0)
                }
            })
        }
        
        const netoCalculado = brutoTotal - comisionImporte - impuestosImporte - otrosImporte
        const neto = form.importe_neto || netoCalculado
        
        return { totalExtras, brutoTotal, comisionImporte, impuestosImporte, otrosImporte, netoCalculado, neto }
    }, [baseCantidad, form.comision_representante, form.impuestos_estimados, form.otros_impuestos, form.importe_neto, form.pagos_extra])

    const hasCalc = (baseCantidad > 0 || eco.totalExtras > 0) && (
        (form.comision_representante ?? 0) > 0 || 
        (form.impuestos_estimados ?? 0) > 0 || 
        (form.otros_impuestos?.length ?? 0) > 0 ||
        (form.pagos_extra?.length ?? 0) > 0 ||
        form.importe_neto != null
    )

    const addOtroImpuesto = () => {
        const nuevos = [...(form.otros_impuestos || []), { nombre: '', tipo: 'porcentaje' as const, valor: 0 }]
        set('otros_impuestos', nuevos)
    }

    const removeOtroImpuesto = (index: number) => {
        const nuevos = (form.otros_impuestos || []).filter((_, i) => i !== index)
        set('otros_impuestos', nuevos)
    }

    const updateOtroImpuesto = (index: number, field: keyof OtroImpuesto, value: any) => {
        const nuevos = [...(form.otros_impuestos || [])]
        nuevos[index] = { ...nuevos[index], [field]: value }
        set('otros_impuestos', nuevos)
    }

    const addPagoExtra = () => {
        const nuevos = [...(form.pagos_extra || []), { concepto: '', cantidad: 0 }]
        set('pagos_extra', nuevos)
    }

    const removePagoExtra = (index: number) => {
        const nuevos = (form.pagos_extra || []).filter((_, i) => i !== index)
        set('pagos_extra', nuevos)
    }

    const updatePagoExtra = (index: number, field: keyof PagoExtra, value: any) => {
        const nuevos = [...(form.pagos_extra || [])]
        nuevos[index] = { ...nuevos[index], [field]: value }
        set('pagos_extra', nuevos)
    }

    const handleSave = async () => {
        if (!form.proyecto_nombre) { setError('El nombre del proyecto es obligatorio.'); return }
        if (!form.cantidad || form.cantidad <= 0) { setError('La cantidad debe ser mayor que 0.'); return }
        setSaving(true); setError(null)
        try {
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

            {/* Cantidad bruta base */}
            <div className="form-group">
                <label className="form-label">Cantidad Bruta (Base) *</label>
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

            {/* Pagos Extra */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Pagos Extra (Transporte, Dietas, etc.)</label>
                    <button className="btn btn-ghost btn-sm" onClick={addPagoExtra} style={{ height: '24px', padding: '0 8px', fontSize: '11px', color: 'var(--success)' }}>
                        <Plus size={12} /> Añadir Pago Extra
                    </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(form.pagos_extra || []).map((pago, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', animation: 'fadeIn 0.2s' }}>
                            <div style={{ flex: 3 }}>
                                <input
                                    className="form-input form-input-sm"
                                    value={pago.concepto}
                                    onChange={e => updatePagoExtra(idx, 'concepto', e.target.value)}
                                    placeholder="Concepto (ej: Kilometraje)"
                                />
                            </div>
                            <div style={{ flex: 1.5, position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-secondary)' }}>€</span>
                                <input
                                    type="number"
                                    className="form-input form-input-sm"
                                    style={{ paddingLeft: '18px' }}
                                    value={pago.cantidad || ''}
                                    onChange={e => updatePagoExtra(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                            <button className="btn btn-icon btn-ghost" onClick={() => removePagoExtra(idx)} style={{ color: 'var(--danger)', marginTop: '4px' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                {eco.totalExtras > 0 && (
                    <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '6px', textAlign: 'right', fontWeight: 600 }}>
                        + {fmt(eco.totalExtras)} en extras
                    </div>
                )}
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
                    {(form.comision_representante ?? 0) > 0 && baseCantidad > 0 && (
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
                    {(form.impuestos_estimados ?? 0) > 0 && baseCantidad > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '3px' }}>
                            − {fmt(eco.impuestosImporte)}
                        </div>
                    )}
                </div>
            </div>

            {/* Otros impuestos y deducciones */}
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Otras Deducciones / Impuestos</label>
                    <button className="btn btn-ghost btn-sm" onClick={addOtroImpuesto} style={{ height: '24px', padding: '0 8px', fontSize: '11px' }}>
                        <Plus size={12} /> Añadir
                    </button>
                </div>
                
                {(form.otros_impuestos || []).length === 0 && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px', border: '1px dashed var(--border)', borderRadius: '6px', textAlign: 'center' }}>
                        No hay deducciones adicionales. Por ejemplo: Aportación trabajador, cuotas, etc.
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(form.otros_impuestos || []).map((imp, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                            <div style={{ flex: 2 }}>
                                <input
                                    className="form-input form-input-sm"
                                    value={imp.nombre}
                                    onChange={e => updateOtroImpuesto(idx, 'nombre', e.target.value)}
                                    placeholder="Nombre"
                                />
                            </div>
                            <div style={{ flex: 1.2 }}>
                                <select
                                    className="form-select form-input-sm"
                                    value={imp.tipo}
                                    onChange={e => updateOtroImpuesto(idx, 'tipo', e.target.value)}
                                >
                                    <option value="porcentaje">% bruto</option>
                                    <option value="cantidad">Fijo (€)</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <input
                                    type="number"
                                    className="form-input form-input-sm"
                                    style={{ paddingRight: imp.tipo === 'porcentaje' ? '20px' : '8px' }}
                                    value={imp.valor || ''}
                                    onChange={e => updateOtroImpuesto(idx, 'valor', parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                />
                                {imp.tipo === 'porcentaje' && (
                                    <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--text-secondary)' }}>%</span>
                                )}
                            </div>
                            <button className="btn btn-icon btn-ghost" onClick={() => removeOtroImpuesto(idx)} style={{ color: 'var(--danger)', marginTop: '4px' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Importe Neto Manual */}
            <div className="form-group">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Importe Neto Real (Manual)</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>Opcional: Si es distinto al calculado</span>
                </label>
                <div style={{ position: 'relative' }}>
                    <span style={{
                        position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)', fontSize: '14px', pointerEvents: 'none',
                    }}>€</span>
                    <input
                        type="number"
                        className="form-input"
                        style={{ paddingLeft: '28px', background: form.importe_neto ? 'rgba(52,211,153,0.05)' : undefined }}
                        value={form.importe_neto ?? ''}
                        onChange={e => set('importe_neto', e.target.value === '' ? null : parseFloat(e.target.value))}
                        placeholder={eco.netoCalculado.toFixed(2)}
                        min="0"
                        step="0.01"
                    />
                </div>
            </div>

            {/* Resumen neto */}
            {hasCalc && (
                <div style={{
                    padding: '12px 14px', borderRadius: '8px',
                    background: 'rgba(52,211,153,0.06)',
                    border: '1px solid rgba(52,211,153,0.18)',
                    marginBottom: '16px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Base Bruta</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{fmt(baseCantidad)}</span>
                    </div>
                    {eco.totalExtras > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Extras</span>
                            <span style={{ fontSize: '13px', color: 'var(--success)' }}>+ {fmt(eco.totalExtras)}</span>
                        </div>
                    )}
                    {(eco.totalExtras > 0) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>Bruto Total</span>
                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{fmt(eco.brutoTotal)}</span>
                        </div>
                    )}
                    {(form.comision_representante ?? 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comisión {form.comision_representante}% (sobre base)</span>
                            <span style={{ fontSize: '13px', color: 'var(--danger)' }}>− {fmt(eco.comisionImporte)}</span>
                        </div>
                    )}
                    {(form.impuestos_estimados ?? 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>IRPF {form.impuestos_estimados}% (sobre total)</span>
                            <span style={{ fontSize: '13px', color: 'var(--danger)' }}>− {fmt(eco.impuestosImporte)}</span>
                        </div>
                    )}
                    {(form.otros_impuestos || []).map((imp, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{imp.nombre || 'Deducción'} {imp.tipo === 'porcentaje' ? `(${imp.valor}%)` : ''}</span>
                            <span style={{ fontSize: '13px', color: 'var(--danger)' }}>− {fmt(imp.tipo === 'porcentaje' ? eco.brutoTotal * (imp.valor / 100) : imp.valor)}</span>
                        </div>
                    ))}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        borderTop: '1px solid rgba(52,211,153,0.2)', paddingTop: '8px', marginTop: '4px',
                    }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>
                            {form.importe_neto ? 'Neto Manual' : 'Neto estimado'}
                        </span>
                        <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--success)', letterSpacing: '-0.5px' }}>
                            {fmt(eco.neto)}
                        </span>
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
                        Fecha Límite
                        <span style={{ marginLeft: '5px', fontSize: '9.5px', color: 'var(--text-secondary)', opacity: 0.7 }}>+90d</span>
                    </label>
                    <input
                        type="date"
                        className="form-input"
                        value={form.fecha_limite_cobro || ''}
                        onChange={e => set('fecha_limite_cobro', e.target.value || null)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Estado</label>
                    <select
                        className="form-select"
                        value={form.estado_pago}
                        onChange={e => set('estado_pago', e.target.value as EstadoPago)}
                    >
                        {estadosPago.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                </div>
            </div>

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

            <div className="form-group" style={{ marginTop: '4px' }}>
                <label className="form-label">Notas</label>
                <textarea
                    className="form-textarea"
                    value={form.notas || ''}
                    onChange={e => set('notas', e.target.value || null)}
                    placeholder="Datos adicionales..."
                />
            </div>
        </Modal>
    )
}
