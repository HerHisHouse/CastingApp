'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth,
    isSameDay, isToday, parseISO, setMonth, setYear, getMonth, getYear
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
    ChevronLeft, ChevronRight, X, Calendar as CalendarIcon,
    Info, ExternalLink, ChevronDown, Trash2, Plus, Clock
} from 'lucide-react'
import { useCalendarEvents } from '@/hooks/useData'
import { CalendarEvent, EventType } from '@/lib/supabase'
import ManualEventModal from './ManualEventModal'
import { useAuth } from '@/context/AuthContext'

// ── Colores por tipo de evento ──────────────────────────────────────────────
const EVENT_CONFIG: Record<EventType, { color: string; emoji: string; label: string }> = {
    casting_deadline: { color: '#ef4444', emoji: '🔴', label: 'Fecha límite casting' },
    opcionado_ppm: { color: '#f97316', emoji: '🟠', label: 'PPM' },
    callback: { color: '#eab308', emoji: '🟡', label: 'Callback' },
    wardrobe_fitting: { color: '#3b82f6', emoji: '🔵', label: 'Fitting' },
    shooting_day: { color: '#22c55e', emoji: '🟢', label: 'Trabajo' },
    travel_day: { color: '#8b5cf6', emoji: '✈️', label: 'Viaje' },
    finance_due: { color: '#d946ef', emoji: '🟣', label: 'Límite de cobro' },
    rehearsal: { color: '#ffffff', emoji: '⚪', label: 'Ensayo' },
}

// Grupos de filtros — cada grupo incluye los event_types que cubre
const FILTER_GROUPS: { key: string; label: string; color: string; types: EventType[] }[] = [
    { key: 'castings', label: 'Castings', color: '#ef4444', types: ['casting_deadline'] },
    { key: 'callbacks', label: 'Callbacks', color: '#eab308', types: ['callback'] },
    { key: 'ppm', label: 'PPM', color: '#f97316', types: ['opcionado_ppm'] },
    { key: 'fittings', label: 'Fitting', color: '#3b82f6', types: ['wardrobe_fitting'] },
    { key: 'rodajes', label: 'Trabajo', color: '#22c55e', types: ['shooting_day'] },
    { key: 'travel', label: 'Viaje', color: '#8b5cf6', types: ['travel_day'] },
    { key: 'finanzas', label: 'Finanzas', color: '#d946ef', types: ['finance_due'] },
    { key: 'ensayos', label: 'Ensayos', color: '#ffffff', types: ['rehearsal'] },
]

