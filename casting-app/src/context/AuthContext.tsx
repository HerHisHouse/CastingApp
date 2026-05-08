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
    const [authError, setAuthError] = useState<string | null>(null)
    const [hasVerifiedProfile, setHasVerifiedProfile] = useState(false)

    const refresh = async () => {
        console.log("Iniciando verificación de auth...")
        setLoading(true)
        setAuthError(null)

        try {
            // Fetch session with timeout
            const sessionPromise = supabase.auth.getSession()
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
            
            const { data: { session: s } } = await Promise.race([sessionPromise, timeoutPromise]) as any
            setSession(s)
            const currentUser = s?.user ?? null
            setUser(currentUser)

            if (currentUser) {
                console.log(`Usuario autenticado: ${currentUser.id}`)
                
                if (hasVerifiedProfile && userProfile?.id === currentUser.id) {
                    console.log(`Perfil ya verificado en esta sesión: completado=${userProfile.has_completed_onboarding}`)
                } else {
                    console.log("Consultando user_profiles...")
                    const profilePromise = supabase.from('user_profiles').select('*').eq('id', currentUser.id).single()
                    
                    try {
                        const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any
                        
                        if (profile) {
                            console.log(`Perfil encontrado: has_completed_onboarding=${profile.has_completed_onboarding}`)
                            setUserProfile(profile)
                        } else {
                            console.log("Perfil no encontrado, intentando crear uno por defecto...")
                            const { data: newProfile, error: insertError } = await supabase
                                .from('user_profiles')
                                .insert({ id: currentUser.id })
                                .select()
                                .single()
                                
                            if (newProfile) {
                                setUserProfile(newProfile)
                            } else {
                                console.error("Error creando perfil:", insertError)
                                // Prevent infinite hanging by creating a dummy local profile if DB fails
                                setUserProfile({ id: currentUser.id, has_completed_onboarding: false, onboarding_step: 1 } as UserProfile)
                            }
                        }
                        setHasVerifiedProfile(true)
                    } catch (e) {
                        console.error("Timeout o error al consultar perfil:", e)
                        // Fallback to allow app to continue
                        setUserProfile({ id: currentUser.id, has_completed_onboarding: false, onboarding_step: 1 } as UserProfile)
                    }
                }
            } else {
                setUserProfile(null)
                setHasVerifiedProfile(false)
            }
        } catch (err) {
            console.error("Error crítico en AuthContext:", err)
            setAuthError("No se pudo conectar con el servidor. Verifica tu conexión.")
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

    if (authError) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0d0d14', color: '#e2e0f0', gap: '16px' }}>
                <p>{authError}</p>
                <button onClick={refresh} style={{ padding: '8px 16px', background: '#7c6af7', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>Reintentar</button>
            </div>
        )
    }

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
