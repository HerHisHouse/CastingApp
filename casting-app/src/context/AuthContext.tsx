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

const ONBOARDING_CACHE_KEY = 'cache_onboarding_verified';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [hasVerifiedProfile, setHasVerifiedProfile] = useState(false)

    const refresh = async () => {
        console.log("Iniciando verificación de auth...")
        setLoading(true)

        try {
            const { data: { session: s } } = await supabase.auth.getSession()
            setSession(s)
            const currentUser = s?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                console.log(`Usuario autenticado: ${currentUser.id}`)
                
                // 1. Verificar caché
                const cached = typeof window !== 'undefined' ? sessionStorage.getItem(ONBOARDING_CACHE_KEY) : null;
                if (cached) {
                    const cachedProfile = JSON.parse(cached);
                    if (cachedProfile && cachedProfile.id === currentUser.id) {
                        console.log("Usando estado de onboarding cacheado:", cachedProfile);
                        setUserProfile(cachedProfile);
                        setHasVerifiedProfile(true);
                        setLoading(false);
                        return;
                    }
                }

                console.log("Sin caché válida, consultando Supabase...");
                const { data: profile, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', currentUser.id)
                    .single()
                
                if (profile) {
                    console.log(`Perfil encontrado: has_completed_onboarding=${profile.has_completed_onboarding}`)
                    setUserProfile(profile)
                    sessionStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify(profile))
                } else {
                    console.log("Perfil no encontrado, creando uno por defecto...")
                    const { data: newProfile } = await supabase
                        .from('user_profiles')
                        .insert({ id: currentUser.id })
                        .select()
                        .single()
                        
                    const finalProfile = newProfile || { id: currentUser.id, has_completed_onboarding: false, onboarding_step: 1 } as UserProfile;
                    setUserProfile(finalProfile)
                    sessionStorage.setItem(ONBOARDING_CACHE_KEY, JSON.stringify(finalProfile))
                }
                setHasVerifiedProfile(true)
            } else {
                setUserProfile(null)
                setHasVerifiedProfile(false)
                if (typeof window !== 'undefined') sessionStorage.removeItem(ONBOARDING_CACHE_KEY)
            }
        } catch (err) {
            console.error("Error en AuthContext:", err)
            // Fallback: permitir que la app cargue si falla la red
            if (user) {
                const fallback = { id: user.id, has_completed_onboarding: false, onboarding_step: 1 } as UserProfile;
                setUserProfile(fallback);
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        refresh()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, s) => {
            if (_e === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setUserProfile(null)
                setHasVerifiedProfile(false)
                if (typeof window !== 'undefined') sessionStorage.removeItem(ONBOARDING_CACHE_KEY)
                setLoading(false)
            } else if (_e === 'SIGNED_IN' || _e === 'TOKEN_REFRESHED') {
                if (!hasVerifiedProfile) {
                    await refresh()
                }
            }
        })
        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
