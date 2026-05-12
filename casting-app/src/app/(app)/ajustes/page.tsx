'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { updateUserMeta, signOut, uploadAvatar } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Camera, LogOut, Settings, Loader2, Check, Bell, RefreshCw } from 'lucide-react'
import NotificacionesSettings from '@/components/NotificacionesSettings'

const PREDEFINED_TYPES = ['Actor', 'Actriz', 'Bailarín/a', 'Coreógrafo/a', 'Actor/Actriz de doblaje', 'Modelo', 'Intérprete musical']
const CACHE_KEY = 'cache_onboarding_verified'

export default function AjustesPage() {
    const { user, username, avatarUrl, userProfile, refresh } = useAuth()
    const router = useRouter()

    // ── Estado Cuenta ────────────────────────────────────────────────────
    const [newName, setNewName] = useState(username)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [savingCuenta, setSavingCuenta] = useState(false)
    const [savedCuenta, setSavedCuenta] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    // ── Estado Perfil Profesional ─────────────────────────────────────────
    const [artisticName, setArtisticName] = useState(userProfile?.artistic_name ?? '')
    const [artistTypes, setArtistTypes] = useState<string[]>(userProfile?.artist_types ?? ['Actor'])
    const [defaultAgency, setDefaultAgency] = useState(userProfile?.default_agency ?? '')
    const [defaultCommission, setDefaultCommission] = useState(
        userProfile?.default_commission_percentage?.toString() ?? ''
    )
    const [showCustomInput, setShowCustomInput] = useState(false)
    const [customInput, setCustomInput] = useState('')
    const [savingPerfil, setSavingPerfil] = useState(false)
    const [savedPerfil, setSavedPerfil] = useState(false)

    // ── Estado global errores ─────────────────────────────────────────────
    const [error, setError] = useState<string | null>(null)

    // ── Push diagnostics ──────────────────────────────────────────────────
    const [pushDiag, setPushDiag] = useState<string | null>(null)
    const [repairingPush, setRepairingPush] = useState(false)

    // Sincronizar campos si userProfile llega después del primer render
    useEffect(() => {
        if (!userProfile) return
        setArtisticName(userProfile.artistic_name ?? '')
        setArtistTypes(userProfile.artist_types?.length ? userProfile.artist_types : ['Actor'])
        setDefaultAgency(userProfile.default_agency ?? '')
        setDefaultCommission(userProfile.default_commission_percentage?.toString() ?? '')
    }, [userProfile])

    // Re-registrar service worker si es necesario
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return
        navigator.serviceWorker.getRegistrations().then(regs => {
            if (regs.length === 0) {
                navigator.serviceWorker.register('/sw.js?v=4')
                    .then(() => console.log('✅ SW registrado desde ajustes'))
                    .catch(err => console.error('❌ SW error:', err))
            }
        })
    }, [])

    // ── Helpers UI ────────────────────────────────────────────────────────
    const showToast = (setter: (v: boolean) => void) => {
        setter(true)
        setTimeout(() => setter(false), 2500)
    }

    // ── Handlers Cuenta ───────────────────────────────────────────────────
    const handleSaveCuenta = async () => {
        if (!user) return
        setSavingCuenta(true); setError(null)
        try {
            await updateUserMeta({ username: newName.trim() })
            await refresh()
            showToast(setSavedCuenta)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error al guardar')
        } finally { setSavingCuenta(false) }
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return
        setUploadingAvatar(true); setError(null)
        try {
            const url = await uploadAvatar(file, user.id)
            await updateUserMeta({ avatar_url: url })
            await refresh()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error al subir imagen.')
        } finally { setUploadingAvatar(false) }
    }

    const handleSignOut = async () => {
        await signOut()
        router.replace('/login')
    }

    // ── Handlers Perfil Profesional ───────────────────────────────────────
    const toggleType = (type: string) => {
        setArtistTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        )
    }

    const addCustomTypes = () => {
        if (!customInput.trim()) return
        const newTypes = customInput.split(',').map(t => t.trim()).filter(t => t && !artistTypes.includes(t))
        if (newTypes.length) setArtistTypes(prev => [...prev, ...newTypes])
        setCustomInput('')
    }

    const handleSavePerfil = async () => {
        if (!user) return
        setSavingPerfil(true); setError(null)
        try {
            const updates = {
                artistic_name: artisticName.trim() || null,
                artist_types: artistTypes,
                default_agency: defaultAgency.trim() || null,
                default_commission_percentage: defaultCommission ? parseFloat(defaultCommission) : null,
            }
            const { data, error: err } = await supabase
                .from('user_profiles')
                .update(updates)
                .eq('id', user.id)
                .select()
                .single()

            if (err) throw err

            // Actualizar caché de sessionStorage
            if (data) {
                try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
            }

            showToast(setSavedPerfil)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error al guardar perfil')
        } finally { setSavingPerfil(false) }
    }

    // ── Push diagnostics ──────────────────────────────────────────────────
    const handleCheckNotifications = async () => {
        setPushDiag(null)
        const hasSW = 'serviceWorker' in navigator
        const hasPush = 'PushManager' in window
        if (!hasSW || !hasPush) {
            setPushDiag('⚠️ Este dispositivo/navegador no soporta notificaciones push.')
            return
        }
        const perm = Notification.permission
        if (perm === 'denied') {
            setPushDiag('🚫 Las notificaciones están bloqueadas. Ve a la configuración de tu navegador y actívalas para Caché.')
            return
        }
        if (perm === 'default') {
            const granted = await Notification.requestPermission()
            setPushDiag(granted === 'granted'
                ? '✅ Permiso concedido. Activa las notificaciones desde la sección Notificaciones.'
                : '🚫 Permiso denegado.')
            return
        }
        try {
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()
            setPushDiag(sub
                ? `✅ Suscripción activa. Todo funciona correctamente.`
                : '⚠️ Permiso concedido pero sin suscripción activa. Actívalas desde la sección Notificaciones.')
        } catch (e: any) {
            setPushDiag(`❌ Error comprobando suscripción: ${e.message}`)
        }
    }

    const handleRepairPush = async () => {
        setRepairingPush(true); setPushDiag(null)
        try {
            const regs = await navigator.serviceWorker.getRegistrations()
            await Promise.all(regs.map(r => r.unregister()))
            await navigator.serviceWorker.register('/sw.js?v=4')
            await navigator.serviceWorker.ready
            setPushDiag('✅ Service worker re-registrado. Ahora activa las notificaciones desde la sección Notificaciones.')
        } catch (e: any) {
            setPushDiag(`❌ Error al re-registrar SW: ${e.message}`)
        } finally { setRepairingPush(false) }
    }

    const avatarLetter = (username || user?.email || '?')[0].toUpperCase()

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                <Settings size={28} color="var(--accent-light)" />
                <div>
                    <h2 style={{ margin: 0 }}>Ajustes</h2>
                    <p style={{ margin: 0 }}>Gestiona tu cuenta y perfil profesional</p>
                </div>
            </div>

            <div className="page-body">
                <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {error && <div className="auth-alert auth-alert-error">{error}</div>}

                    {/* ─── CUENTA ──────────────────────────────────────────── */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>👤</span>
                            Cuenta
                        </div>

                        {/* Avatar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    background: avatarUrl ? 'transparent' : 'var(--accent-dim)',
                                    border: '2px solid var(--accent)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '28px', fontWeight: 700, color: 'var(--accent-light)', overflow: 'hidden',
                                }}>
                                    {avatarUrl
                                        ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : avatarLetter}
                                </div>
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    disabled={uploadingAvatar}
                                    style={{
                                        position: 'absolute', bottom: 0, right: 0,
                                        width: 26, height: 26, borderRadius: '50%',
                                        background: 'var(--accent)', border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    {uploadingAvatar ? <Loader2 size={13} color="#fff" className="spin" /> : <Camera size={13} color="#fff" />}
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>{username || '—'}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{user?.email}</div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', opacity: 0.7 }}>
                                    Haz clic en la cámara para cambiar tu foto
                                </p>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '14px' }}>
                            <label className="form-label">Nombre de usuario</label>
                            <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tu nombre" />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">Email</label>
                            <input className="form-input" value={user?.email ?? ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
                        </div>

                        {savedCuenta && <div className="auth-alert auth-alert-success" style={{ marginBottom: '12px' }}>✅ Datos de cuenta guardados.</div>}
                        <button className="btn btn-primary" onClick={handleSaveCuenta} disabled={savingCuenta} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {savingCuenta ? <Loader2 size={14} className="spin" /> : savedCuenta ? <Check size={14} /> : null}
                            {savingCuenta ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>

                    {/* ─── PERFIL PROFESIONAL ───────────────────────────────── */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎭</span>
                            Perfil profesional
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>

                            {/* Nombre artístico */}
                            <div className="form-group">
                                <label className="form-label">Nombre artístico</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: Alex Díaz"
                                    value={artisticName}
                                    onChange={e => setArtisticName(e.target.value)}
                                />
                            </div>

                            {/* ¿Qué haces? */}
                            <div className="form-group">
                                <label className="form-label">¿Qué haces?</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {PREDEFINED_TYPES.map(type => {
                                        const selected = artistTypes.includes(type)
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => toggleType(type)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '20px',
                                                    border: `1px solid ${selected ? '#7c6af7' : 'var(--border)'}`,
                                                    background: selected ? '#7c6af7' : 'transparent',
                                                    color: selected ? 'white' : 'var(--text-secondary)',
                                                    cursor: 'pointer', fontSize: '13px',
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    transition: 'all 0.2s', fontFamily: 'inherit',
                                                }}
                                            >
                                                {selected && <Check size={11} />}
                                                {type}
                                            </button>
                                        )
                                    })}

                                    {/* Chips personalizados */}
                                    {artistTypes.filter(t => !PREDEFINED_TYPES.includes(t)).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => toggleType(type)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '20px',
                                                border: '1px solid #7c6af7', background: '#7c6af7',
                                                color: 'white', cursor: 'pointer', fontSize: '13px',
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                fontFamily: 'inherit',
                                            }}
                                        >
                                            <Check size={11} /> {type} <span style={{ fontSize: '10px', opacity: 0.8 }}>×</span>
                                        </button>
                                    ))}

                                    {/* Chip Otro */}
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomInput(!showCustomInput)}
                                        style={{
                                            padding: '6px 12px', borderRadius: '20px',
                                            border: `1px dashed ${showCustomInput ? '#7c6af7' : 'var(--border)'}`,
                                            background: showCustomInput ? 'rgba(124,106,247,0.1)' : 'transparent',
                                            color: showCustomInput ? '#7c6af7' : 'var(--text-secondary)',
                                            cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        + Otra
                                    </button>
                                </div>

                                {showCustomInput && (
                                    <div style={{ marginTop: '10px' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: Cantante, Mago... (Enter para añadir)"
                                            value={customInput}
                                            onChange={e => setCustomInput(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTypes() } }}
                                            onBlur={addCustomTypes}
                                        />
                                    </div>
                                )}

                                {artistTypes.length === 0 && (
                                    <span style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '6px', display: 'block' }}>
                                        Selecciona al menos una profesión
                                    </span>
                                )}
                            </div>

                            {/* Agencia */}
                            <div className="form-group">
                                <label className="form-label">Agencia <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span></label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: Representa Management"
                                    value={defaultAgency}
                                    onChange={e => setDefaultAgency(e.target.value)}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                    Déjalo vacío si trabajas por libre
                                </span>
                            </div>

                            {/* Comisión */}
                            <div className="form-group">
                                <label className="form-label">Comisión de agencia <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Ej: 15"
                                        style={{ paddingRight: '32px' }}
                                        value={defaultCommission}
                                        onChange={e => setDefaultCommission(e.target.value)}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '13px' }}>%</span>
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                                    Porcentaje por defecto para nuevos proyectos
                                </span>
                            </div>
                        </div>

                        {savedPerfil && <div className="auth-alert auth-alert-success" style={{ marginBottom: '12px' }}>✅ Perfil profesional actualizado.</div>}
                        <button
                            className="btn btn-primary"
                            onClick={handleSavePerfil}
                            disabled={savingPerfil || artistTypes.length === 0}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {savingPerfil ? <Loader2 size={14} className="spin" /> : savedPerfil ? <Check size={14} /> : null}
                            {savingPerfil ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>

                    {/* ─── NOTIFICACIONES ───────────────────────────────────── */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bell size={14} color="var(--accent-light)" />
                            </span>
                            Notificaciones
                        </div>
                        <NotificacionesSettings />

                        {/* Diagnóstico push */}
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                                Si no recibes notificaciones en el móvil, usa estas herramientas:
                            </p>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={handleCheckNotifications}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--accent-dim)', border: '1px solid var(--accent)', color: 'var(--accent-light)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '12px' }}
                                >
                                    <Bell size={13} /> Verificar estado
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRepairPush}
                                    disabled={repairingPush}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '12px' }}
                                >
                                    {repairingPush ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
                                    Reparar servicio
                                </button>
                            </div>
                            {pushDiag && (
                                <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', padding: '10px', borderRadius: '8px', lineHeight: 1.5 }}>
                                    {pushDiag}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ─── ACCIONES ─────────────────────────────────────────── */}
                    <div style={{ paddingTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!user) return
                                const { error: err } = await supabase.from('user_profiles').update({
                                    has_completed_onboarding: false,
                                    onboarding_step: 1
                                }).eq('id', user.id)
                                if (!err) {
                                    try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
                                    router.replace('/onboarding')
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'none', border: '1px solid var(--border)',
                                color: 'var(--text-secondary)', padding: '10px 20px', borderRadius: '8px',
                                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '13px',
                            }}
                        >
                            🔄 Rehacer tutorial
                        </button>

                        <button
                            type="button"
                            onClick={handleSignOut}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'none', border: '1px solid var(--danger)',
                                color: 'var(--danger)', padding: '10px 20px', borderRadius: '8px',
                                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '13px',
                            }}
                        >
                            <LogOut size={15} />
                            Cerrar sesión
                        </button>
                    </div>

                </div>
            </div>
        </>
    )
}