// ─── Componente principal ────────────────────────────────────────────────────
export default function DashboardCalendar() {
    const { data: events, loading, remove } = useCalendarEvents()
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDay, setSelectedDay] = useState<Date | null>(null)
    const [showPicker, setShowPicker] = useState(false)
    const [pickerYear, setPickerYear] = useState(getYear(new Date()))
    const [manualModalOpen, setManualModalOpen] = useState(false)
    const { user } = useAuth()
    const pickerRef = useRef<HTMLDivElement>(null)

    // All filters active by default
    const [activeFilters, setActiveFilters] = useState<Set<string>>(
        new Set(FILTER_GROUPS.map(g => g.key))
    )

    // Close picker on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Calendar grid
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    // Active event types derived from active filter groups
    const activeTypes = useMemo(() => {
        const types = new Set<EventType>()
        FILTER_GROUPS.forEach(g => {
            if (activeFilters.has(g.key)) g.types.forEach(t => types.add(t))
        })
        return types
    }, [activeFilters])

    const filteredEvents = useMemo(() =>
        events.filter(e => activeTypes.has(e.event_type)), [events, activeTypes])

    const getEventsForDay = (day: Date) =>
        filteredEvents.filter(e => {
            try {
                const start = parseISO(e.event_date_start)
                const end = e.event_date_end ? parseISO(e.event_date_end) : start
                // Normalizar a medianoche para comparación robusta
                const d = new Date(day.getFullYear(), day.getMonth(), day.getDate())
                const s = new Date(start.getFullYear(), start.getMonth(), start.getDate())
                const e_date = new Date(end.getFullYear(), end.getMonth(), end.getDate())
                return d >= s && d <= e_date
            }
            catch { return false }
        })

    const toggleFilter = (key: string) => {
        const next = new Set(activeFilters)
        if (next.has(key)) next.delete(key)
        else next.add(key)
        setActiveFilters(next)
    }

    // Navigation
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
    const goToMonth = (month: number) => {
        setCurrentMonth(setMonth(setYear(currentMonth, pickerYear), month))
        setShowPicker(false)
    }
    const goToday = () => { setCurrentMonth(new Date()); setPickerYear(getYear(new Date())) }

    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    const curMonth = getMonth(currentMonth)
    const curYear = getYear(currentMonth)

    return (
        <div className="card" style={{ padding: '24px' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <CalendarIcon size={18} color="var(--accent)" />
                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Calendario</h3>
                    {loading && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>Cargando…</span>}
                </div>

                <button
                    onClick={() => setManualModalOpen(true)}
                    style={{
                        height: 32, padding: '0 12px', borderRadius: '8px',
                        border: '1px solid var(--accent)', background: 'var(--accent)',
                        fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                        color: 'white', transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    <Plus size={14} />
                    Evento
                </button>
            </div>

                {/* Nav controles */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }} ref={pickerRef}>
                    {/* Prev */}
                    <button
                        onClick={prevMonth}
                        style={{
                            width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border)',
                            background: 'var(--bg-card-light)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer',
                            transition: 'all 0.15s ease', color: 'var(--text-primary)'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                        <ChevronLeft size={14} />
                    </button>

                    {/* Month/Year Button that opens picker */}
                    <button
                        onClick={() => { setShowPicker(v => !v); setPickerYear(curYear) }}
                        style={{
                            height: 32, padding: '0 14px', borderRadius: '8px',
                            border: `1px solid ${showPicker ? 'var(--accent)' : 'var(--border)'}`,
                            background: showPicker ? 'rgba(124,106,247,0.1)' : 'var(--bg-card-light)',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            cursor: 'pointer', transition: 'all 0.15s ease',
                            color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                            textTransform: 'capitalize', minWidth: '130px', justifyContent: 'center'
                        }}
                    >
                        {format(currentMonth, 'MMMM yyyy', { locale: es })}
                        <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: showPicker ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {/* Next */}
                    <button
                        onClick={nextMonth}
                        style={{
                            width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border)',
                            background: 'var(--bg-card-light)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer',
                            transition: 'all 0.15s ease', color: 'var(--text-primary)'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                        <ChevronRight size={14} />
                    </button>

                    {/* Hoy */}
                    <button
                        onClick={goToday}
                        style={{
                            height: 32, padding: '0 12px', borderRadius: '8px',
                            border: '1px solid var(--border)', background: 'var(--bg-card-light)',
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                            color: 'var(--text-secondary)', transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-light)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                        Hoy
                    </button>

                    {/* ── Picker popup ── */}
                    {showPicker && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            borderRadius: '14px', padding: '16px', zIndex: 200,
                            width: '260px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            animation: 'scaleUp 0.15s ease-out'
                        }}>
                            {/* Year nav */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <button
                                    onClick={() => setPickerYear(y => y - 1)}
                                    style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
                                >
                                    <ChevronLeft size={12} />
                                </button>
                                <span style={{ fontWeight: 700, fontSize: '15px' }}>{pickerYear}</span>
                                <button
                                    onClick={() => setPickerYear(y => y + 1)}
                                    style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-card-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}
                                >
                                    <ChevronRight size={12} />
                                </button>
                            </div>
                            {/* Month grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' }}>
                                {months.map((m, i) => {
                                    const isActive = i === curMonth && pickerYear === curYear
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => goToMonth(i)}
                                            style={{
                                                padding: '6px 0', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                                cursor: 'pointer', transition: 'all 0.15s',
                                                border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                                                background: isActive ? 'rgba(124,106,247,0.2)' : 'var(--bg-card-light)',
                                                color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)'
                                            }}
                                        >
                                            {m}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Filtros (todos los tipos) ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {FILTER_GROUPS.map(g => (
                    <FilterChip
                        key={g.key}
                        active={activeFilters.has(g.key)}
                        onClick={() => toggleFilter(g.key)}
                        color={g.color}
                        label={g.label}
                    />
                ))}
            </div>

            {/* ── Grid de días ── */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
                gap: '1px', background: 'var(--border-light)',
                borderRadius: '10px', overflow: 'hidden',
                border: '1px solid var(--border-light)'
            }}>
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} style={{
                        background: 'var(--bg-card)', padding: '10px', textAlign: 'center',
                        fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase'
                    }}>{d}</div>
                ))}

                {calendarDays.map((day, idx) => {
                    const dayEvents = getEventsForDay(day)
                    const inMonth = isSameMonth(day, monthStart)
                    const today = isToday(day)

                    return (
                        <div
                            key={idx}
                            onClick={() => setSelectedDay(day)}
                            style={{
                                background: today ? 'rgba(124,106,247,0.06)' : 'var(--bg-card)',
                                minHeight: '76px', padding: '8px',
                                cursor: 'pointer', opacity: inMonth ? 1 : 0.28,
                                transition: 'background 0.15s',
                                outline: today ? '2px solid var(--accent)' : 'none',
                                outlineOffset: '-1px',
                                position: 'relative', zIndex: today ? 1 : 0
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = today ? 'rgba(124,106,247,0.1)' : 'rgba(255,255,255,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = today ? 'rgba(124,106,247,0.06)' : 'var(--bg-card)'}
                        >
                            {/* Número del día */}
                            <div style={{
                                fontSize: '12px', fontWeight: today ? 800 : 500, marginBottom: '4px',
                                color: today ? 'var(--accent-light)' : 'var(--text-primary)',
                            }}>
                                {format(day, 'd')}
                            </div>

                            {/* Puntos de eventos */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {dayEvents.slice(0, 4).map((e, i) => (
                                    <div key={e.id ?? i} style={{
                                        width: '100%', height: '4px', borderRadius: '3px',
                                        background: e.is_manual && e.custom_color ? e.custom_color : (EVENT_CONFIG[e.event_type]?.color ?? '#888')
                                    }} title={e.title} />
                                ))}
                                {dayEvents.length > 4 && (
                                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                        +{dayEvents.length - 4}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── Leyenda ── */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
                {FILTER_GROUPS.map(g => (
                    <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: activeFilters.has(g.key) ? 1 : 0.3, transition: 'opacity 0.2s' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: g.color, display: 'inline-block' }} />
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{g.label}</span>
                    </div>
                ))}
            </div>

            {/* ── Modal de Día ── */}
            {selectedDay && (
                <DayEventsModal
                    day={selectedDay}
                    events={getEventsForDay(selectedDay)}
                    onClose={() => setSelectedDay(null)}
                    onRemove={remove}
                />
            )}

            {/* ── Modal de Evento Manual ── */}
            {manualModalOpen && user && (
                <ManualEventModal 
                    onClose={() => setManualModalOpen(false)}
                />
            )}
        </div>
    )
}

// ── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: string; label: string }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                padding: '4px 10px', borderRadius: '20px',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${active ? color : 'var(--border)'}`,
                background: active ? `${color}20` : 'transparent',
                color: active ? color : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
            }}
        >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: active ? color : 'var(--text-secondary)', transition: 'background 0.15s' }} />
            {label}
        </button>
    )
}

