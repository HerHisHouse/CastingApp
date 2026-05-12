'use client'
import { useState, useMemo } from 'react'
import { useContactos } from '@/hooks/useData'
import ContactoFormModal from '@/components/ContactoFormModal'
import { LoadingSkeleton, EmptyState } from '@/components/ui'
import { Contacto, TipoContacto } from '@/lib/supabase'
import { Users, Plus, Search, Pencil, Trash2, Mail, Phone, Building2 } from 'lucide-react'

const tipoContactoLabels: Record<TipoContacto, string> = {
    director_casting: 'Director de Casting',
    representante: 'Representante',
    productor: 'Productor',
    director: 'Director',
}

const tipoContactoColors: Record<TipoContacto, { bg: string, color: string }> = {
    director_casting: { bg: 'rgba(124,106,247,0.12)', color: '#9d8fff' },
    representante: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
    productor: { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
    director: { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' },
}

function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export default function ContactosPage() {
    const { data, loading, create, update, remove } = useContactos()
    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<Contacto | null>(null)
    const [search, setSearch] = useState('')
    const [tipoFilter, setTipoFilter] = useState('')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    const filtered = useMemo(() =>
        data.filter(c => {
            const q = search.toLowerCase()
            const matchSearch = !q || c.nombre.toLowerCase().includes(q)
                || (c.empresa?.toLowerCase().includes(q) ?? false)
                || (c.email?.toLowerCase().includes(q) ?? false)
            const matchTipo = !tipoFilter || c.tipo_contacto === tipoFilter
            return matchSearch && matchTipo
        }), [data, search, tipoFilter])

    const handleSave = async (form: Omit<Contacto, 'id' | 'created_at' | 'user_id'>) => {
        if (editing) await update(editing.id, form)
        else await create(form)
        setModalOpen(false)
        setEditing(null)
    }

    const openEdit = (c: Contacto) => { setEditing(c); setModalOpen(true) }
    const openNew = () => { setEditing(null); setModalOpen(true) }

    return (
        <>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
                <div>
                    <h2 style={{ margin: 0 }}>Contactos</h2>
                    <p style={{ margin: 0 }}>{data.length} contactos en tu red profesional</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={openNew}>
                        <Plus size={14} /> Nuevo Contacto
                    </button>
                </div>
            </div>

            <div className="page-body">
                <div className="action-row">
                    <div className="search-bar" style={{ flex: 1, maxWidth: 320 }}>
                        <Search size={14} color="var(--text-secondary)" />
                        <input
                            placeholder="Buscar contactos..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="filter-pills">
                        {[{ val: '', label: 'Todos' },
                        { val: 'director_casting', label: 'Dir. Casting' },
                        { val: 'representante', label: 'Representante' },
                        { val: 'productor', label: 'Productor' },
                        { val: 'director', label: 'Director' }
                        ].map(f => (
                            <button key={f.val} className={`filter-pill ${tipoFilter === f.val ? 'active' : ''}`} onClick={() => setTipoFilter(f.val)}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? <LoadingSkeleton rows={6} /> : filtered.length === 0 ? (
                    <EmptyState
                        icon={<Users size={48} />}
                        title={(() => {
                            if (data.length === 0) return "No hay contactos"
                            if (tipoFilter === 'director_casting') return "No hay directores de casting"
                            if (tipoFilter === 'representante') return "No hay representantes"
                            if (tipoFilter === 'productor') return "No hay productores"
                            if (tipoFilter === 'director') return "No hay directores"
                            return "No se encontraron contactos"
                        })()}
                        description={data.length === 0 
                            ? "Construye tu red de profesionales: directores de casting, representantes, productores..." 
                            : "Actualmente no hay contactos que coincidan con este filtro."
                        }
                        action={data.length === 0 ? (
                            <button 
                                className="btn btn-primary" 
                                onClick={openNew}
                                style={{ padding: '8px 16px', fontSize: '13px', margin: '0 auto' }}
                            >
                                <Plus size={16} /> <span>Nuevo Contacto</span>
                            </button>
                        ) : undefined}
                    />
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                        {filtered.map(c => {
                            const colors = tipoContactoColors[c.tipo_contacto]
                            return (
                                <div key={c.id} className="card">
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                                        {/* Avatar */}
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: colors.bg,
                                            border: `1px solid ${colors.color}40`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 700, fontSize: '14px', color: colors.color,
                                            flexShrink: 0
                                        }}>
                                            {getInitials(c.nombre)}
                                        </div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                                                {c.nombre}
                                            </div>
                                            <span style={{
                                                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px',
                                                background: colors.bg, color: colors.color
                                            }}>
                                                {tipoContactoLabels[c.tipo_contacto]}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                                            <button className="btn btn-icon btn-ghost" onClick={() => openEdit(c)}><Pencil size={12} /></button>
                                            <button className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(c.id)}><Trash2 size={12} /></button>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                        {c.empresa && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                                                <Building2 size={11} />
                                                <span>{c.empresa}</span>
                                            </div>
                                        )}
                                        {c.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                                                <Mail size={11} color="var(--text-secondary)" />
                                                <a href={`mailto:${c.email}`} style={{ color: 'var(--accent-light)', textDecoration: 'none' }}>{c.email}</a>
                                            </div>
                                        )}
                                        {c.telefono && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                                                <Phone size={11} color="var(--text-secondary)" />
                                                <a href={`tel:${c.telefono}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{c.telefono}</a>
                                            </div>
                                        )}
                                    </div>

                                    {c.notas && (
                                        <p style={{
                                            marginTop: '10px', fontSize: '11.5px', color: 'var(--text-secondary)',
                                            borderTop: '1px solid var(--border)', paddingTop: '8px',
                                            overflow: 'hidden', display: '-webkit-box',
                                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                                        }}>
                                            {c.notas}
                                        </p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <ContactoFormModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditing(null) }}
                onSave={handleSave}
                initial={editing}
            />

            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h3>Confirmar eliminación</h3></div>
                        <div className="modal-body"><p style={{ color: 'var(--text-secondary)' }}>¿Eliminar este contacto?</p></div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                            <button className="btn btn-danger" onClick={async () => { await remove(deleteConfirm); setDeleteConfirm(null) }}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
