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
        const nowTime = now.getTime()

        // Get all users with push subscriptions
        const { data: subscriptions } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions' })
        }

        const userIds = [...new Set(subscriptions.map((s: any) => s.user_id))]
        let totalSent = 0

        for (const userId of userIds) {
            const userSubs = subscriptions.filter((s: any) => s.user_id === userId)
            const { data: settings } = await supabaseAdmin
                .from('notification_settings')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (settings && !settings.enabled) continue

            const advanceTimes: string[] = settings?.advance_times ?? ['24h']
            
            // Map old 'same_day' to something or keep it compatible
            // If user has old 'same_day', we can assume they want a morning notification
            
            // Get events starting in the next 3 days (to cover 48h)
            const maxDate = new Date(nowTime + 72 * 60 * 60 * 1000).toISOString().split('T')[0]
            const minDate = now.toISOString().split('T')[0]

            const { data: events } = await supabaseAdmin
                .from('calendar_events')
                .select('*')
                .eq('user_id', userId)
                .gte('event_date_start', minDate)
                .lte('event_date_start', maxDate)

            if (!events || events.length === 0) continue

            for (const event of events) {
                // Determine event date-time
                // If event_time is missing, default to 09:00
                const timeStr = event.event_time || '09:00'
                const eventDateTime = new Date(`${event.event_date_start}T${timeStr.includes(':') ? timeStr : timeStr + ':00'}`)
                const eventMillis = eventDateTime.getTime()
                const diffHours = (eventMillis - nowTime) / (1000 * 60 * 60)

                // Define windows for each option
                const possibleOptions = ['48h', '24h', '12h', '6h', '3h', '2h', '1h']
                
                for (const opt of possibleOptions) {
                    if (!advanceTimes.includes(opt)) continue
                    
                    const optHours = parseInt(opt)
                    
                    // IF we are within the window for this option
                    // (example: if diffHours is 2.5 and we are checking '3h')
                    // Logic: now < eventTime - (optHours - 1) AND now > eventTime - (optHours + some buffer)
                    // Simplified: if we are less than optHours away, we can send it (log prevents double)
                    if (diffHours <= optHours && diffHours > 0) {
                        
                        // Check if already sent for THIS specific option
                        const { data: alreadySent } = await supabaseAdmin
                            .from('notification_log')
                            .select('id')
                            .eq('user_id', userId)
                            .eq('event_id', event.id)
                            .eq('advance_type', opt)
                            .single()

                        if (alreadySent) continue

                        // Check event type settings
                        const notifType = getNotifTypeForEvent(event.event_type)
                        if (settings && notifType && !settings[notifType]) continue

                        // Build message
                        const { title, body } = buildNotificationMessage(event, opt)

                        // Send push
                        for (const sub of userSubs) {
                            try {
                                await webpush.sendNotification(
                                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                                    JSON.stringify({
                                        title,
                                        body,
                                        icon: '/icons/icon-192x192.png',
                                        badge: '/icons/icon-192x192.png',
                                        tag: `${event.id}-${opt}`,
                                        data: { url: '/' },
                                    })
                                )
                                totalSent++
                            } catch (err: any) {
                                if (err.statusCode === 410) {
                                    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                                }
                            }
                        }

                        // Log
                        await supabaseAdmin.from('notification_log').insert({
                            user_id: userId,
                            event_id: event.id,
                            advance_type: opt,
                        })
                    }
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
    let prefix = ''
    if (advance === '48h') prefix = 'En 2 días'
    else if (advance === '24h') prefix = 'Mañana'
    else {
        const hours = parseInt(advance)
        prefix = `En ${hours}h`
    }
    
    // Clean up event title (remove redundant prefixes like "Casting: ")
    const cleanEventTitle = event.title.replace(/^(Casting|Callback|TRABAJO|Trabajo|PPM|Fitting|Viaje|Cobro):?\s*/i, '')

    switch (event.event_type) {
        case 'casting_deadline':
            return { title: `🎬 ${prefix}: Casting`, body: cleanEventTitle }
        case 'callback':
            return { title: `📞 ${prefix}: Callback`, body: cleanEventTitle }
        case 'opcionado_ppm':
            return { title: `🎯 ${prefix}: PPM`, body: `Finaliza selección de ${cleanEventTitle}` }
        case 'wardrobe_fitting':
            return { title: `👕 ${prefix}: Fitting`, body: cleanEventTitle }
        case 'shooting_day':
            return { title: `🎥 ${prefix}: Rodaje`, body: cleanEventTitle }
        case 'travel_day':
            return { title: `✈️ ${prefix}: Viaje`, body: cleanEventTitle }
        case 'finance_due':
            return { title: `💰 ${prefix}: Cobro`, body: cleanEventTitle }
        default:
            return { title: `${prefix}: ${event.title}`, body: event.notes || '' }
    }
}
