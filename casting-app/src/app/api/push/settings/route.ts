// API: GET/POST /api/push/settings
// Gestiona la configuración de notificaciones del usuario
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return defaults if no settings yet
    return NextResponse.json(data ?? {
        enabled: true,
        notify_casting: true, notify_callback: true, notify_ppm: true,
        notify_fitting: true, notify_shooting: true, notify_travel: true,
        notify_finance: true,
        advance_times: ['24h'],
    })
}

export async function POST(req: NextRequest) {
    try {
        const { userId, settings } = await req.json()
        if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

        const { error } = await supabaseAdmin
            .from('notification_settings')
            .upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (err) {
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }
}
