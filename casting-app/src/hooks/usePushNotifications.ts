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
        try {
            const perm = await Notification.requestPermission()
            setPermission(perm)
            if (perm !== 'granted') return false

            const reg = await navigator.serviceWorker.ready
            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!).buffer as ArrayBuffer,
            })

            const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscription: sub.toJSON(), userId: user.id }),
            })

            if (res.ok) {
                setIsSubscribed(true)
                return true
            }
        } catch (e) {
            console.error('Subscribe error:', e)
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
        loading, saving,
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
