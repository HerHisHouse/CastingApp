'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'

export interface NotificationSettings {
    enabled: boolean
    notify_casting: boolean
    notify_callback: boolean
    notify_ppm: boolean
    notify_fitting: boolean
    notify_shooting: boolean
    notify_travel: boolean
    notify_finance: boolean
    advance_times: string[]
}

const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    notify_casting: true,
    notify_callback: true,
    notify_ppm: true,
    notify_fitting: true,
    notify_shooting: true,
    notify_travel: true,
    notify_finance: true,
    advance_times: ['24h'],
}

export function usePushNotifications() {
    const { user } = useAuth()
    const [permission, setPermission] = useState<NotificationPermission>('default')
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Check support and current state on mount
    useEffect(() => {
        const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
        setIsSupported(supported)
        if (supported) {
            setPermission(Notification.permission)
        }
    }, [])

    // Load settings and subscription state
    useEffect(() => {
        if (!user) return
        const load = async () => {
            setLoading(true)
            try {
                // Fetch settings
                const res = await fetch(`/api/push/settings?userId=${user.id}`)
                if (res.ok) {
                    const data = await res.json()
                    setSettings({ ...DEFAULT_SETTINGS, ...data })
                }

                // Check if currently subscribed
                if ('serviceWorker' in navigator) {
                    const reg = await navigator.serviceWorker.ready
                    const sub = await reg.pushManager.getSubscription()
                    setIsSubscribed(!!sub)
                }
            } catch (e) {
                console.warn('Failed to load push settings:', e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [user])

    const subscribe = useCallback(async () => {
        if (!user || !isSupported) return false
        setError(null)
        try {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) {
                setError('Falta la clave pública VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY)')
                return false
            }

            const perm = await Notification.requestPermission()
            setPermission(perm)
            if (perm !== 'granted') {
                setError('Permiso de notificaciones denegado')
                return false
            }

            const reg = await navigator.serviceWorker.ready
            if (!reg.pushManager) {
                setError('El PushManager no está disponible en este navegador')
                return false
            }

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
            })

            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
            })

            if (res.ok) {
                setIsSubscribed(true)
                return true
            } else {
                const errData = await res.json()
                setError(errData.error || 'Error al guardar suscripción en el servidor')
                return false
            }
        } catch (e: any) {
            console.error('Subscribe error:', e)
            setError(e.message || 'Error desconocido al suscribirse')
        }
        return false
    }, [user, isSupported])

    const unsubscribe = useCallback(async () => {
        if (!isSupported) return
        try {
            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.getSubscription()
            if (sub) {
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                })
                await sub.unsubscribe()
            }
            setIsSubscribed(false)
        } catch (e) {
            console.error('Unsubscribe error:', e)
        }
    }, [isSupported])

    const saveSettings = useCallback(async (newSettings: NotificationSettings) => {
        if (!user) return
        setSaving(true)
        try {
            await fetch('/api/push/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, settings: newSettings }),
            })
            setSettings(newSettings)
        } catch (e) {
            console.error('Save settings error:', e)
        } finally {
            setSaving(false)
        }
    }, [user])

    const toggleEnabled = useCallback(async () => {
        if (!isSubscribed && !settings.enabled) {
            // Activating: subscribe first
            const success = await subscribe()
            if (!success) return
        } else if (isSubscribed && settings.enabled) {
            // Deactivating: unsubscribe
            await unsubscribe()
        }
        const newSettings = { ...settings, enabled: !settings.enabled }
        await saveSettings(newSettings)
    }, [settings, isSubscribed, subscribe, unsubscribe, saveSettings])

    return {
        isSupported, permission, isSubscribed, settings,
        loading, saving, error,
        subscribe, unsubscribe, saveSettings, toggleEnabled,
    }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
