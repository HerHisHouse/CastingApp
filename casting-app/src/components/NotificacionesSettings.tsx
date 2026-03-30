'use client'
import { useState } from 'react'
import { usePushNotifications, NotificationSettings } from '@/hooks/usePushNotifications'
import { Bell, BellOff, Check, Loader2, Smartphone, AlertCircle } from 'lucide-react'

const EVENT_TYPES = [
    { key: 'notify_casting', label: 'Castings', emoji: '🎬', desc: 'Entregas y castings presenciales' },
    { key: 'notify_callback', label: 'Callbacks', emoji: '📞', desc: 'Recordatorio de callbacks' },
    { key: 'notify_ppm', label: 'PPM / Selección', emoji: '🎯', desc: 'Finalización de selección de talentos' },
    { key: 'notify_fitting', label: 'Prueba de vestuario', emoji: '👕', desc: 'Fitting y pruebas de ropa' },
    { key: 'notify_shooting', label: 'Rodaje', emoji: '🎥', desc: 'Días de trabajo y rodaje' },
    { key: 'notify_travel', label: 'Viaje', emoji: '✈️', desc: 'Días de viaje para proyectos' },
    { key: 'notify_finance', label: 'Finanzas', emoji: '💰', desc: 'Cobros pendientes próximos a vencer' },
] as const

const ADVANCE_OPTIONS = [
    { val: '24h', label: '24h antes', desc: 'Notificación el día anterior' },
    { val: 'same_day', label: 'Mismo día', desc: 'Notificación por la mañana del evento' },
]

