// API: POST /api/push/send-notifications (Cron Job - Vercel)
// Revisa los eventos del calendario y envía notificaciones push
// Se ejecuta automáticamente por Vercel Cron (configurado en vercel.json)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Guard: only callable by Vercel Cron or with secret header
export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return runNotifications()
}

export async function GET(req: NextRequest) {
    // Called by Vercel Cron
    return runNotifications()
}

async function runNotifications() {
    try {
        if (!process.env.VAPID_SUBJECT || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            console.error('VAPID environment variables are missing')
            return NextResponse.json({ error: 'Config missing' }, { status: 500 })
        }

        webpush.setVapidDetails(
            process.env.VAPID_SUBJECT,
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        )

        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]

        // Tomorrow date
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().split('T')[0]

        // 2 hours from now (for same day events)
        const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

        // Get all users with push subscriptions
        const { data: subscriptions } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions' })
        }

        // Get unique user IDs from subscriptions
        const userIds = [...new Set(subscriptions.map((s: any) => s.user_id))]
        let totalSent = 0

        for (const userId of userIds) {
            const userSubs = subscriptions.filter((s: any) => s.user_id === userId)

            // Get user notification settings
            const { data: settings } = await supabaseAdmin
                .from('notification_settings')
                .select('*')
                .eq('user_id', userId)
                .single()

            // Skip if notifications disabled
            if (settings && !settings.enabled) continue

            const advanceTimes: string[] = settings?.advance_times ?? ['24h']

            // Get upcoming calendar events for this user
            const { data: events } = await supabaseAdmin
                .from('calendar_events')
                .select('*')
                .eq('user_id', userId)
                .gte('event_date_start', todayStr)
                .lte('event_date_start', tomorrowStr)

            if (!events || events.length === 0) continue

            for (const event of events) {
                const eventDate = new Date(event.event_date_start + 'T12:00:00')
                const isToday = event.event_date_start === todayStr
                const isTomorrow = event.event_date_start === tomorrowStr

                // Determine which advance types apply right now
                const applicableAdvances: string[] = []
                if (isTomorrow && advanceTimes.includes('24h')) applicableAdvances.push('24h')
                if (isToday && advanceTimes.includes('same_day')) applicableAdvances.push('same_day')

                for (const advance of applicableAdvances) {
                    // Check if already sent
                    const { data: alreadySent } = await supabaseAdmin
                        .from('notification_log')
                        .select('id')
                        .eq('user_id', userId)
                        .eq('event_id', event.id)
                        .eq('advance_type', advance)
                        .single()

                    if (alreadySent) continue

                    // Check event type settings
                    const notifType = getNotifTypeForEvent(event.event_type)
                    if (settings && notifType && !settings[notifType]) continue

                    // Build message
                    const { title, body } = buildNotificationMessage(event, advance)

                    // Send to all user's devices
                    for (const sub of userSubs) {
                        try {
                            await webpush.sendNotification(
                                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                                JSON.stringify({
                                    title,
                                    body,
                                    icon: '/icons/icon-192x192.png',
                                    badge: '/icons/icon-192x192.png',
                                    tag: `${event.id}-${advance}`,
                                    data: { url: '/' },
                                })
                            )
                            totalSent++
                        } catch (pushErr: any) {
                            // Remove invalid subscriptions (410 Gone)
                            if (pushErr.statusCode === 410) {
                                await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                            }
                        }
                    }

                    // Log sent notification
                    await supabaseAdmin.from('notification_log').insert({
                        user_id: userId,
                        event_id: event.id,
                        advance_type: advance,
                    })
                }
            }
        }

        return NextResponse.json({ success: true, sent: totalSent })
    } catch (err) {
        console.error('Notification cron error:', err)
        return NextResponse.json({ error: String(err) }, { status: 500 })
    }
}

function getNotifTypeForEvent(eventType: string): string | null {
    const map: Record<string, string> = {
        casting_deadline: 'notify_casting',
        callback: 'notify_callback',
        opcionado_ppm: 'notify_ppm',
        wardrobe_fitting: 'notify_fitting',
        shooting_day: 'notify_shooting',
        travel_day: 'notify_travel',
        finance_due: 'notify_finance',
    }
    return map[eventType] ?? null
}

function buildNotificationMessage(event: any, advance: string): { title: string; body: string } {
    const prefix = advance === '24h' ? 'Mañana' : 'Hoy'
    const title = event.title

    switch (event.event_type) {
        case 'casting_deadline':
            return { title: '🎬 Casting', body: `${prefix} — ${event.title}` }
        case 'callback':
            return { title: '📞 Callback', body: `${prefix} tienes callback — ${event.title}` }
        case 'opcionado_ppm':
            return { title: '🎯 PPM / Selección', body: `${prefix} finaliza la selección de talentos — ${event.title}` }
        case 'wardrobe_fitting':
            return { title: '👕 Prueba de vestuario', body: `${prefix} — ${event.title}` }
        case 'shooting_day':
            return { title: '🎥 Rodaje', body: `${prefix} tienes rodaje — ${event.title}` }
        case 'travel_day':
            return { title: '✈️ Viaje', body: `${prefix} — Viaje para rodaje ${event.title}` }
        case 'finance_due':
            return { title: '💰 Cobro pendiente', body: `${prefix} vence el cobro — ${event.title}` }
        default:
            return { title: title, body: `${prefix} — ${event.notes || ''}` }
    }
}
