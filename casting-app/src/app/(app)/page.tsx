'use client'
import { useMemo } from 'react'
import { useCastings, useProyectos, useFinanzas, useCalendarEvents } from '@/hooks/useData'
import { BadgeEstado, BadgeTipoProyecto, formatDate, formatCurrency } from '@/components/ui'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts'
import { Film, Clapperboard, DollarSign, TrendingUp, PhoneCall, Trophy, Star, Eye, EyeOff, Calendar } from 'lucide-react'
import { useState } from 'react'
import DashboardCalendar from '@/components/DashboardCalendar'

const COLORS = ['#7c6af7', '#34d399', '#fbbf24', '#f87171', '#60a5fa']

function StatCard({ label, value, sub, icon, color }: {
    label: string, value: string | number, sub?: string,
    icon: React.ReactNode, color: string
}) {
    return (
        <div className="stat-card">
            <div className="stat-icon" style={{ background: `${color}20` }}>
                <div style={{ color }}>{icon}</div>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>{label}</div>
            {sub && <div className="stat-sublabel">{sub}</div>}
        </div>
    )
}

export default function DashboardPage() {
    const [showIncome, setShowIncome] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('dashboard_show_income') !== 'false'
        }
        return true
    })
    const { data: castings, loading: lc } = useCastings()
    const { data: proyectos } = useProyectos()
    const { data: finanzas } = useFinanzas()
    const { data: events } = useCalendarEvents()

    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const nextEvent = useMemo(() => {
        if (!events) return null
        return events
            .filter(e => e.event_date_start >= todayStr)
            .sort((a,b) => a.event_date_start.localeCompare(b.event_date_start))[0]
    }, [events, todayStr])
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()

    const stats = useMemo(() => {
        const castingsThisMonth = castings.filter(c => {
            const d = new Date(c.fecha_casting)
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear
        })
        // "En proceso": castings enviados sin resultado final todavía
        const enProceso = castings.filter(c => c.estado === 'enviado')
        // "Opcionados activos": marcados como opcionado y aún sin resultado final
        const opcionadosActivos = castings.filter(c => c.fue_opcionado && c.estado === 'enviado')
        // "Con callback activo": tienen callback y aún sin resultado final
        const conCallbackActivos = castings.filter(c => c.tuvo_callback && c.estado === 'enviado')
        const trabajos = proyectos.length
        const ingresosThisMonth = finanzas
            .filter(f => {
                const d = f.fecha_pago ? new Date(f.fecha_pago) : null
                return d && d.getMonth() === thisMonth && d.getFullYear() === thisYear
            })
            .reduce((sum, f) => sum + f.cantidad, 0)

        return {
            castingsThisMonth: castingsThisMonth.length,
            enProceso: enProceso.length,
            opcionadosActivos: opcionadosActivos.length,
            conCallbackActivos: conCallbackActivos.length,
            trabajos,
            ingresosThisMonth,
        }
    }, [castings, finanzas, proyectos.length, thisMonth, thisYear])

    const toggleIncome = () => {
        const newValue = !showIncome
        setShowIncome(newValue)
        localStorage.setItem('dashboard_show_income', String(newValue))
    }

    // Chart: castings por mes (últimos 6 meses)
    const castingsByMonth = useMemo(() => {
        const months = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1)
            const m = d.getMonth()
            const y = d.getFullYear()
            const count = castings.filter(c => {
                const cd = new Date(c.fecha_casting)
                return cd.getMonth() === m && cd.getFullYear() === y
            }).length
            months.push({
                name: d.toLocaleDateString('es-ES', { month: 'short' }),
                castings: count
            })
        }
        return months
    }, [castings, thisMonth, thisYear])

    // Pie: castings por tipo de proyecto
    const castingsByTipo = useMemo(() => {
        const counts: Record<string, number> = {}
        castings.forEach(c => { counts[c.tipo_proyecto] = (counts[c.tipo_proyecto] || 0) + 1 })
        const labels: Record<string, string> = {
            serie: 'Serie', cine: 'Cine', publicidad: 'Publicidad',
            teatro: 'Teatro', doblaje: 'Doblaje', tv: 'TV'
        }
        return Object.entries(counts).map(([k, v]) => ({ name: labels[k] || k, value: v }))
    }, [castings])

    // Ingresos por tipo
    const ingresosByTipo = useMemo(() => {
        const sums: Record<string, number> = {}
        finanzas.forEach(f => { sums[f.tipo_ingreso] = (sums[f.tipo_ingreso] || 0) + f.cantidad })
        const labels: Record<string, string> = { nomina: 'Nómina', derechos_imagen: 'Derechos', buyout: 'Buyout', royalties: 'Royalties' }
        return Object.entries(sums).map(([k, v]) => ({ name: labels[k] || k, value: v }))
    }, [finanzas])

    // Latest castings
    const recentCastings = castings.slice(0, 5)

    const customTooltipStyle = {
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '12px',
    }
    const customItemStyle = { color: 'var(--text-primary)' }

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Star size={20} color="#9d8fff" fill="#9d8fff" />
                    <div>
                        <h2>Dashboard</h2>
                        <p>{now.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Stats */}
                <div className="stat-grid mb-6">
                    {/* Widget Calendario Estilo iOS */}
                    <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', borderLeft: '4px solid #7c6af7' }}>
                        {nextEvent ? (
                            <>
                                <div style={{ textAlign: 'center', minWidth: '45px', background: 'rgba(255,255,255,0.03)', padding: '6px 4px', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', lineHeight: 1, marginBottom: '2px' }}>
                                        {new Date(nextEvent.event_date_start + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short' }).replace('.', '').toUpperCase()}
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                                        {new Date(nextEvent.event_date_start + 'T12:00:00').getDate()}
                                    </div>
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                        {nextEvent.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Próximo evento</div>
                                </div>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    <Calendar size={18} color="var(--text-secondary)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>Sin eventos</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6 }}>Agenda vacía</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <StatCard
                        label="Castings este mes"
                        value={stats.castingsThisMonth}
                        icon={<Film size={18} />}
                        color="#7c6af7"
                        sub="este mes"
                    />
                    <StatCard
                        label="En proceso"
                        value={stats.enProceso}
                        icon={<PhoneCall size={18} />}
                        color="#60a5fa"
                        sub="sin resultado todavía"
                    />
                    <StatCard
                        label="Opcionados activos"
                        value={stats.opcionadosActivos}
                        icon={<TrendingUp size={18} />}
                        color="#a78bfa"
                        sub={stats.conCallbackActivos > 0 ? `${stats.conCallbackActivos} con callback` : 'esperando resultado'}
                    />
                    <StatCard
                        label="Trabajos conseguidos"
                        value={stats.trabajos}
                        icon={<Trophy size={18} />}
                        color="#34d399"
                        sub="total histórico"
                    />
                    <div className="stat-card" style={{ cursor: 'pointer', position: 'relative' }} onClick={toggleIncome}>
                        <div style={{ position: 'absolute', top: '14px', right: '14px', opacity: 0.5 }}>
                            {showIncome ? <EyeOff size={14} /> : <Eye size={14} />}
                        </div>
                        <div className="stat-icon" style={{ background: '#fbbf2420' }}>
                            <div style={{ color: '#fbbf24' }}><DollarSign size={18} /></div>
                        </div>
                        <div className="stat-value">
                            {showIncome ? formatCurrency(stats.ingresosThisMonth) : '••••••'}
                        </div>
                        <div className="stat-label" style={{ marginBottom: 0, marginTop: '6px' }}>Ingresos este mes</div>
                    </div>
                </div>

                {/* Calendario */}
                <div className="mb-6">
                    <DashboardCalendar />
                </div>

                {/* Charts row */}
                <div className="grid-2 mb-6" style={{ gap: '16px' }}>
                    <div className="chart-container">
                        <div className="chart-title">Castings por Mes</div>
                        <div className="chart-subtitle">Últimos 6 meses</div>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={castingsByMonth} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} allowDecimals={false} />
                                <Tooltip contentStyle={customTooltipStyle} itemStyle={customItemStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="castings" fill="#7c6af7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="chart-container">
                        <div className="chart-title">Castings por Tipo de Proyecto</div>
                        <div className="chart-subtitle">Distribución histórica</div>
                        {castingsByTipo.length === 0 ? (
                            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                                Sin datos todavía
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={castingsByTipo} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                                        {castingsByTipo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip contentStyle={customTooltipStyle} itemStyle={customItemStyle} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                            {castingsByTipo.map((item, i) => (
                                <span key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                                    {item.name} ({item.value})
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom row */}
                <div className="grid-2" style={{ gap: '16px' }}>
                    {/* Recent Castings */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '14px' }}>Últimos Castings</div>
                        {recentCastings.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No hay castings registrados aún.</p>
                        ) : (
                            recentCastings.map(c => (
                                <div key={c.id} className="timeline-item">
                                    <div className="timeline-dot" style={{
                                        background: c.estado === 'seleccionado' ? 'var(--success)'
                                            : c.estado === 'descartado' ? 'var(--danger)'
                                                : c.tuvo_callback ? 'var(--warning)'
                                                    : c.fue_opcionado ? '#a78bfa'
                                                        : 'var(--accent)'
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.proyecto}</div>
                                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                                            {c.personaje} · {formatDate(c.fecha_casting)}
                                            {c.fue_opcionado && (
                                                <span style={{ color: '#a78bfa', marginLeft: '6px', fontSize: '10px' }}>
                                                    {c.tuvo_callback ? '● Callback' : '● Opcionado'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <BadgeEstado estado={c.estado} />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Ingresos por tipo */}
                    <div className="card">
                        <div className="card-title" style={{ marginBottom: '14px' }}>Ingresos por Tipo</div>
                        {ingresosByTipo.length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No hay ingresos registrados aún.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={ingresosByTipo} layout="vertical" barSize={18}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 10 }} tickFormatter={v => `${v}€`} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8888aa', fontSize: 11 }} width={65} />
                                    <Tooltip contentStyle={customTooltipStyle} formatter={(v: number | undefined) => [`${formatCurrency(v ?? 0)}`, 'Importe']} />
                                    <Bar dataKey="value" fill="#34d399" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
