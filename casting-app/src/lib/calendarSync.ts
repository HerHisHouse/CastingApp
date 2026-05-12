import { supabase, Casting, Proyecto, Finanza, CalendarEvent } from './supabase'

/**
 * Sincroniza los eventos del calendario para un casting específico.
 * Borra los anteriores y crea los nuevos según las fechas actuales.
 */
export async function syncCastingEvents(casting: Casting, userId: string) {
    if (!casting.id) return

    // 1. Comprobar si este casting ya tiene un proyecto asociado
    const { data: project } = await supabase
        .from('proyectos')
        .select('id')
        .eq('casting_id', casting.id)
        .maybeSingle()

    const hasProject = !!project

    // 2. Borrar eventos previos de este casting (excepto manuales)
    await supabase.from('calendar_events').delete()
        .eq('related_casting_id', casting.id)
        .eq('is_manual', false)

    const events: Omit<CalendarEvent, 'id' | 'created_at'>[] = []

    // 2. Fecha límite (Deadline) / Casting Presencial
    if (casting.fecha_casting) {
        const isPresencial = casting.tipo_casting === 'presencial'
        let title = `Entrega: ${casting.proyecto}`
        let notes = casting.personaje

        if (isPresencial) {
            title = `Casting: ${casting.proyecto}`
            const timeStr = casting.hora_casting ? ` a las ${casting.hora_casting}` : ''
            const placeStr = casting.localizacion ? ` en ${casting.localizacion}` : ''
            notes = `${casting.personaje}${timeStr}${placeStr}`
        }

        // Clean time for DB column (HH:mm)
        const timeMatch = (casting.hora_casting || '').match(/(\d{1,2})[:h](\d{2})/i)
        const dbTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '09:00'

        events.push({
            user_id: userId,
            title: title,
            event_type: 'casting_deadline',
            event_date_start: casting.fecha_casting,
            event_date_end: null,
            event_time: dbTime,
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: casting.id,
            related_project_id: null,
            related_finance_id: null,
            notes: notes
        } as any)
    }

    // 3. Callback
    if (casting.callback_fecha) {
        events.push({
            user_id: userId,
            title: `Callback: ${casting.proyecto}`,
            event_type: 'callback',
            event_date_start: casting.callback_fecha,
            event_date_end: null,
            event_time: '12:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: casting.id,
            related_project_id: null,
            related_finance_id: null,
            notes: null
        } as any)
    }

    // 4. Fitting - SOLO si está seleccionado y NO tiene proyecto (si tiene proyecto, lo gestiona el proyecto)
    if (casting.prueba_vestuario_fecha && casting.estado === 'seleccionado' && !hasProject) {
        events.push({
            user_id: userId,
            title: `Fitting: ${casting.proyecto}`,
            event_type: 'wardrobe_fitting',
            event_date_start: casting.prueba_vestuario_fecha,
            event_date_end: null,
            event_time: '09:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: casting.id,
            related_project_id: null,
            related_finance_id: null,
            notes: null
        } as any)
    }

    // 5. PPM - SOLO si está opcionado y NO tiene proyecto
    if (casting.ppm_fecha && casting.fue_opcionado && !hasProject) {
        events.push({
            user_id: userId,
            title: `PPM: ${casting.proyecto}`,
            event_type: 'opcionado_ppm',
            event_date_start: casting.ppm_fecha,
            event_date_end: null,
            event_time: casting.ppm_hora || '12:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: casting.id,
            related_project_id: null,
            related_finance_id: null,
            notes: null
        } as any)
    }

    // 6. Trabajo / Rodaje - SOLO si está seleccionado y NO tiene proyecto
    if (casting.estado === 'seleccionado' && !hasProject) {
        // Opción A: Por rango de fechas (fecha_inicio / fecha_fin)
        if (casting.fecha_inicio) {
            events.push({
                user_id: userId,
                title: `TRABAJO: ${casting.proyecto}`,
                event_type: 'shooting_day',
                event_date_start: casting.fecha_inicio,
                event_date_end: casting.fecha_fin || casting.fecha_inicio,
                event_time: '09:00',
                event_time_end: null,
                is_all_day: true,
                is_manual: false,
                related_casting_id: casting.id,
                related_project_id: null,
                related_finance_id: null,
                notes: `Rodaje: ${casting.proyecto}`
            } as any)
        } 
        // Opción B: Por texto (retrocompatibilidad)
        else if (casting.fechas_rodaje) {
            const dateMatch = casting.fechas_rodaje.match(/\d{2,4}[-/]\d{2}[-/]\d{2,4}/g)
            if (dateMatch) {
                dateMatch.forEach(d => {
                    const parts = d.split(/[-/]/)
                    if (parts.length === 3) {
                        let formattedDate = d;
                        if (parts[2].length === 4) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`
                        else if (parts[0].length === 4) formattedDate = `${parts[0]}-${parts[1]}-${parts[2]}`
                        
                        if (formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            events.push({
                                user_id: userId,
                                title: `TRABAJO: ${casting.proyecto}`,
                                event_type: 'shooting_day',
                                event_date_start: formattedDate,
                                event_date_end: null,
                                event_time: '09:00',
                                event_time_end: null,
                                is_all_day: true,
                                is_manual: false,
                                related_casting_id: casting.id,
                                related_project_id: null,
                                related_finance_id: null,
                                notes: casting.fechas_rodaje
                            } as any)
                        }
                    }
                })
            }
        }
    }

    // 7. Travel Days - SOLO si NO tiene proyecto
    if (!hasProject && casting.travel_ida) {
        events.push({
            user_id: userId,
            title: `Viaje (Ida): ${casting.proyecto}`,
            event_type: 'travel_day',
            event_date_start: casting.travel_ida,
            event_date_end: null,
            event_time: '09:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: casting.id,
            related_project_id: null,
            related_finance_id: null,
            notes: 'Viaje de ida'
        } as any)
    }
    if (!hasProject && casting.travel_vuelta) {
        events.push({
            user_id: userId,
            title: `Viaje (Vuelta): ${casting.proyecto}`,
            event_type: 'travel_day',
            event_date_start: casting.travel_vuelta,
            event_date_end: null,
            event_time: '09:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: casting.id,
            related_project_id: null,
            related_finance_id: null,
            notes: 'Viaje de vuelta'
        } as any)
    }

    if (events.length > 0) {
        console.log('Intentando sincronizar', events.length, 'eventos para el usuario:', userId);
        const { error } = await supabase.from('calendar_events').insert(events)
        if (error) {
            const errorMsg = `❌ Error Supabase [${error.code}]: ${error.message}${error.details ? ' | Detalle: ' + error.details : ''}${error.hint ? ' | Hint: ' + error.hint : ''}`;
            console.error(errorMsg);
            console.log('Payload completo:', events);
            throw new Error(errorMsg); // Forzar que aparezca en el overlay de Next.js
        }
    }
}

/**
 * Sincroniza los eventos del calendario para una entrada financiera.
 */
export async function syncFinanceEvents(finanza: Finanza, userId: string) {
    if (!finanza.id) return

    // Borrar eventos previos de esta finanza
    await supabase.from('calendar_events').delete()
        .eq('related_finance_id', finanza.id)
        .eq('is_manual', false)

    // Solo crear el evento si NO está pagado y tiene fecha límite
    if (finanza.estado_pago !== 'pagado' && finanza.fecha_limite_cobro) {
        const labels: Record<string, string> = {
            nomina: 'Nómina', derechos_imagen: 'Derechos de Imagen',
            buyout: 'Buyout', royalties: 'Royalties', callback: 'Callback'
        }
        const tipoLabel = labels[finanza.tipo_ingreso] || finanza.tipo_ingreso

        const { error } = await supabase.from('calendar_events').insert({
            user_id: userId,
            title: `Cobro: ${finanza.proyecto_nombre}`,
            event_type: 'finance_due',
            event_date_start: finanza.fecha_limite_cobro,
            event_date_end: null,
            event_time: '12:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: null,
            related_project_id: null,
            related_finance_id: finanza.id,
            notes: `Tipo: ${tipoLabel}`
        } as any)
        if (error) console.error('Error syncing finance events:', error)
    }
}

/**
 * Sincroniza los eventos del calendario para un proyecto.
 */
export async function syncProjectEvents(proyecto: Proyecto, userId: string) {
    if (!proyecto.id) return

    await supabase.from('calendar_events').delete()
        .eq('related_project_id', proyecto.id)
        .eq('is_manual', false)
    const events: any[] = []

    // 1. Rango de Trabajo
    if (proyecto.fecha_inicio) {
        events.push({
            user_id: userId,
            title: `Trabajo: ${proyecto.proyecto}`,
            event_type: 'shooting_day',
            event_date_start: proyecto.fecha_inicio,
            event_date_end: proyecto.fecha_fin || proyecto.fecha_inicio,
            event_time: proyecto.fecha_inicio_hora || '09:00',
            event_time_end: null,
            is_all_day: true,
            is_manual: false,
            related_casting_id: null,
            related_project_id: proyecto.id,
            related_finance_id: null,
            notes: `Personaje: ${proyecto.personaje}`
        } as any)
    }

    // 2. Fitting
    if (proyecto.prueba_vestuario_fecha) {
        events.push({
            user_id: userId,
            title: `Fitting: ${proyecto.proyecto}`,
            event_type: 'wardrobe_fitting',
            event_date_start: proyecto.prueba_vestuario_fecha,
            event_date_end: null,
            event_time: proyecto.prueba_vestuario_hora || '09:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: null,
            related_project_id: proyecto.id,
            related_finance_id: null,
            notes: null
        } as any)
    }

    // 3. Travel
    if (proyecto.travel_ida) {
        events.push({
            user_id: userId,
            title: `Viaje (Ida): ${proyecto.proyecto}`,
            event_type: 'travel_day',
            event_date_start: proyecto.travel_ida,
            event_date_end: null,
            event_time: proyecto.travel_ida_hora || '09:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: null,
            related_project_id: proyecto.id,
            related_finance_id: null,
            notes: null
        } as any)
    }
    if (proyecto.travel_vuelta) {
        events.push({
            user_id: userId,
            title: `Viaje (Vuelta): ${proyecto.proyecto}`,
            event_type: 'travel_day',
            event_date_start: proyecto.travel_vuelta,
            event_date_end: null,
            event_time: proyecto.travel_vuelta_hora || '09:00',
            event_time_end: null,
            is_all_day: false,
            is_manual: false,
            related_casting_id: null,
            related_project_id: proyecto.id,
            related_finance_id: null,
            notes: null
        } as any)
    }

    if (events.length > 0) {
        const { error } = await supabase.from('calendar_events').insert(events)
        if (error) console.error('Error syncing project events:', error, 'Payload:', events)
    }
}