export default function NotificacionesSettings() {
    const {
        isSupported, permission, isSubscribed, settings,
        loading, saving, subscribe, unsubscribe, saveSettings, toggleEnabled,
    } = usePushNotifications()

    const [localSettings, setLocalSettings] = useState<NotificationSettings | null>(null)
    const effectiveSettings = localSettings ?? settings
    const [saved, setSaved] = useState(false)

    const handleSave = async () => {
        if (!localSettings) return
        await saveSettings(localSettings)
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        setLocalSettings(null)
    }

    const updateSetting = (key: keyof NotificationSettings, value: boolean | string[]) => {
        setLocalSettings({ ...(localSettings ?? settings), [key]: value })
    }

    const toggleAdvanceTime = (val: string) => {
        const current = effectiveSettings.advance_times
        const next = current.includes(val) ? current.filter(v => v !== val) : [...current, val]
        if (next.length === 0) return // must have at least one
        updateSetting('advance_times', next)
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', color: 'var(--text-secondary)' }}>
                <Loader2 size={16} className="spin" />
                <span style={{ fontSize: '13px' }}>Cargando configuración...</span>
            </div>
        )
    }

    if (!isSupported) {
        return (
            <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(251,191,36,0.08)', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.2)' }}>
                <AlertCircle size={18} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>Notificaciones no disponibles</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Tu navegador no soporta notificaciones push. En iOS, asegúrate de usar Safari y tener la app instalada como PWA (Añadir a pantalla de inicio).
                    </div>
                </div>
            </div>
        )
    }

    if (permission === 'denied') {
        return (
            <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(248,113,113,0.08)', borderRadius: '10px', border: '1px solid rgba(248,113,113,0.2)' }}>
                <AlertCircle size={18} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px' }}>Notificaciones bloqueadas</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Has bloqueado las notificaciones para esta app. Para activarlas, ve a los ajustes de tu navegador y permite las notificaciones para esta web.
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Main toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: effectiveSettings.enabled ? 'rgba(124,106,247,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${effectiveSettings.enabled ? 'rgba(124,106,247,0.3)' : 'var(--border)'}`, borderRadius: '12px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: effectiveSettings.enabled ? 'var(--accent-dim)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {effectiveSettings.enabled ? <Bell size={20} color="var(--accent-light)" /> : <BellOff size={20} color="var(--text-secondary)" />}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                            Notificaciones push
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {isSubscribed ? '✅ Activadas en este dispositivo' : '❌ No activadas en este dispositivo'}
                        </div>
                    </div>
                </div>
                <button
                    onClick={toggleEnabled}
                    style={{
                        position: 'relative',
                        width: '44px', height: '24px',
                        borderRadius: '12px',
                        background: effectiveSettings.enabled ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                        border: 'none', cursor: 'pointer',
                        transition: 'background 0.2s',
                        flexShrink: 0,
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        width: '18px', height: '18px',
                        borderRadius: '50%', background: '#fff',
                        top: '3px',
                        left: effectiveSettings.enabled ? '23px' : '3px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                </button>
            </div>

            {/* iOS PWA hint */}
            {!isSubscribed && permission === 'default' && (
                <div style={{ display: 'flex', gap: '10px', padding: '12px', background: 'rgba(96,165,250,0.08)', borderRadius: '10px', border: '1px solid rgba(96,165,250,0.2)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <Smartphone size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
                    <span><strong style={{ color: '#60a5fa' }}>iOS:</strong> Instala la app en tu pantalla de inicio (Safari → Compartir → Añadir a pantalla de inicio) para recibir notificaciones como PWA.</span>
                </div>
            )}

            {/* Settings - only show when enabled */}
            {effectiveSettings.enabled && (
                <>
                    {/* Advance times */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', color: 'var(--text-primary)' }}>⏰ Cuándo avisar</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ADVANCE_OPTIONS.map(opt => (
                                <label key={opt.val} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', background: effectiveSettings.advance_times.includes(opt.val) ? 'var(--accent-dim)' : 'rgba(255,255,255,0.02)', border: `1px solid ${effectiveSettings.advance_times.includes(opt.val) ? 'rgba(124,106,247,0.3)' : 'var(--border)'}`, transition: 'all 0.15s' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={effectiveSettings.advance_times.includes(opt.val)}
                                        onChange={() => toggleAdvanceTime(opt.val)}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{ width: 20, height: 20, borderRadius: '5px', background: effectiveSettings.advance_times.includes(opt.val) ? 'var(--accent)' : 'rgba(255,255,255,0.1)', border: `2px solid ${effectiveSettings.advance_times.includes(opt.val) ? 'var(--accent)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                        {effectiveSettings.advance_times.includes(opt.val) && <Check size={12} color="#fff" />}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Event types */}
                    <div className="card">
                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', color: 'var(--text-primary)' }}>🔔 Tipos de notificación</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {EVENT_TYPES.map(({ key, label, emoji, desc }) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', transition: 'all 0.15s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '18px' }}>{emoji}</span>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{desc}</div>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={effectiveSettings[key as keyof NotificationSettings] as boolean}
                                        onChange={() => updateSetting(key as keyof NotificationSettings, !effectiveSettings[key as keyof NotificationSettings])}
                                        style={{ display: 'none' }}
                                    />
                                    <div
                                        onClick={() => updateSetting(key as keyof NotificationSettings, !effectiveSettings[key as keyof NotificationSettings])}
                                        style={{ width: 36, height: 20, borderRadius: '10px', background: effectiveSettings[key as keyof NotificationSettings] ? 'var(--accent)' : 'rgba(255,255,255,0.15)', position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s' }}>
                                        <div style={{ position: 'absolute', width: '14px', height: '14px', borderRadius: '50%', background: '#fff', top: '3px', left: effectiveSettings[key as keyof NotificationSettings] ? '19px' : '3px', transition: 'left 0.2s' }} />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Save button */}
                    {localSettings && (
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {saving ? <Loader2 size={14} className="spin" /> : saved ? <Check size={14} /> : null}
                            {saving ? 'Guardando...' : saved ? 'Guardado ✅' : 'Guardar configuración'}
                        </button>
                    )}
                </>
            )}
        </div>
    )
}
