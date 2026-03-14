'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useCastings, useFinanzas } from '@/hooks/useData'
import { Casting, Finanza } from '@/lib/supabase'

export interface Notificacion {
    id: string
    titulo: string
    subtitulo: string
    tipo: 'alerta' | 'info' | 'danger'
    fecha: string
    referenciaId: string
}

interface NotificationContextValue {
    notificaciones: Notificacion[]
    hasUnread: boolean
    markAllRead: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
    notificaciones: [],
    hasUnread: false,
    markAllRead: () => { },
})

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { data: castings } = useCastings()
    const { data: finanzas } = useFinanzas()
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
    const [hasUnread, setHasUnread] = useState(false)
    const [lastRead, setLastRead] = useState<number>(0)

    useEffect(() => {
        const now = new Date()
        const newNotes: Notificacion[] = []

        // 1. Notificaciones de Castings
        castings.forEach(c => {
            if (c.estado !== 'pendiente' || !c.fecha_casting) return

            const deadline = new Date(c.fecha_casting + 'T23:59:59')
            const diffH = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)

            if (diffH > 0 && diffH <= 48) {
                let titulo = ''
                if (diffH <= 12) titulo = 'Entrega inminente (12h)'
                else if (diffH <= 24) titulo = 'Entrega mañana (24h)'
                else titulo = 'Entrega próximamente (48h)'

                newNotes.push({
                    id: `casting-${c.id}`,
                    titulo,
                    subtitulo: `Casting "${c.proyecto}" para el personaje ${c.personaje}`,
                    tipo: 'alerta',
                    fecha: now.toISOString(),
                    referenciaId: c.id
                })
            }
        })

        // 2. Notificaciones de Finanzas (Cobros)
        finanzas.forEach(f => {
            if (f.estado_pago === 'pagado' || !f.fecha_limite_cobro) return

            const deadline = new Date(f.fecha_limite_cobro + 'T23:59:59')
            const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

            if (diffDays <= 0) {
                newNotes.push({
                    id: `finanza-vencida-${f.id}`,
                    titulo: '¡Plazo de cobro vencido!',
                    subtitulo: `El trabajo "${f.proyecto_nombre}" ha superado la fecha límite de reclamación.`,
                    tipo: 'danger',
                    fecha: now.toISOString(),
                    referenciaId: f.id
                })
            } else if (diffDays <= 3) {
                newNotes.push({
                    id: `finanza-proxima-${f.id}`,
                    titulo: 'Plazo de cobro próximo (3 días)',
                    subtitulo: `Faltan 3 días para reclamar el pago de "${f.proyecto_nombre}".`,
                    tipo: 'alerta',
                    fecha: now.toISOString(),
                    referenciaId: f.id
                })
            }
        })

        // Sort by ID to keep order somewhat stable
        const sorted = newNotes.sort((a, b) => a.id.localeCompare(b.id))
        setNotificaciones(sorted)

        if (sorted.length > 0) {
            setHasUnread(true)
        } else {
            setHasUnread(false)
        }
    }, [castings, finanzas])

    const markAllRead = () => {
        setHasUnread(false)
        setLastRead(Date.now())
    }

    return (
        <NotificationContext.Provider value={{ notificaciones, hasUnread, markAllRead }}>
            {children}
        </NotificationContext.Provider>
    )
}

export const useNotifications = () => useContext(NotificationContext)