// ── DayEventsModal ────────────────────────────────────────────────────────────
function DayEventsModal({ day, events, onClose, onRemove }: { day: Date; events: CalendarEvent[]; onClose: () => void; onRemove: (id: string) => Promise<void> }) {
    const [deleting, setDeleting] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Seguro que quieres eliminar este evento manualmente?')) return
        setDeleting(id)
        try {
            await onRemove(id)
        } catch (err) {
            console.error(err)
            alert('Error al borrar el evento')
        } finally {
            setDeleting(null)
        }
    }
    return (
        <div
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', zIndex: 1000, padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--bg-card)', borderRadius: '18px',
                    width: '100%', maxWidth: '420px',
                    border: '1px solid var(--border)', overflow: 'hidden',
                    animation: 'scaleUp 0.2s ease-out', boxShadow: '0 16px 48px rgba(0,0,0,0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {format(day, 'EEEE', { locale: es })}
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
                            {format(day, 'd MMMM yyyy', { locale: es })}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: '8px', border: '1px solid var(--border)',
                            background: 'var(--bg-card-light)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Events list */}
                <div style={{ padding: '16px', maxHeight: '440px', overflowY: 'auto' }}>
                    {events.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                            <Info size={28} style={{ opacity: 0.2, marginBottom: '10px' }} />
                            <p style={{ fontSize: '13px' }}>No hay eventos para este día</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {events.map((e, i) => {
                                const cfg = EVENT_CONFIG[e.event_type]
                                return (
                                    <div key={e.id ?? i} style={{
                                        padding: '12px 14px', borderRadius: '12px',
                                        background: e.is_manual && e.custom_color ? `${e.custom_color}08` : `${cfg.color}08`,
                                        border: `1px solid ${e.is_manual && e.custom_color ? e.custom_color + '30' : cfg.color + '30'}`,
                                        borderLeft: `4px solid ${e.is_manual && e.custom_color ? e.custom_color : cfg.color}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 700, color: e.is_manual && e.custom_color ? e.custom_color : cfg.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {e.is_manual ? '📝 MANUAL' : `${cfg.emoji} ${cfg.label}`}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{e.title}</div>
                                            <button 
                                                onClick={() => handleDelete(e.id)}
                                                disabled={!!deleting}
                                                style={{ 
                                                    background: 'none', border: 'none', padding: '4px', 
                                                    cursor: 'pointer', color: 'var(--danger)', opacity: 0.6,
                                                    transition: 'opacity 0.2s'
                                                }}
                                                onMouseEnter={el => el.currentTarget.style.opacity = '1'}
                                                onMouseLeave={el => el.currentTarget.style.opacity = '0.6'}
                                                title="Eliminar evento"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                        {/* Hora / Todo el día */}
                                        {!e.is_all_day && e.event_time && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={10} />
                                                {e.event_time} {e.event_time_end ? ` - ${e.event_time_end}` : ''}
                                            </div>
                                        )}
                                        {e.is_all_day && (
                                            <div style={{ fontSize: '10px', color: 'var(--accent-light)', fontWeight: 600, marginBottom: '4px' }}>
                                                Todo el día
                                            </div>
                                        )}
                                        {e.notes && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{e.notes}</div>}

                                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {e.related_casting_id && (
                                                <a href={`/castings?id=${e.related_casting_id}`} style={{
                                                    fontSize: '10px', background: 'var(--bg-card-light)',
                                                    padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                                                    color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px',
                                                    textDecoration: 'none', fontWeight: 600
                                                }}>
                                                    <ExternalLink size={10} /> Ver Casting
                                                </a>
                                            )}
                                            {e.related_finance_id && (
                                                <a href={`/finanzas?id=${e.related_finance_id}`} style={{
                                                    fontSize: '10px', background: 'var(--bg-card-light)',
                                                    padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                                                    color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px',
                                                    textDecoration: 'none', fontWeight: 600
                                                }}>
                                                    <ExternalLink size={10} /> Ver Finanzas
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
