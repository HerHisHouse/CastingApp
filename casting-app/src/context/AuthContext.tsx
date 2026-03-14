'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
    user: User | null
    session: Session | null
    loading: boolean
    genero: 'actor' | 'actriz'
    username: string
    avatarUrl: string | null
    refresh: () => void
}

const AuthContext = createContext<AuthContextValue>({
    user: null, session: null, loading: true,
    genero: 'actor', username: '', avatarUrl: null, refresh: () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = async () => {
        const { data: { session: s } } = await supabase.auth.getSession()
        setSession(s)
        setUser(s?.user ?? null)
        setLoading(false)
    }

    useEffect(() => {
        refresh()
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
            setSession(s)
            setUser(s?.user ?? null)
            setLoading(false)
        })
        return () => subscription.unsubscribe()
    }, [])

    const meta = user?.user_metadata ?? {}
    const genero: 'actor' | 'actriz' = meta.genero === 'actriz' ? 'actriz' : 'actor'
    const username: string = meta.username ?? user?.email?.split('@')[0] ?? ''
    const avatarUrl: string | null = meta.avatar_url ?? null

    return (
        <AuthContext.Provider value={{ user, session, loading, genero, username, avatarUrl, refresh }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
