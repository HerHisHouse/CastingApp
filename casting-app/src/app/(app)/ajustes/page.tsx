'use client'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { updateUserMeta, signOut, uploadAvatar } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Camera, LogOut, Settings, Loader2, Check, Bell, RefreshCw } from 'lucide-react'
import NotificacionesSettings from '@/components/NotificacionesSettings'

export default function AjustesPage() {
    const { user, username, avatarUrl, genero, refresh } = useAuth()
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [savingPerfil, setSavingPerfil] = useState(false)
    const [saved, setSaved] = useState(false)
    const [savedPerfil, setSavedPerfil] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Cuenta fields
    const [newName, setNewName] = useState(username)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const fileRef = useRef<HTMLInputElement>(null)

    // Perfil fields
    const [selectedGenero, setSelectedGenero] = useState<'actor' | 'actriz'>(genero)

    const showSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    const showSavedPerfil = () => { setSavedPerfil(true); setTimeout(() => setSavedPerfil(false), 2500) }

    // ── Notificaciones push: estado de diagnóstico ─────────────────────
    const [pushDiag, setPushDiag] = useState<string | null>(null)
    const [repairingPush, setRepairingPush] = useState(false)

    // Re-registrar service worker en cada mount para reparar suscripciones rotas
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return
        navigator.serviceWorker.getRegistrations().then(regs => {
            if (regs.length === 0) {
                navigator.serviceWorker.register('/sw.js?v=4').then(
                    () => console.log('✅ SW registrado desde ajustes'),
                    err => console.error('❌ SW error:', err)
                )
            }
        })
    }, [])

    const handleCheckNotifications = async () => {
        setPushDiag(null)
        const perm = typeof Notification !== 'undefined' ? Notification.permission : 'not-supported'
        const hasSW = 'serviceWorker' in navigator
        const hasPush = 'PushManager' in window

        if (!hasSW || !hasPush) {
            setPushDiag('⚠️ Este dispositivo/navegador no soporta notificaciones push.')
            return
        }

        if (perm === 'denied') {
            setPushDiag('🚫 Las notificaciones están bloqueadas. Ve a la configuración de tu navegador y actívalas para Caché.')
            return
        }

        if (perm === 'default') {
            const granted = await Notification.requestPermission()
            setPushDiag(granted === 'granted' ? '✅ Permiso concedido. Activa las notificaciones desde el botón de la sección Notificaciones.' : '🚫 Permiso denegado.')
            return
        }

        // perm === 'granted' → comprobar suscripción
        try {
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()
            setPushDiag(sub ? `✅ Suscripción activa. Endpoint: ...${sub.endpoint.slice(-20)}` : '⚠️ Permiso concedido pero sin suscripción activa. Actívalas desde la sección Notificaciones.')
        } catch (e: any) {
            setPushDiag(`❌ Error comprobando suscripción: ${e.message}`)
        }
    }

    const handleRepairPush = async () => {
        setRepairingPush(true)
        setPushDiag(null)
        try {
            const regs = await navigator.serviceWorker.getRegistrations()
            await Promise.all(regs.map(r => r.unregister()))
            const reg = await navigator.serviceWorker.register('/sw.js?v=4')
            await navigator.serviceWorker.ready
            setPushDiag('✅ Service worker re-registrado. Ahora activa las notificaciones desde la sección Notificaciones.')
        } catch (e: any) {
            setPushDiag(`❌ Error al re-registrar SW: ${e.message}`)
        } finally {
            setRepairingPush(false)
        }
    }

    const handleSaveAccount = async () => {
        if (!user) return
        setSaving(true); setError(null)
        try {
            await updateUserMeta({ username: newName.trim() })
            await refresh()
            showSaved()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error al guardar')
        } finally { setSaving(false) }
    }

    const handleSavePerfil = async () => {
        if (!user) return
        setSavingPerfil(true); setError(null)
        try {
            await updateUserMeta({ genero: selectedGenero })
            await refresh()
            showSavedPerfil()
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Error al guardar')
        } finally { setSavingPerfil(false) }
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
            setError(e instanceof Error ? e.message : 'Error al subir imagen. Asegúrate de que el bucket "avatars" existe y es público en Supabase.')
        } finally { setUploadingAvatar(false) }
    }

    const handleSignOut = async () => {
        await signOut()
        router.replace('/login')
    }

    const avatarLetter = (username || user?.email || '?')[0].toUpperCase()

    return (
        <>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                <Settings size={28} color="var(--accent-light)" />
                <div>
                    <h2 style={{ margin: 0 }}>Ajustes</h2>
                    <p style={{ margin: 0 }}>Gestiona tu cuenta y perfil</p>
                </div>
            </div>

            <div className="page-body">
                <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {error && <div className="auth-alert auth-alert-error">{error}</div>}

                    {/* ─── CUENTA ──────────────────────────────────────── */}
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
                                    fontSize: '28px', fontWeight: 700, color: 'var(--accent-light)',
                                    overflow: 'hidden',
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
                                    {uploadingAvatar
                                        ? <Loader2 size={13} color="#fff" className="spin" />
                                        : <Camera size={13} color="#fff" />}
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
                            <input
                                className="form-input"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                placeholder="Tu nombre"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">Email</label>
                            <input
                                className="form-input"
                                value={user?.email ?? ''}
                                disabled
                                style={{ opacity: 0.5, cursor: 'not-allowed' }}
                            />
                        </div>

                        {saved && <div className="auth-alert auth-alert-success" style={{ marginBottom: '12px' }}>✅ Cambios guardados correctamente.</div>}
                        <button className="btn btn-primary" onClick={handleSaveAccount} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {saving ? <Loader2 size={14} className="spin" /> : saved ? <Check size={14} /> : null}
                            {saving ? 'Guardando…' : 'Guardar cambios'}
                        </button>
                    </div>

                    {/* ─── PERFIL ─────────────────────────────────────── */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🎭</span>
                            Perfil
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                            Especifica si eres actor o actriz para que la app use la terminología correcta en toda la interfaz.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            {(['actor', 'actriz'] as const).map(g => (
                                <button
                                    key={g}
                                    type="button"
                                    onClick={() => setSelectedGenero(g)}
                                    style={{
                                        flex: 1, padding: '16px', borderRadius: '12px', cursor: 'pointer',
                                        border: `2px solid ${selectedGenero === g ? 'var(--accent)' : 'var(--border)'}`,
                                        background: selectedGenero === g ? 'var(--accent-dim)' : 'var(--bg-card)',
                                        color: selectedGenero === g ? 'var(--accent-light)' : 'var(--text-secondary)',
                                        fontWeight: 700, fontSize: '15px', fontFamily: 'inherit',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {g === 'actor' ? '🎭 Actor' : '🎭 Actriz'}
                                </button>
                            ))}
                        </div>

                        {savedPerfil && <div className="auth-alert auth-alert-success" style={{ marginBottom: '12px' }}>✅ Preferencia guardada.</div>}
                        <button className="btn btn-primary" onClick={handleSavePerfil} disabled={savingPerfil} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {savingPerfil ? <Loader2 size={14} className="spin" /> : savedPerfil ? <Check size={14} /> : null}
                            {savingPerfil ? 'Guardando…' : 'Guardar preferencia'}
                        </button>
                    </div>

                    {/* ─── NOTIFICACIONES ─────────────────────────── */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
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

                    {/* ─── OTROS / PELIGRO ──────────────────────────────── */}
                    <div style={{ paddingTop: '4px', display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            onClick={async () => {
                                if (user) {
                                    const { supabase } = await import('@/lib/supabase');
                                    await supabase.from('user_profiles').update({
                                        has_completed_onboarding: false,
                                        onboarding_step: 1
                                    }).eq('id', user.id);
                                    await refresh();
                                    router.replace('/onboarding');
                                }
                            }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'none', border: '1px solid var(--border)',
                                color: 'var(--text-secondary)', padding: '10px 20px', borderRadius: '8px',
                                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '13px',
                                transition: 'all 0.15s',
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
                                transition: 'all 0.15s',
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
