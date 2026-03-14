import { supabase, Casting, Finanza, CalendarEvent } from './supabase'

/**
 * Sincroniza los eventos del calendario para un casting específico.
 * Borra los anteriores y crea los nuevos según las fechas actuales.
 */
export async function syncCastingEvents(casting: Casting, userId: string) {
    if (!casting.id) return

    // 1. Borrar eventos previos de este casting
    await supabase.from('calendar_events').delete().eq('related_casting_id', casting.id)

    const events: Omit<CalendarEvent, 'id' | 'created_at'>[] = []

    // 2. Fecha límite (Deadline)
    if (casting.fecha_casting) {
        events.push({
            user_id: userId,
            title: `Entrega: ${casting.proyecto}`,
            event_type: 'casting_deadline',
            event_date_start: casting.fecha_casting,
            event_date_end: null,
            related_casting_id: casting.id,
            related_finance_id: null,
            notes: casting.personaje
        })
    }

    // 3. Callback
    if (casting.callback_fecha) {
        events.push({
            user_id: userId,
            title: `Callback: ${casting.proyecto}`,
            event_type: 'callback',
            event_date_start: casting.callback_fecha,
            event_date_end: null,
            related_casting_id: casting.id,
            related_finance_id: null,
            notes: null
        })
    }

    // 4. Fitting
    if (casting.prueba_vestuario_fecha) {
        events.push({
            user_id: userId,
            title: `Fitting: ${casting.proyecto}`,
            event_type: 'wardrobe_fitting',
            event_date_start: casting.prueba_vestuario_fecha,
            event_date_end: null,
            related_casting_id: casting.id,
            related_finance_id: null,
            notes: null
        })
    }

    // 5. PPM
    if (casting.ppm_fecha) {
        events.push({
            user_id: userId,
            title: `PPM: ${casting.proyecto}`,
            event_type: 'opcionado_ppm',
            event_date_start: casting.ppm_fecha,
            event_date_end: null,
            related_casting_id: casting.id,
            related_finance_id: null,
            notes: null
        })
    }

    // 6. Rodaje (fechas_rodaje) - Intentamos extraer fechas DD-MM-YYYY o YYYY-MM-DD
    if (casting.fechas_rodaje) {
        // Formato DD-MM-YYYY o YYYY-MM-DD
        const dateMatch = casting.fechas_rodaje.match(/\d{2,4}[-/]\d{2}[-/]\d{2,4}/g)
        if (dateMatch) {
            dateMatch.forEach(d => {
                const parts = d.split(/[-/]/)
                if (parts.length === 3) {
                    let formattedDate = d;
                    if (parts[2].length === 4) {
                        // Es DD-MM-YYYY
                        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`
                    } else if (parts[0].length === 4) {
                        // Es YYYY-MM-DD
                        formattedDate = `${parts[0]}-${parts[1]}-${parts[2]}`
                    }
                    if (formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        events.push({
                            user_id: userId,
                            title: `Rodaje: ${casting.proyecto}`,
                            event_type: 'shooting_day',
                            event_date_start: formattedDate,
                            event_date_end: null,
                            related_casting_id: casting.id,
                            related_finance_id: null,
                            notes: casting.fechas_rodaje
                        })
                    }
                }
            })
        }
    }

    if (events.length > 0) {
        const { error } = await supabase.from('calendar_events').insert(events)
        if (error) console.error('Error syncing casting events:', error)
    }
}

/**
 * Sincroniza los eventos del calendario para una entrada financiera.
 */
export async function syncFinanceEvents(finanza: Finanza, userId: string) {
    if (!finanza.id) return

    await supabase.from('calendar_events').delete().eq('related_finance_id', finanza.id)

    if (finanza.fecha_limite_cobro) {
        const { error } = await supabase.from('calendar_events').insert({
            user_id: userId,
            title: `Cobro: ${finanza.proyecto_nombre}`,
            event_type: 'finance_due',
            event_date_start: finanza.fecha_limite_cobro,
            event_date_end: null,
            related_casting_id: null,
            related_finance_id: finanza.id,
            notes: null
        } as any)
        if (error) console.error('Error syncing finance events:', error)
    }
}
