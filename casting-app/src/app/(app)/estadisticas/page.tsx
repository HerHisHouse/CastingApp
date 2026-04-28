'use client'
import { useMemo, useState } from 'react'
import { useCastings } from '@/hooks/useData'
import { formatCurrency } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { X } from 'lucide-react'
import { Casting } from '@/lib/supabase'

const COLORS = ['#7c6af7', '#34d399', '#f97316', '#f87171', '#60a5fa', '#a78bfa']

const customTooltipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '12px',
}
const customItemStyle = { color: 'var(--text-primary)', fontSize: '12px' }

type PeriodKey = '3m' | '6m' | '1y' | 'all'

function RatioCard({ label, value, sub, color }: { label: string, value: string, sub: string, color: string }) {
    const pct = parseFloat(value) || 0
    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div className="stat-label">{label}</div>
                <span style={{ fontSize: '28px', fontWeight: 800, color, letterSpacing: '-1px' }}>{value}%</span>
            </div>
            <div className="ratio-bar-bg">
                <div className="ratio-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: `linear-gradient(90deg, ${color} 0%, ${color}99 100%)` }} />
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '8px' }}>{sub}</div>
        </div>
    )
}

// Director drill-down drawer
function DirectorDrawer({ director, castings, onClose }: { director: string, castings: Casting[], onClose: () => void }) {
    const directorCastings = castings.filter(c => c.director_casting === director)
    const opcionados = directorCastings.filter(c => c.fue_opcionado).length
    const conversion = directorCastings.length ? ((opcionados / directorCastings.length) * 100).toFixed(0) : '0'

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }} onClick={onClose}>
            <div style={{
                position: 'absolute', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '420px',
                background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.25s ease-out',
                overflow: 'hidden',
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', background: 'rgba(124,106,247,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--accent-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Director/a de Casting</div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{director}</h3>
                        </div>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-light)' }}>{directorCastings.length}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Total castings</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f97316' }}>{opcionados}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Opcionados</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>{directorCastings.filter(c => c.estado === 'seleccionado').length}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Trabajos</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 800, color: '#fbbf24' }}>{conversion}%</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Conversión</div>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
                    {directorCastings.map(c => (
                        <div key={c.id} style={{
                            padding: '10px 12px', borderRadius: '8px', marginBottom: '6px',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                            borderLeft: `3px solid ${c.estado === 'seleccionado' ? 'var(--success)' : c.fue_opcionado ? '#f97316' : 'var(--border)'}`,
                        }}>
                            <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.proyecto}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <span>{c.fecha_casting}</span>
                                <span>·</span>
                                <span>{c.tipo_proyecto}</span>
                                {c.fue_opcionado && <span style={{ color: '#f97316' }}>● Opcionado</span>}
                                {c.tuvo_callback && <span style={{ color: '#fbbf24' }}>● Callback</span>}
                                {c.estado === 'seleccionado' && <span style={{ color: 'var(--success)' }}>✓ Trabajo</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default function EstadisticasPage() {
    const { data: castings } = useCastings()
    const { genero } = useAuth()

    // Period filter
    const [period, setPeriod] = useState<PeriodKey>('all')
    // Line chart series toggles
    const [showCastings, setShowCastings] = useState(true)
    const [showOpcionados, setShowOpcionados] = useState(true)
    const [showTrabajos, setShowTrabajos] = useState(true)
    // Director drill-down
    const [selectedDirector, setSelectedDirector] = useState<string | null>(null)

    // Filter castings by period
    const filteredCastings = useMemo(() => {
        if (period === 'all') return castings
        const now = new Date()
        const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
        const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1)
        return castings.filter(c => new Date(c.fecha_casting) >= cutoff)
    }, [castings, period])

    const periodLabel: Record<PeriodKey, string> = {
        '3m': 'Últimos 3 meses', '6m': 'Últimos 6 meses', '1y': 'Este año', 'all': 'Todo el histórico'
    }

    // Funnel
    const funnelData = useMemo(() => {
        const total = filteredCastings.length
        const noAplicado = filteredCastings.filter(c => c.estado === 'no_aplicado').length
        const enviados = filteredCastings.filter(c => c.estado !== 'pendiente' && c.estado !== 'no_aplicado').length
        const opcionados = filteredCastings.filter(c => c.fue_opcionado).length
        const conCallback = filteredCastings.filter(c => c.tuvo_callback).length
        const seleccionados = filteredCastings.filter(c => c.estado === 'seleccionado').length
        const descartados = filteredCastings.filter(c => c.estado === 'descartado').length
        const selSinCallback = filteredCastings.filter(c => c.estado === 'seleccionado' && !c.tuvo_callback).length
        const selConCallback = filteredCastings.filter(c => c.estado === 'seleccionado' && c.tuvo_callback).length
        return { total, noAplicado, enviados, opcionados, conCallback, seleccionados, descartados, selSinCallback, selConCallback }
    }, [filteredCastings])

    const ratioOpcionado = useMemo(() => {
        if (!filteredCastings.length) return '0'
        return ((funnelData.opcionados / filteredCastings.length) * 100).toFixed(1)
    }, [filteredCastings, funnelData])

    const ratioCallback = useMemo(() => {
        if (!funnelData.opcionados) return '0'
        return ((funnelData.conCallback / funnelData.opcionados) * 100).toFixed(1)
    }, [funnelData])

    const ratioTrabajo = useMemo(() => {
        if (!filteredCastings.length) return '0'
        return ((funnelData.seleccionados / filteredCastings.length) * 100).toFixed(1)
    }, [filteredCastings, funnelData])

    // Castings por tipo
    const byTipoProyecto = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredCastings.forEach(c => { counts[c.tipo_proyecto] = (counts[c.tipo_proyecto] || 0) + 1 })
        const labels: Record<string, string> = { serie: 'Serie', cine: 'Cine', publicidad: 'Publicidad', teatro: 'Teatro', doblaje: 'Doblaje' }
        return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v })).sort((a, b) => b.value - a.value)
    }, [filteredCastings])

    // Tipo de casting
    const byTipoCasting = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredCastings.forEach(c => { counts[c.tipo_casting] = (counts[c.tipo_casting] || 0) + 1 })
        const labels: Record<string, string> = { self_tape: 'Self Tape', presencial: 'Presencial', callback_presencial: 'CB Presencial', callback_zoom: 'CB Zoom', quimica: 'Química' }
        return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }))
    }, [filteredCastings])

    // Rendimiento por director
    const byDirectorCasting = useMemo(() => {
        const stats: Record<string, { total: number, opcionados: number, trabajos: number }> = {}
        filteredCastings.forEach(c => {
            if (!c.director_casting) return
            if (!stats[c.director_casting]) stats[c.director_casting] = { total: 0, opcionados: 0, trabajos: 0 }
            stats[c.director_casting].total++
            if (c.fue_opcionado) stats[c.director_casting].opcionados++
            if (c.estado === 'seleccionado') stats[c.director_casting].trabajos++
        })
        return Object.entries(stats)
            .map(([director, s]) => ({
                director: director.split(' ')[0] + (director.split(' ')[1] ? ' ' + director.split(' ')[1][0] + '.' : ''),
                directorFull: director,
                total: s.total, opcionados: s.opcionados, trabajos: s.trabajos,
            }))
            .sort((a, b) => b.total - a.total).slice(0, 8)
    }, [filteredCastings])

    // Evolución por mes (últimos 12 meses)
    const byMonth = useMemo(() => {
        const now = new Date()
        const numMonths = period === '3m' ? 3 : period === '6m' ? 6 : 12
        const months = []
        for (let i = numMonths - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const m = d.getMonth(); const y = d.getFullYear()
            const monthCastings = castings.filter(c => {
                const cd = new Date(c.fecha_casting)
                return cd.getMonth() === m && cd.getFullYear() === y
            })
            months.push({
                name: d.toLocaleDateString('es-ES', { month: 'short' }),
                castings: monthCastings.length,
                opcionados: monthCastings.filter(c => c.fue_opcionado).length,
                trabajos: monthCastings.filter(c => c.estado === 'seleccionado').length,
            })
        }
        return months
    }, [castings, period])

    // Fuente
    const byFuente = useMemo(() => {
        const counts: Record<string, number> = {}
        filteredCastings.forEach(c => { counts[c.fuente_casting] = (counts[c.fuente_casting] || 0) + 1 })
        const labels: Record<string, string> = { representante: 'Representante', director_casting: 'Dir. Casting', autocasting: 'Autocasting', contacto: 'Contacto' }
        return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }))
    }, [filteredCastings])

    // Comparativa anual
    const yearlyData = useMemo(() => {
        const years: Record<number, { castings: number, opcionados: number, trabajos: number }> = {}
        castings.forEach(c => {
            const y = new Date(c.fecha_casting).getFullYear()
            if (!years[y]) years[y] = { castings: 0, opcionados: 0, trabajos: 0 }
            years[y].castings++
            if (c.fue_opcionado) years[y].opcionados++
            if (c.estado === 'seleccionado') years[y].trabajos++
        })
        return Object.entries(years).map(([year, data]) => ({ year, ...data })).sort((a, b) => Number(a.year) - Number(b.year))
    }, [castings])
    const showYearlyChart = yearlyData.length >= 1

    // Custom bar click handler for director drill-down
    const handleDirectorBarClick = (data: any) => {
        if (data && data.directorFull) setSelectedDirector(data.directorFull)
        else if (data && data.activePayload && data.activePayload[0]) {
            const d = data.activePayload[0].payload
            if (d.directorFull) setSelectedDirector(d.directorFull)
        }
    }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0 }}>Estadísticas</h2>
                <p style={{ margin: 0 }}>Análisis detallado de tu rendimiento como {genero}</p>
            </div>

            <div className="page-body">
                {/* Period filter */}
                <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as PeriodKey)}
                        className="form-input"
                        style={{
                            width: 'auto', padding: '8px 36px 8px 16px', borderRadius: '12px',
                            fontSize: '13px', fontWeight: 600, background: 'var(--bg-card)',
                            border: '1px solid var(--border)', color: 'var(--text-primary)',
                            cursor: 'pointer', appearance: 'auto'
                        }}
                    >
                        {(Object.entries(periodLabel) as [PeriodKey, string][]).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* Funnel */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="chart-title" style={{ marginBottom: '4px' }}>Embudo de Progresión</div>
                    <div className="chart-subtitle" style={{ marginBottom: '20px' }}>Cómo evolucionan tus castings · {periodLabel[period]}</div>
                    {filteredCastings.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '13px' }}>Sin datos para el periodo seleccionado</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '3px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {[
                                { label: 'Recibidos', count: funnelData.total, color: 'var(--text-secondary)', pct: 100 },
                                { label: 'No aplicado', count: funnelData.noAplicado, color: '#94a3b8', pct: funnelData.total ? (funnelData.noAplicado / funnelData.total * 100) : 0 },
                                { label: 'Enviados', count: funnelData.enviados, color: '#7c6af7', pct: funnelData.total ? (funnelData.enviados / funnelData.total * 100) : 0 },
                                { label: 'Opcionados', count: funnelData.opcionados, color: '#f97316', pct: funnelData.total ? (funnelData.opcionados / funnelData.total * 100) : 0 },
                                { label: 'Callback', count: funnelData.conCallback, color: '#fbbf24', pct: funnelData.total ? (funnelData.conCallback / funnelData.total * 100) : 0 },
                                { label: 'Elegido', count: funnelData.seleccionados, color: '#34d399', pct: funnelData.total ? (funnelData.seleccionados / funnelData.total * 100) : 0 },
                            ].map(({ label, count, color, pct }, i) => (
                                <div key={i} style={{ flex: '1 0 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '100%', height: `${Math.max(pct, 4)}px`, maxHeight: '100px', minHeight: '12px', background: color, borderRadius: i === 0 ? '8px 0 0 8px' : i === 5 ? '0 8px 8px 0' : '0', opacity: 0.85, transition: 'height 0.4s ease' }} />
                                    <div style={{ fontSize: '18px', fontWeight: 800, color, letterSpacing: '-1px' }}>{count}</div>
                                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', height: '20px', display: 'flex', alignItems: 'center' }}>{label}</div>
                                    <div style={{ fontSize: '9px', color, opacity: 0.8 }}>{pct.toFixed(0)}%</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {funnelData.seleccionados > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span style={{ color: '#34d399', fontWeight: 700 }}>{funnelData.selSinCallback}</span> elegido/s directamente
                            </span>
                            <span style={{ color: 'var(--border)', fontSize: '12px' }}>·</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span style={{ color: '#34d399', fontWeight: 700 }}>{funnelData.selConCallback}</span> elegido/s tras callback
                            </span>
                        </div>
                    )}
                </div>

                {/* Ratio cards */}
                <div className="grid-3 mb-6" style={{ gap: '16px' }}>
                    <RatioCard label="Casting → Opcionado" value={ratioOpcionado} sub={`${funnelData.opcionados} opcionados de ${filteredCastings.length} castings`} color="#f97316" />
                    <RatioCard label="Opcionado → Callback" value={ratioCallback} sub={`${funnelData.conCallback} callbacks de ${funnelData.opcionados} opciones`} color="#fbbf24" />
                    <RatioCard label="Ratio Global (Casting → Trabajo)" value={ratioTrabajo} sub={`${funnelData.seleccionados} trabajos de ${filteredCastings.length} castings`} color="#34d399" />
                </div>

                {/* Evolución mensual con series toggles */}
                <div className="chart-container mb-6">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                        <div>
                            <div className="chart-title" style={{ marginBottom: '2px' }}>Evolución Mensual</div>
                            <div className="chart-subtitle">Castings, opciones y trabajos · {periodLabel[period]}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {[
                                { key: 'castings', label: 'Castings', color: '#7c6af7', active: showCastings, toggle: () => setShowCastings(v => !v) },
                                { key: 'opcionados', label: 'Opcionados', color: '#f97316', active: showOpcionados, toggle: () => setShowOpcionados(v => !v) },
                                { key: 'trabajos', label: 'Trabajos', color: '#34d399', active: showTrabajos, toggle: () => setShowTrabajos(v => !v) },
                            ].map(s => (
                                <button key={s.key} onClick={s.toggle} style={{
                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px',
                                    borderRadius: '15px', fontSize: '11px', fontWeight: 600, fontFamily: 'inherit',
                                    border: `1px solid ${s.active ? s.color : 'var(--border)'}`,
                                    background: s.active ? `${s.color}18` : 'transparent',
                                    color: s.active ? s.color : 'var(--text-secondary)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                    textDecoration: s.active ? 'none' : 'line-through',
                                    opacity: s.active ? 1 : 0.5,
                                }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={byMonth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip contentStyle={customTooltipStyle} />
                            {showCastings && <Line type="monotone" dataKey="castings" stroke="#7c6af7" strokeWidth={2} dot={false} name="Castings" />}
                            {showOpcionados && <Line type="monotone" dataKey="opcionados" stroke="#f97316" strokeWidth={2} dot={false} name="Opcionados" />}
                            {showTrabajos && <Line type="monotone" dataKey="trabajos" stroke="#34d399" strokeWidth={2} dot={false} name="Trabajos" />}
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Row 2 */}
                <div className="grid-2 mb-6" style={{ gap: '16px' }}>
                    <div className="chart-container">
                        <div className="chart-title">Castings por Tipo de Proyecto</div>
                        <div className="chart-subtitle">Distribución de tu actividad</div>
                        {byTipoProyecto.length === 0 ? (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Sin datos</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie data={byTipoProyecto} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value">
                                            {byTipoProyecto.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={customTooltipStyle} itemStyle={customItemStyle} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                    {byTipoProyecto.map((item, i) => (
                                        <span key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                                            {item.name} ({item.value})
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="chart-container">
                        <div className="chart-title">Fuente de los Castings</div>
                        <div className="chart-subtitle">¿Cómo llegan tus oportunidades?</div>
                        {byFuente.length === 0 ? (
                            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Sin datos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={byFuente} barSize={32}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 10 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} allowDecimals={false} />
                                    <Tooltip contentStyle={customTooltipStyle} itemStyle={customItemStyle} />
                                    <Bar dataKey="value" name="Castings" radius={[4, 4, 0, 0]}>
                                        {byFuente.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Director drill-down */}
                <div className="chart-container mb-6">
                    <div className="chart-title">Rendimiento por Director/a de Casting</div>
                    <div className="chart-subtitle">Top 8 directores · Haz clic en una barra para ver el desglose</div>
                    {byDirectorCasting.length === 0 ? (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Sin datos — registra tus directores de casting en los castings
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byDirectorCasting} barSize={20} onClick={handleDirectorBarClick} style={{ cursor: 'pointer' }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="director" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip contentStyle={customTooltipStyle} itemStyle={customItemStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Legend wrapperStyle={{ fontSize: '11px', color: '#8888aa' }} />
                                <Bar dataKey="total" name="Total Castings" fill="#7c6af7" radius={[3, 3, 0, 0]} onClick={handleDirectorBarClick} />
                                <Bar dataKey="opcionados" name="Opcionados" fill="#f97316" radius={[3, 3, 0, 0]} onClick={handleDirectorBarClick} />
                                <Bar dataKey="trabajos" name="Trabajos" fill="#34d399" radius={[3, 3, 0, 0]} onClick={handleDirectorBarClick} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6, marginTop: '8px', textAlign: 'center' }}>
                        💡 Haz clic en cualquier barra para ver el historial completo con ese director/a
                    </div>
                </div>

                {/* Comparativa anual */}
                {showYearlyChart && (
                    <div className="chart-container mb-6">
                        <div className="chart-title">Comparativa Anual</div>
                        <div className="chart-subtitle">Evolución año a año de castings, opciones y trabajos</div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={yearlyData} barSize={22}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip contentStyle={customTooltipStyle} itemStyle={customItemStyle} />
                                <Legend wrapperStyle={{ fontSize: '11px', color: '#8888aa' }} />
                                <Bar dataKey="castings" name="Castings" fill="#7c6af7" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="opcionados" name="Opcionados" fill="#f97316" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="trabajos" name="Trabajos" fill="#34d399" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Tipo de casting */}
                <div className="chart-container">
                    <div className="chart-title">Castings por Formato</div>
                    <div className="chart-subtitle">Self Tape, Presencial, Callback, Química</div>
                    {byTipoCasting.length === 0 ? (
                        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>Sin datos</div>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {byTipoCasting.map((item, i) => {
                                const total = byTipoCasting.reduce((s, x) => s + x.value, 0)
                                const pct = ((item.value / total) * 100).toFixed(0)
                                return (
                                    <div key={i} style={{ flex: '1 1 180px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px 16px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{item.name}</div>
                                        <div style={{ fontSize: '26px', fontWeight: 800, color: COLORS[i % COLORS.length], letterSpacing: '-1px' }}>{item.value}</div>
                                        <div className="ratio-bar-bg" style={{ marginTop: '8px' }}>
                                            <div className="ratio-bar-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>{pct}% del total</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Director drill-down drawer */}
            {selectedDirector && (
                <DirectorDrawer
                    director={selectedDirector}
                    castings={castings}
                    onClose={() => setSelectedDirector(null)}
                />
            )}
        </>
    )
}
