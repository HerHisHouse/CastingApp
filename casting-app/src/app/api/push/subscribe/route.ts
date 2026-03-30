// API: POST /api/push/subscribe
// Guarda la suscripción push del navegador del usuario
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const { subscription, userId } = await req.json()

        if (!subscription || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const { endpoint, keys } = subscription
        const { p256dh, auth } = keys

        // Upsert by endpoint (replace if same browser registers again)
        const { error } = await supabaseAdmin
            .from('push_subscriptions')
            .upsert({
                user_id: userId,
                endpoint,
                p256dh,
                auth,
            }, { onConflict: 'endpoint' })

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Push subscribe error:', err)
        return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { endpoint } = await req.json()
        
        await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', endpoint)

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Push unsubscribe error:', err)
        return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
    }
}
