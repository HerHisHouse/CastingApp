'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

interface AuthContextValue {
    user: User | null
    session: Session | null
    userProfile: UserProfile | null
    loading: boolean
    genero: 'actor' | 'actriz'
    username: string
    avatarUrl: string | null
    refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
    user: null, session: null, userProfile: null, loading: true,
    genero: 'actor', username: '', avatarUrl: null, refresh: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = async () => {
        setLoading(true)
        const { data: { session: s } } = await supabase.auth.getSession()
        setSession(s)
        const currentUser = s?.user ?? null
        setUser(currentUser)

        if (currentUser) {
            // Fetch user profile
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single()
            
            if (profile) {
                setUserProfile(profile)
            } else {
                // If profile doesn't exist, create it (fallback if trigger fails)
                const { data: newProfile } = await supabase
                    .from('user_profiles')
                    .insert({ id: currentUser.id })
                    .select()
                    .single()
                setUserProfile(newProfile)
            }
        } else {
            setUserProfile(null)
        }

        setLoading(false)
    }

    useEffect(() => {
        refresh()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
            if (_e === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setUserProfile(null)
                setLoading(false)
            } else if (_e === 'SIGNED_IN' || _e === 'TOKEN_REFRESHED') {
                await refresh()
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    const meta = user?.user_metadata ?? {}
    const genero: 'actor' | 'actriz' = meta.genero === 'actriz' ? 'actriz' : 'actor'
    const username: string = userProfile?.artistic_name || meta.username || user?.email?.split('@')[0] || ''
    const avatarUrl: string | null = meta.avatar_url ?? null

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d14' }}>
                <Loader2 size={32} color="#7c6af7" className="spin" />
            </div>
        )
    }

    return (
        <AuthContext.Provider value={{ user, session, userProfile, loading, genero, username, avatarUrl, refresh }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
