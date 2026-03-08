import { Casting, TipoProyecto, TipoCasting, EstadoCasting, FuenteCasting } from '@/lib/supabase'

const estadoLabels: Record<EstadoCasting, string> = {
    enviado: 'Enviado', callback: 'Callback', opcionado: 'Opcionado',
    seleccionado: 'Seleccionado', descartado: 'Descartado'
}

const tipoProyectoLabels: Record<TipoProyecto, string> = {
    serie: 'Serie', cine: 'Cine', tv: 'TV', publicidad: 'Publicidad',
    teatro: 'Teatro', evento: 'Evento', doblaje: 'Doblaje'
}

const tipoCastingLabels: Record<TipoCasting, string> = {
    self_tape: 'Self Tape',
    presencial: 'Presencial',
    callback_presencial: 'Callback Presencial',
    callback_zoom: 'Callback Zoom',
}

const fuenteLabels: Record<FuenteCasting, string> = {
    representante: 'Representante', director_casting: 'Director de Casting',
    autocasting: 'Autocasting', contacto: 'Contacto', agencia: 'Agencia'
}

export const ESTADOS = Object.entries(estadoLabels) as [EstadoCasting, string][]
export const TIPOS_PROYECTO = Object.entries(tipoProyectoLabels) as [TipoProyecto, string][]
export const TIPOS_CASTING = Object.entries(tipoCastingLabels) as [TipoCasting, string][]
export const FUENTES = Object.entries(fuenteLabels) as [FuenteCasting, string][]

export function BadgeEstado({ estado }: { estado: EstadoCasting }) {
    return <span className={`badge badge-${estado}`}>{estadoLabels[estado]}</span>
}

export function BadgeTipoProyecto({ tipo }: { tipo: TipoProyecto }) {
    return <span className={`badge badge-${tipo}`}>{tipoProyectoLabels[tipo]}</span>
}

export function BadgeTipoCasting({ tipo }: { tipo: TipoCasting }) {
    const labels: Record<TipoCasting, string> = {
        self_tape: 'Self Tape',
        presencial: 'Presencial',
        callback_presencial: 'CB Presencial',
        callback_zoom: 'CB Zoom',
    }
    const colors: Record<TipoCasting, { bg: string, color: string }> = {
        self_tape: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' },
        presencial: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' },
        callback_presencial: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
        callback_zoom: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
    }
    const c = colors[tipo] ?? colors.presencial
    return (
        <span className="badge" style={{ background: c.bg, color: c.color }}>
            {labels[tipo] ?? tipo}
        </span>
    )
}

export function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
}

// Empty state component
export function EmptyState({ icon, title, description, action }: {
    icon: React.ReactNode, title: string, description: string, action?: React.ReactNode
}) {
    return (
        <div className="empty-state">
            {icon}
            <h3>{title}</h3>
            <p style={{ marginBottom: action ? '16px' : 0 }}>{description}</p>
            {action}
        </div>
    )
}

// Loading skeleton
export function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div style={{ padding: '20px' }}>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} style={{
                    height: '44px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    animation: 'pulse 1.5s ease infinite',
                }} />
            ))}
        </div>
    )
}
