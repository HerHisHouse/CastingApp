'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard, Film, Clapperboard, DollarSign,
    Users, BarChart3, Star, Menu, X, Settings, LogOut,
    Bell, Info, AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { signOut } from '@/lib/auth'

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/castings', label: 'Castings', icon: Film },
    { href: '/proyectos', label: 'Proyectos', icon: Clapperboard },
    { href: '/finanzas', label: 'Finanzas', icon: DollarSign },
    { href: '/contactos', label: 'Contactos', icon: Users },
    { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
]

export default function Sidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const [isOpen, setIsOpen] = useState(false)
    const [showNotes, setShowNotes] = useState(false)
    const { username, avatarUrl, user } = useAuth()
    const { notificaciones, hasUnread, markAllRead } = useNotifications()
    const notesRef = useRef<HTMLDivElement>(null)

    // Close on navigation
    useEffect(() => {
        setIsOpen(false)
        setShowNotes(false)
    }, [pathname])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    // Close notifications on click outside
    useEffect(() => {
        if (!showNotes) return
        const handler = (e: MouseEvent) => {
            if (notesRef.current && !notesRef.current.contains(e.target as Node)) {
                setShowNotes(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [showNotes])

    const handleSignOut = async () => {
        await signOut()
        router.replace('/login')
    }

    const avatarLetter = (username || user?.email || '?')[0].toUpperCase()

    return (
        <>
            <button className="mobile-nav-btn" onClick={() => setIsOpen(true)}>
                <Menu size={20} />
            </button>

            {isOpen && <div className="mobile-overlay" onClick={() => setIsOpen(false)} />}

            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Star size={18} color="#9d8fff" fill="#9d8fff" />
                            <h1>CastingApp</h1>
                        </div>
                        <p>Gestiona Castings y trabajos</p>
                    </div>
                    <button className="mobile-close-btn" onClick={() => setIsOpen(false)}>
                        <X size={20} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <span className="nav-section-label">Principal</span>
                    {navItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-item ${pathname === href ? 'active' : ''}`}
                        >
                            <Icon size={16} />
                            {label}
                        </Link>
                    ))}

                    <span className="nav-section-label" style={{ marginTop: '8px' }}>Configuración</span>
                    <Link href="/ajustes" className={`nav-item ${pathname === '/ajustes' ? 'active' : ''}`}>
                        <Settings size={16} />
                        Ajustes
                    </Link>
                </nav>

                {/* User info + Notifications */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        {/* Avatar Circle with Bell */}
                        <div
                            onClick={() => { setShowNotes(!showNotes); if (!showNotes) markAllRead() }}
                            style={{ position: 'relative', cursor: 'pointer' }}
                        >
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: avatarUrl ? 'transparent' : 'var(--accent-dim)',
                                border: '2px solid var(--accent)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '16px', fontWeight: 700, color: 'var(--accent-light)',
                                overflow: 'hidden', flexShrink: 0,
                                transition: 'transform 0.2s',
                            }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                {avatarUrl
                                    ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : avatarLetter}
                            </div>
                            {/* Notification Dot */}
                            {hasUnread && (
                                <div style={{
                                    position: 'absolute', top: -2, right: -2,
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: 'var(--danger)', border: '2px solid var(--bg-card)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Bell size={8} color="white" fill="white" />
                                </div>
                            )}
                        </div>

                        <div style={{ overflow: 'hidden', flex: 1 }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {username || 'Usuario'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {user?.email}
                            </div>
                        </div>
                    </div>

                    {/* Notification Center Popover */}
                    {showNotes && (
                        <div
                            ref={notesRef}
                            style={{
                                position: 'absolute', bottom: '100%', left: '16px', right: '16px',
                                marginBottom: '12px', background: 'var(--bg-card)',
                                border: '1px solid var(--border-light)', borderRadius: '14px',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                zIndex: 1000, overflow: 'hidden',
                                animation: 'slideUp 0.2s ease-out',
                                minWidth: '240px'
                            }}
                        >
                            <div style={{ padding: '14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '13px' }}>Centro de Notificaciones</span>
                                <button onClick={() => setShowNotes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                                    <X size={14} />
                                </button>
                            </div>
                            <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '8px' }}>
                                {notificaciones.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                        No tienes avisos pendientes
                                    </div>
                                ) : (
                                    notificaciones.map(n => (
                                        <div key={n.id} style={{
                                            padding: '10px', borderRadius: '8px', marginBottom: '4px',
                                            background: 'rgba(255,255,255,0.03)', border: '1px solid transparent',
                                            display: 'flex', gap: '10px'
                                        }}>
                                            <div style={{ marginTop: '2px' }}>
                                                {n.tipo === 'alerta' ? <AlertTriangle size={14} color="var(--warning)" /> : <Info size={14} color="var(--info)" />}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{n.titulo}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.subtitulo}</div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleSignOut}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '7px',
                            width: '100%', background: 'none',
                            border: '1px solid var(--border)', borderRadius: '7px',
                            padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger)'
                                ; (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'
                                ; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'
                        }}
                    >
                        <LogOut size={13} />
                        Cerrar sesión
                    </button>
                </div>
            </aside>
        </>
    )
}
