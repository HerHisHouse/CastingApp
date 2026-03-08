'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Film, Clapperboard, DollarSign,
    Users, BarChart3, Star
} from 'lucide-react'

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

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Star size={18} color="#9d8fff" fill="#9d8fff" />
                    <h1>CastingInfo</h1>
                </div>
                <p>Gestión de Carrera</p>
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
            </nav>

            <div style={{
                padding: '16px',
                borderTop: '1px solid var(--border)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textAlign: 'center'
            }}>
                <p style={{ opacity: 0.5 }}>v1.0.0 · Personal</p>
            </div>
        </aside>
    )
}
