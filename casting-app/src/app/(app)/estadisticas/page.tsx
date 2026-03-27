'use client'
import { useMemo } from 'react'
import { useCastings } from '@/hooks/useData'
import { formatCurrency } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts'
import { BarChart3, Target, TrendingUp, Users } from 'lucide-react'

const COLORS = ['#7c6af7', '#34d399', '#f97316', '#f87171', '#60a5fa', '#a78bfa']

const customTooltipStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '12px',
}

const customItemStyle = { 
    color: 'var(--text-primary)',
    fontSize: '12px',
}

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

export default function EstadisticasPage() {
    const { data: castings } = useCastings()
    const { genero } = useAuth()


    // Datos del funnel de progresión
    const funnelData = useMemo(() => {
        const total = castings.length
        const noEnviados = castings.filter(c => c.estado === 'pendiente').length
        const enviados = castings.filter(c => c.estado !== 'pendiente').length
        const opcionados = castings.filter(c => c.fue_opcionado).length
        const conCallback = castings.filter(c => c.tuvo_callback).length
        const seleccionados = castings.filter(c => c.estado === 'seleccionado').length
        const descartados = castings.filter(c => c.estado === 'descartado').length
        // Desgloses de los seleccionados
        const selSinCallback = castings.filter(c => c.estado === 'seleccionado' && !c.tuvo_callback).length
        const selConCallback = castings.filter(c => c.estado === 'seleccionado' && c.tuvo_callback).length

        return { total, noEnviados, enviados, opcionados, conCallback, seleccionados, descartados, selSinCallback, selConCallback }
    }, [castings])

    // Ratios corregidos con los hitos
    const ratioOpcionado = useMemo(() => {
        if (!castings.length) return '0'
        return ((funnelData.opcionados / castings.length) * 100).toFixed(1)
    }, [castings, funnelData])

    const ratioCallback = useMemo(() => {
        if (!funnelData.opcionados) return '0'
        return ((funnelData.conCallback / funnelData.opcionados) * 100).toFixed(1)
    }, [funnelData])

    const ratioTrabajo = useMemo(() => {
        if (!castings.length) return '0'
        return ((funnelData.seleccionados / castings.length) * 100).toFixed(1)
    }, [castings, funnelData])

    // Castings por tipo de proyecto
    const byTipoProyecto = useMemo(() => {
        const counts: Record<string, number> = {}
        castings.forEach(c => { counts[c.tipo_proyecto] = (counts[c.tipo_proyecto] || 0) + 1 })
        const labels: Record<string, string> = { serie: 'Serie', cine: 'Cine', publicidad: 'Publicidad', teatro: 'Teatro', doblaje: 'Doblaje' }
        return Object.entries(counts)
            .map(([k, v]) => ({ name: labels[k] || k, value: v }))
            .sort((a, b) => b.value - a.value)
    }, [castings])

    // Castings por tipo de casting
    const byTipoCasting = useMemo(() => {
        const counts: Record<string, number> = {}
        castings.forEach(c => { counts[c.tipo_casting] = (counts[c.tipo_casting] || 0) + 1 })
        const labels: Record<string, string> = {
            self_tape: 'Self Tape', presencial: 'Presencial',
            callback_presencial: 'CB Presencial', callback_zoom: 'CB Zoom', quimica: 'Química'
        }
        return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }))
    }, [castings])

    // Rendimiento por director de casting (top 8)
    const byDirectorCasting = useMemo(() => {
        const stats: Record<string, { total: number, opcionados: number, trabajos: number }> = {}
        castings.forEach(c => {
            if (!c.director_casting) return
            if (!stats[c.director_casting]) stats[c.director_casting] = { total: 0, opcionados: 0, trabajos: 0 }
            stats[c.director_casting].total++
            if (c.fue_opcionado) stats[c.director_casting].opcionados++
            if (c.estado === 'seleccionado') stats[c.director_casting].trabajos++
        })
        return Object.entries(stats)
            .map(([director, s]) => ({
                director: director.split(' ')[0] + (director.split(' ')[1] ? ' ' + director.split(' ')[1][0] + '.' : ''),
                total: s.total,
                opcionados: s.opcionados,
                trabajos: s.trabajos,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)
    }, [castings])

    // Castings por mes últimos 12 meses
    const byMonth = useMemo(() => {
        const now = new Date()
        const months = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const m = d.getMonth()
            const y = d.getFullYear()
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
    }, [castings])

    // Fuente de castings
    const byFuente = useMemo(() => {
        const counts: Record<string, number> = {}
        castings.forEach(c => { counts[c.fuente_casting] = (counts[c.fuente_casting] || 0) + 1 })
        const labels: Record<string, string> = {
            representante: 'Representante', director_casting: 'Dir. Casting',
            autocasting: 'Autocasting', contacto: 'Contacto'
        }
        return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }))
    }, [castings])

    return (
        <>
            <div className="page-header">
                <h2>Estadísticas</h2>
                <p>Análisis detallado de tu rendimiento como {genero}</p>
            </div>

            <div className="page-body">
                {/* === FUNNEL DE PROGRESIÓN === */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="chart-title" style={{ marginBottom: '4px' }}>Embudo de Progresión</div>
                    <div className="chart-subtitle" style={{ marginBottom: '20px' }}>Cómo evolucionan tus castings a lo largo del proceso</div>

                    {castings.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px', fontSize: '13px' }}>Sin datos todavía</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'stretch', gap: '3px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {[
                                { label: 'Recibidos', count: funnelData.total, color: 'var(--text-secondary)', pct: 100 },
                                { label: 'No enviados', count: funnelData.noEnviados, color: '#94a3b8', pct: funnelData.total ? (funnelData.noEnviados / funnelData.total * 100) : 0 },
                                { label: 'Enviados', count: funnelData.enviados, color: '#7c6af7', pct: funnelData.total ? (funnelData.enviados / funnelData.total * 100) : 0 },
                                { label: 'Opcionados', count: funnelData.opcionados, color: '#f97316', pct: funnelData.total ? (funnelData.opcionados / funnelData.total * 100) : 0 },
                                { label: 'Callback', count: funnelData.conCallback, color: '#fbbf24', pct: funnelData.total ? (funnelData.conCallback / funnelData.total * 100) : 0 },
                                { label: 'Elegido', count: funnelData.seleccionados, color: '#34d399', pct: funnelData.total ? (funnelData.seleccionados / funnelData.total * 100) : 0 },
                            ].map(({ label, count, color, pct }, i) => (
                                <div key={i} style={{ flex: '1 0 60px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        width: '100%',
                                        height: `${Math.max(pct, 4)}px`,
                                        maxHeight: '100px',
                                        minHeight: '12px',
                                        background: color,
                                        borderRadius: i === 0 ? '8px 0 0 8px' : i === 5 ? '0 8px 8px 0' : '0',
                                        opacity: 0.85,
                                        transition: 'height 0.4s ease',
                                    }} />
                                    <div style={{ fontSize: '18px', fontWeight: 800, color, letterSpacing: '-1px' }}>{count}</div>
                                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', height: '20px', display: 'flex', alignItems: 'center' }}>{label}</div>
                                    <div style={{ fontSize: '9px', color, opacity: 0.8 }}>{pct.toFixed(0)}%</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Desglose seleccionados */}
                    {funnelData.seleccionados > 0 && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                <span style={{ color: '#34d399', fontWeight: 700 }}>{funnelData.selSinCallback}</span> elegido/s directamente (sin callback)
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
                    <RatioCard
                        label="Casting → Opcionado"
                        value={ratioOpcionado}
                        sub={`${funnelData.opcionados} opcionados de ${castings.length} castings`}
                        color="#f97316"
                    />
                    <RatioCard
                        label="Opcionado → Callback"
                        value={ratioCallback}
                        sub={`${funnelData.conCallback} callbacks de ${funnelData.opcionados} opciones`}
                        color="#fbbf24"
                    />
                    <RatioCard
                        label="Ratio Global (Casting → Trabajo)"
                        value={ratioTrabajo}
                        sub={`${funnelData.seleccionados} trabajos de ${castings.length} castings totales`}
                        color="#34d399"
                    />
                </div>

                {/* Evolución por mes */}
                <div className="chart-container mb-6">
                    <div className="chart-title">Evolución Mensual</div>
                    <div className="chart-subtitle">Castings, opciones y trabajos en los últimos 12 meses</div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={byMonth}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} allowDecimals={false} />
                            <Tooltip contentStyle={customTooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: '11px', color: '#8888aa' }} />
                            <Line type="monotone" dataKey="castings" stroke="#7c6af7" strokeWidth={2} dot={false} name="Castings" />
                            <Line type="monotone" dataKey="opcionados" stroke="#f97316" strokeWidth={2} dot={false} name="Opcionados" />
                            <Line type="monotone" dataKey="trabajos" stroke="#34d399" strokeWidth={2} dot={false} name="Trabajos" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Row 2 */}
                <div className="grid-2 mb-6" style={{ gap: '16px' }}>
                    {/* Por tipo de proyecto */}
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

                    {/* Por fuente */}
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

                {/* Rendimiento por Director de Casting */}
                <div className="chart-container mb-6">
                    <div className="chart-title">Rendimiento por Director/a de Casting</div>
                    <div className="chart-subtitle">Top 8 directores con más castings</div>
                    {byDirectorCasting.length === 0 ? (
                        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Sin datos — registra tus directores de casting en los castings
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={byDirectorCasting} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="director" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip contentStyle={customTooltipStyle} itemStyle={customItemStyle} />
                                <Legend wrapperStyle={{ fontSize: '11px', color: '#8888aa' }} />
                                <Bar dataKey="total" name="Total Castings" fill="#7c6af7" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="opcionados" name="Opcionados" fill="#f97316" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="trabajos" name="Trabajos" fill="#34d399" radius={[3, 3, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

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
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                            {item.name}
                                        </div>
                                        <div style={{ fontSize: '26px', fontWeight: 800, color: COLORS[i % COLORS.length], letterSpacing: '-1px' }}>
                                            {item.value}
                                        </div>
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
        </>
    )
}
