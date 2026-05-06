'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { Clapperboard, Film, DollarSign, BarChart2, Calendar, Bell, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import CastingFormModal from '@/components/CastingFormModal'
import ProyectoFormModal from '@/components/ProyectoFormModal'
import { useCastings, useProyectos } from '@/hooks/useData'

export default function OnboardingPage() {
    const { user, userProfile, refresh } = useAuth()
    const router = useRouter()
    
    // Default to step 1, but sync with DB if available
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(true)

    // Form states
    const [artisticName, setArtisticName] = useState('')
    const [artistType, setArtistType] = useState('actor')
    const [defaultAgency, setDefaultAgency] = useState('')
    const [defaultCommission, setDefaultCommission] = useState('')

    // Modals
    const [castingModalOpen, setCastingModalOpen] = useState(false)
    const [proyectoModalOpen, setProyectoModalOpen] = useState(false)
    
    const { create: createCasting } = useCastings()
    const { create: createProyecto } = useProyectos()

    useEffect(() => {
        if (userProfile && !loading) {
            if (userProfile.has_completed_onboarding) {
                router.replace('/')
            } else if (userProfile.onboarding_step > 1) {
                setStep(userProfile.onboarding_step)
                setArtisticName(userProfile.artistic_name || '')
                setArtistType(userProfile.artist_type || 'actor')
                setDefaultAgency(userProfile.default_agency || '')
                setDefaultCommission(userProfile.default_commission_percentage?.toString() || '')
            }
        }
        setLoading(false)
    }, [userProfile, router])

    const saveStep = async (nextStep: number, isComplete: boolean = false) => {
        console.log(`Guardando paso: ${nextStep}, Completado: ${isComplete}`);
        if (!user) return
        
        const updates: any = {
            onboarding_step: nextStep,
            has_completed_onboarding: isComplete
        }

        if (step === 2) {
            updates.artistic_name = artisticName
            updates.artist_type = artistType
            updates.default_agency = defaultAgency
            updates.default_commission_percentage = defaultCommission ? parseFloat(defaultCommission) : null
        }

        // Optimistic local update to prevent hanging
        if (!isComplete) {
            setStep(nextStep);
            window.scrollTo(0, 0);
        }

        try {
            await supabase.from('user_profiles').update(updates).eq('id', user.id)
            if (isComplete) {
                await refresh()
                router.replace('/')
            }
        } catch (error) {
            console.error("Error al guardar en Supabase:", error)
        }
    }

    const handleSkip = () => {
        saveStep(6, true)
    }

    const handleSaveCasting = async (form: any) => {
        await createCasting(form)
        setCastingModalOpen(false)
        await saveStep(6, true)
        // You could trigger a global toast here if you have a toast system
    }

    const handleSaveProyecto = async (form: any) => {
        await createProyecto(form)
        setProyectoModalOpen(false)
        await saveStep(6, true)
    }

    if (loading) return null

    return (
        <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* Progress Indicator */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Paso {step} de 5
                </span>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: s <= step ? '#7c6af7' : '#3d3d55',
                                transition: 'all 0.3s'
                            }} />
                            {s < 5 && (
                                <div style={{
                                    width: '30px', height: '2px', marginLeft: '12px',
                                    background: s < step ? '#7c6af7' : '#3d3d55',
                                    transition: 'all 0.3s'
                                }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* STEP 1: WELCOME */}
            {step === 1 && (
                <div style={{ textAlign: 'center', animation: 'slideUp 0.4s ease-out' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="80" height="80">
                            <rect width="40" height="40" rx="9" fill="#12101e"/>
                            <polygon points="10,8 10,32 30,20" fill="#7c6af7" opacity="0.18"/>
                            <polygon points="10,8 10,20 20,14" fill="#7c6af7"/>
                            <polygon points="10,20 10,32 20,26" fill="#a78bfa"/>
                            <polygon points="20,14 20,26 30,20" fill="#534AB7"/>
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '32px', marginBottom: '12px', letterSpacing: '-0.5px' }}>Te doy la bienvenida a Caché</h1>
                    <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '48px' }}>Gestiona tu carrera artística</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginBottom: '48px' }}>
                        
                        <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', textAlign: 'left' }}>
                            <div style={{ background: 'rgba(124,106,247,0.1)', padding: '12px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🎬</span>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Registra castings</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Cada convocatoria, con detalles y plazos</p>
                            </div>
                        </div>

                        <div style={{ height: '24px', width: '2px', background: 'linear-gradient(to bottom, rgba(124,106,247,0.5), transparent)' }} />

                        <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', textAlign: 'left' }}>
                            <div style={{ background: 'rgba(52,211,153,0.1)', padding: '12px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '24px' }}>🎥</span>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Conviértelos en proyectos</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Cuando te seleccionan, pasa a trabajo confirmado</p>
                            </div>
                        </div>

                        <div style={{ height: '24px', width: '2px', background: 'linear-gradient(to bottom, rgba(52,211,153,0.5), transparent)' }} />

                        <div className="card" style={{ width: '100%', maxWidth: '400px', display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', textAlign: 'left' }}>
                            <div style={{ background: 'rgba(250,204,21,0.1)', padding: '12px', borderRadius: '12px' }}>
                                <span style={{ fontSize: '24px' }}>💰</span>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>Controla tus finanzas</h3>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Facturación, cobros, comisiones y derechos</p>
                            </div>
                        </div>

                    </div>

                    <button className="btn btn-primary" style={{ width: '100%', maxWidth: '400px', justifyContent: 'center', padding: '14px', fontSize: '16px' }} onClick={() => saveStep(2)}>
                        Siguiente <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* STEP 2: PROFILE */}
            {step === 2 && (
                <div style={{ animation: 'slideUp 0.4s ease-out', maxWidth: '480px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '28px', marginBottom: '8px', letterSpacing: '-0.5px' }}>Personaliza tu perfil</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Esto nos ayudará a adaptar la app a tu trabajo</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
                        <div className="form-group">
                            <label className="form-label">Nombre artístico *</label>
                            <input type="text" className="form-input" placeholder="Ej: Alex Díaz" value={artisticName} onChange={e => setArtisticName(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">¿Qué haces? *</label>
                            <select className="form-select" value={artistType} onChange={e => setArtistType(e.target.value)}>
                                <option value="actor">Actor</option>
                                <option value="actriz">Actriz</option>
                                <option value="bailarin">Bailarín/a</option>
                                <option value="coreografo">Coreógrafo/a</option>
                                <option value="doblaje">Actor/Actriz de doblaje</option>
                                <option value="modelo">Modelo</option>
                                <option value="musico">Intérprete musical</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">¿Tienes agencia? (Opcional)</label>
                            <input type="text" className="form-input" placeholder="Ej: Representa Management" value={defaultAgency} onChange={e => setDefaultAgency(e.target.value)} />
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Puedes dejarlo vacío si trabajas por libre</span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Comisión de agencia (Opcional)</label>
                            <div style={{ position: 'relative' }}>
                                <input type="number" className="form-input" placeholder="Ej: 15" style={{ paddingRight: '32px' }} value={defaultCommission} onChange={e => setDefaultCommission(e.target.value)} />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}>%</span>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Este porcentaje se aplicará por defecto a tus proyectos.</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <button className="btn btn-secondary" onClick={() => saveStep(1)}>
                            <ChevronLeft size={16} /> Atrás
                        </button>
                        <button className="btn btn-primary" disabled={!artisticName} onClick={() => saveStep(3)}>
                            Siguiente <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: DASHBOARD TOUR */}
            {step === 3 && (
                <div style={{ animation: 'slideUp 0.4s ease-out', maxWidth: '520px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '28px', marginBottom: '8px', letterSpacing: '-0.5px' }}>Tu centro de control</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Desde aquí tienes todo a la vista</p>
                    </div>

                    {/* SVG Mockup */}
                    <div style={{ 
                        background: 'var(--bg-card)', border: '1px solid var(--border)', 
                        borderRadius: '16px', padding: '24px', marginBottom: '32px',
                        display: 'flex', flexDirection: 'column', gap: '24px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        {/* Zone 1: KPIs */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(124,106,247,0.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>1</div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}><BarChart2 size={16} color="var(--accent)" /> Resumen rápido</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Castings este mes, trabajos conseguidos e ingresos. Todo de un vistazo.</p>
                            </div>
                        </div>
                        
                        <svg viewBox="0 0 400 60" style={{ width: '100%', height: 'auto', opacity: 0.8 }}>
                            <rect x="0" y="0" width="125" height="50" rx="8" fill="#1c1c28" stroke="#2a2a3d" />
                            <rect x="15" y="15" width="20" height="20" rx="4" fill="rgba(124,106,247,0.2)" />
                            <rect x="45" y="15" width="40" height="6" rx="3" fill="#3a3a4d" />
                            <rect x="45" y="27" width="60" height="8" rx="4" fill="#5f5e7a" />
                            
                            <rect x="135" y="0" width="125" height="50" rx="8" fill="#1c1c28" stroke="#2a2a3d" />
                            <rect x="150" y="15" width="20" height="20" rx="4" fill="rgba(52,211,153,0.2)" />
                            <rect x="180" y="15" width="40" height="6" rx="3" fill="#3a3a4d" />
                            <rect x="180" y="27" width="60" height="8" rx="4" fill="#5f5e7a" />
                            
                            <rect x="270" y="0" width="130" height="50" rx="8" fill="#1c1c28" stroke="#2a2a3d" />
                            <rect x="285" y="15" width="20" height="20" rx="4" fill="rgba(250,204,21,0.2)" />
                            <rect x="315" y="15" width="40" height="6" rx="3" fill="#3a3a4d" />
                            <rect x="315" y="27" width="60" height="8" rx="4" fill="#5f5e7a" />
                        </svg>

                        <div style={{ height: '1px', background: 'var(--border)' }} />

                        {/* Zone 2: Calendar */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(52,211,153,0.2)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>2</div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={16} color="var(--success)" /> Calendario integrado</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Tus rodajes, callbacks, deadlines y viajes sincronizados. Cada evento tiene un color según su tipo.</p>
                            </div>
                        </div>

                        <svg viewBox="0 0 400 120" style={{ width: '100%', height: 'auto', opacity: 0.8 }}>
                            <rect x="0" y="0" width="400" height="120" rx="8" fill="#1c1c28" stroke="#2a2a3d" />
                            {/* Grid simple */}
                            <line x1="57" y1="20" x2="57" y2="100" stroke="#2a2a3d" />
                            <line x1="114" y1="20" x2="114" y2="100" stroke="#2a2a3d" />
                            <line x1="171" y1="20" x2="171" y2="100" stroke="#2a2a3d" />
                            <line x1="228" y1="20" x2="228" y2="100" stroke="#2a2a3d" />
                            <line x1="285" y1="20" x2="285" y2="100" stroke="#2a2a3d" />
                            <line x1="342" y1="20" x2="342" y2="100" stroke="#2a2a3d" />
                            <line x1="0" y1="60" x2="400" y2="60" stroke="#2a2a3d" />
                            
                            {/* Eventos */}
                            <rect x="60" y="30" width="110" height="16" rx="4" fill="rgba(124,106,247,0.8)" />
                            <rect x="230" y="70" width="50" height="16" rx="4" fill="rgba(250,204,21,0.8)" />
                            <rect x="175" y="70" width="165" height="16" rx="4" fill="rgba(52,211,153,0.8)" />
                        </svg>

                        <div style={{ height: '1px', background: 'var(--border)' }} />

                        {/* Zone 3: Upcoming */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(250,204,21,0.2)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>3</div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}><Bell size={16} color="var(--warning)" /> Próximos eventos</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Los eventos más cercanos aparecen destacados para que no se te escape nada.</p>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(124,106,247,0.05)', borderRadius: '8px', border: '1px dashed rgba(124,106,247,0.3)' }}>
                            <Bell size={14} color="var(--accent)" />
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Recibirás notificaciones si las activas en Ajustes</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <button className="btn btn-secondary" onClick={() => saveStep(2)}>
                            <ChevronLeft size={16} /> Atrás
                        </button>
                        <button className="btn btn-primary" onClick={() => saveStep(4)}>
                            Siguiente <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: STATISTICS TOUR */}
            {step === 4 && (
                <div style={{ animation: 'slideUp 0.4s ease-out', maxWidth: '520px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '28px', marginBottom: '8px', letterSpacing: '-0.5px' }}>Mide tu carrera</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Descubre patrones y optimiza tu estrategia</p>
                    </div>

                    {/* SVG Mockup */}
                    <div style={{ 
                        background: 'var(--bg-card)', border: '1px solid var(--border)', 
                        borderRadius: '16px', padding: '24px', marginBottom: '32px',
                        display: 'flex', flexDirection: 'column', gap: '24px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        {/* Zone 1: Funnel */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(124,106,247,0.2)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>1</div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>🎯 Embudo de conversión</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Visualiza cuántos castings se convierten en callbacks y trabajos.</p>
                            </div>
                        </div>

                        <svg viewBox="0 0 400 100" style={{ width: '100%', height: 'auto', opacity: 0.8 }}>
                            <rect x="0" y="0" width="400" height="100" rx="8" fill="#1c1c28" stroke="#2a2a3d" />
                            {/* Funnel bars */}
                            <rect x="50" y="20" width="300" height="16" rx="8" fill="#5f5e7a" />
                            <rect x="100" y="45" width="200" height="16" rx="8" fill="#7c6af7" />
                            <rect x="150" y="70" width="100" height="16" rx="8" fill="#34d399" />
                        </svg>

                        <div style={{ height: '1px', background: 'var(--border)' }} />

                        {/* Zone 2: Evolution */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(52,211,153,0.2)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>2</div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>📈 Evolución mensual</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Compara tu actividad mes a mes: recibidos, opcionados y conseguidos.</p>
                            </div>
                        </div>

                        <svg viewBox="0 0 400 100" style={{ width: '100%', height: 'auto', opacity: 0.8 }}>
                            <rect x="0" y="0" width="400" height="100" rx="8" fill="#1c1c28" stroke="#2a2a3d" />
                            <polyline points="40,80 100,50 160,60 220,30 280,40 340,20" fill="none" stroke="#7c6af7" strokeWidth="3" />
                            <circle cx="40" cy="80" r="4" fill="#7c6af7" />
                            <circle cx="100" cy="50" r="4" fill="#7c6af7" />
                            <circle cx="160" cy="60" r="4" fill="#7c6af7" />
                            <circle cx="220" cy="30" r="4" fill="#7c6af7" />
                            <circle cx="280" cy="40" r="4" fill="#7c6af7" />
                            <circle cx="340" cy="20" r="4" fill="#7c6af7" />
                            <line x1="40" y1="90" x2="360" y2="90" stroke="#2a2a3d" strokeWidth="2" />
                        </svg>
                        
                        <div style={{ height: '1px', background: 'var(--border)' }} />

                        {/* Zone 3: Directors */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(250,204,21,0.2)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}>3</div>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>🎭 Rendimiento por director/a</h4>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Identifica con quién tienes más éxito. Datos estratégicos para ti.</p>
                            </div>
                        </div>

                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            💡 Tip: Úsalo para detectar patrones. ¿Publicidad o cine? ¿Cuáles son tus meses fuertes?
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                        <button className="btn btn-secondary" onClick={() => saveStep(3)}>
                            <ChevronLeft size={16} /> Atrás
                        </button>
                        <button className="btn btn-primary" onClick={() => saveStep(5)}>
                            Siguiente <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 5: ACTION */}
            {step === 5 && (
                <div style={{ animation: 'slideUp 0.4s ease-out', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ marginBottom: '40px' }}>
                        <h1 style={{ fontSize: '32px', marginBottom: '12px', letterSpacing: '-0.5px' }}>¡Listo para empezar!</h1>
                        <p style={{ fontSize: '18px', color: 'var(--text-secondary)' }}>Añade tu primer registro para ver Caché en acción</p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', marginBottom: '32px' }}>
                        
                        <div className="card" style={{ flex: '1 1 280px', border: '1px solid rgba(124,106,247,0.3)', background: 'linear-gradient(180deg, rgba(124,106,247,0.05) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', cursor: 'pointer', transition: 'all 0.2s' }}
                             onClick={() => setCastingModalOpen(true)}
                             onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                             onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
                            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Añadir un casting</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>Registra una convocatoria pendiente, en proceso o reciente para empezar a llevar control.</p>
                            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); setCastingModalOpen(true); }}>
                                <Plus size={16} /> Nuevo casting
                            </button>
                        </div>

                        <div className="card" style={{ flex: '1 1 280px', border: '1px solid rgba(52,211,153,0.3)', background: 'linear-gradient(180deg, rgba(52,211,153,0.05) 0%, transparent 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', cursor: 'pointer', transition: 'all 0.2s' }}
                             onClick={() => setProyectoModalOpen(true)}
                             onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                             onMouseOut={e => e.currentTarget.style.transform = 'none'}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
                            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Añadir un proyecto</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>Si ya tienes trabajos confirmados o pasados, empieza registrándolos aquí.</p>
                            <button className="btn" style={{ background: 'var(--success)', color: 'black', width: '100%', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); setProyectoModalOpen(true); }}>
                                <Plus size={16} /> Nuevo proyecto
                            </button>
                        </div>

                    </div>

                    <button 
                        onClick={() => saveStep(6, true)} 
                        className="btn btn-primary"
                        style={{ width: '100%', maxWidth: '400px', justifyContent: 'center', padding: '14px', fontSize: '16px', marginTop: '16px' }}
                    >
                        Comenzar
                    </button>
                </div>
            )}

            {/* Modals placed at the end */}
            <CastingFormModal 
                open={castingModalOpen} 
                onClose={() => setCastingModalOpen(false)} 
                onSave={handleSaveCasting}
            />
            
            <ProyectoFormModal 
                open={proyectoModalOpen} 
                onClose={() => setProyectoModalOpen(false)} 
                onSave={handleSaveProyecto}
            />

        </div>
    )
}
