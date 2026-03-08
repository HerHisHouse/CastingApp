'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard, Film, Clapperboard, DollarSign,
    Users, BarChart3, Star, Menu, X
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
    const [isOpen, setIsOpen] = useState(false)

    // Close on navigation
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

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
        </>
    )
}
