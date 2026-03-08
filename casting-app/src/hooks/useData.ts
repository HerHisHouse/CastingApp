'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, Casting, Proyecto, Finanza, Contacto } from '@/lib/supabase'

const AUTO_DISCARD_DAYS = 30

// ─── CASTINGS ────────────────────────────────────────────────────────────────
export function useCastings() {
    const [data, setData] = useState<Casting[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // Evitar bucle: guardamos los IDs ya procesados
    const autoDiscardedIds = useRef<Set<string>>(new Set())

    const fetch = useCallback(async () => {
        setLoading(true)
        const { data: rows, error: err } = await supabase
            .from('castings')
            .select('*')
            .order('fecha_casting', { ascending: false })
        if (err) setError(err.message)
        else setData(rows || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetch() }, [fetch])

    // ── Auto-descarte silencioso tras 30 días sin actividad ──────────────────
    useEffect(() => {
        if (loading || data.length === 0) return

        const hoy = new Date()
        const limite = new Date(hoy)
        limite.setDate(hoy.getDate() - AUTO_DISCARD_DAYS)

        const candidatos = data.filter(c =>
            c.estado === 'enviado'          // sigue "en proceso"
            && !c.fue_opcionado             // sin milestones marcados
            && !c.tuvo_callback
            && new Date(c.fecha_casting) < limite          // han pasado +30 días
            && !autoDiscardedIds.current.has(c.id)         // no procesado ya
        )

        if (candidatos.length === 0) return

        // Marca los IDs antes de hacer el update para evitar doble ejecución
        candidatos.forEach(c => autoDiscardedIds.current.add(c.id))

        const runAutoDiscard = async () => {
            await supabase
                .from('castings')
                .update({ estado: 'descartado' })
                .in('id', candidatos.map(c => c.id))
            // Refetch silencioso para reflejar el cambio en la UI
            await fetch()
        }

        runAutoDiscard()
    }, [data, loading, fetch])

    const create = async (values: Omit<Casting, 'id' | 'created_at'>) => {
        const { error: err } = await supabase.from('castings').insert(values)
        if (err) throw err
        await fetch()
    }

    const update = async (id: string, values: Partial<Casting>) => {
        const { error: err } = await supabase.from('castings').update(values).eq('id', id)
        if (err) throw err
        await fetch()
    }

    const remove = async (id: string) => {
        const { error: err } = await supabase.from('castings').delete().eq('id', id)
        if (err) throw err
        await fetch()
    }

    return { data, loading, error, refetch: fetch, create, update, remove }
}


// ─── PROYECTOS ────────────────────────────────────────────────────────────────
export function useProyectos() {
    const [data, setData] = useState<Proyecto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        const { data: rows, error: err } = await supabase
            .from('proyectos')
            .select('*')
            .order('created_at', { ascending: false })
        if (err) setError(err.message)
        else setData(rows || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetch() }, [fetch])

    const create = async (values: Omit<Proyecto, 'id' | 'created_at'>) => {
        const { error: err } = await supabase.from('proyectos').insert(values)
        if (err) throw err
        await fetch()
    }

    const update = async (id: string, values: Partial<Proyecto>) => {
        const { error: err } = await supabase.from('proyectos').update(values).eq('id', id)
        if (err) throw err
        await fetch()
    }

    const remove = async (id: string) => {
        const { error: err } = await supabase.from('proyectos').delete().eq('id', id)
        if (err) throw err
        await fetch()
    }

    return { data, loading, error, refetch: fetch, create, update, remove }
}

// ─── FINANZAS ─────────────────────────────────────────────────────────────────
export function useFinanzas() {
    const [data, setData] = useState<Finanza[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        const { data: rows, error: err } = await supabase
            .from('finanzas')
            .select('*')
            .order('fecha_factura', { ascending: false })
        if (err) setError(err.message)
        else setData(rows || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetch() }, [fetch])

    const create = async (values: Omit<Finanza, 'id' | 'created_at'>) => {
        const { error: err } = await supabase.from('finanzas').insert(values)
        if (err) throw err
        await fetch()
    }

    const update = async (id: string, values: Partial<Finanza>) => {
        const { error: err } = await supabase.from('finanzas').update(values).eq('id', id)
        if (err) throw err
        await fetch()
    }

    const remove = async (id: string) => {
        const { error: err } = await supabase.from('finanzas').delete().eq('id', id)
        if (err) throw err
        await fetch()
    }

    return { data, loading, error, refetch: fetch, create, update, remove }
}

// ─── CONTACTOS ────────────────────────────────────────────────────────────────
export function useContactos() {
    const [data, setData] = useState<Contacto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        setLoading(true)
        const { data: rows, error: err } = await supabase
            .from('contactos')
            .select('*')
            .order('nombre', { ascending: true })
        if (err) setError(err.message)
        else setData(rows || [])
        setLoading(false)
    }, [])

    useEffect(() => { fetch() }, [fetch])

    const create = async (values: Omit<Contacto, 'id' | 'created_at'>) => {
        const { error: err } = await supabase.from('contactos').insert(values)
        if (err) throw err
        await fetch()
    }

    const update = async (id: string, values: Partial<Contacto>) => {
        const { error: err } = await supabase.from('contactos').update(values).eq('id', id)
        if (err) throw err
        await fetch()
    }

    const remove = async (id: string) => {
        const { error: err } = await supabase.from('contactos').delete().eq('id', id)
        if (err) throw err
        await fetch()
    }

    return { data, loading, error, refetch: fetch, create, update, remove }
}
