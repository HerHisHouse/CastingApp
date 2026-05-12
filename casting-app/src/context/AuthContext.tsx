'use client'
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { UserProfile } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

const CACHE_KEY = 'cache_onboarding_verified'

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

// ─── Helpers de caché ──────────────────────────────────────────────────────
function getCachedProfile(userId: string): UserProfile | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw)
        // Asegurarse de que la caché pertenece al mismo usuario
        if (parsed?.id === userId) return parsed as UserProfile
    } catch { /* ignore */ }
    return null
}

function setCachedProfile(profile: UserProfile) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(profile)) } catch { /* ignore */ }
}

function clearCachedProfile() {
    try { sessionStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
}

// ─── Provider ─────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    // Flag de ref (no estado) para no re-disparar efectos
    const hasLoadedProfile = useRef(false)

    // ── Carga el perfil para un usuario dado ────────────────────────────
    const loadProfile = async (currentUser: User) => {
        // 1. Caché → rápido, sin red
        const cached = getCachedProfile(currentUser.id)
        if (cached) {
            console.log('✅ Perfil desde caché:', cached.has_completed_onboarding)
            setUserProfile(cached)
            return
        }

        // 2. Sin caché → consultar Supabase una sola vez
        console.log('🔍 Consultando Supabase user_profiles...')
        try {
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', currentUser.id)
                .single()

            if (profile) {
                console.log('✅ Perfil cargado:', profile.has_completed_onboarding)
                setUserProfile(profile)
                setCachedProfile(profile)
            } else {
                // Primera vez: crear fila
                console.log('🆕 Creando perfil por primera vez...')
                const { data: newProfile } = await supabase
                    .from('user_profiles')
                    .insert({ id: currentUser.id })
                    .select()
                    .single()
                const final = (newProfile ?? { id: currentUser.id, has_completed_onboarding: false, onboarding_step: 1 }) as UserProfile
                setUserProfile(final)
                setCachedProfile(final)
            }
        } catch (err) {
            console.error('❌ Error cargando perfil, usando fallback:', err)
            const fallback = { id: currentUser.id, has_completed_onboarding: false, onboarding_step: 1 } as UserProfile
            setUserProfile(fallback)
            // No cacheamos el fallback para que el próximo mount reintente
        }
    }

    // ── refresh() solo renueva metadatos de usuario y el perfil si cambió ─
    const refresh = async () => {
        if (!user) return
        console.log('🔄 refresh() llamado')
        // Invalidar caché para forzar recarga de Supabase
        clearCachedProfile()
        hasLoadedProfile.current = false
        await loadProfile(user)
    }

    // ── Inicialización: SE EJECUTA UNA SOLA VEZ en toda la sesión ─────────
    useEffect(() => {
        let mounted = true

        const init = async () => {
            console.log('🚀 AuthContext init')
            const { data: { session: s } } = await supabase.auth.getSession()
            if (!mounted) return

            setSession(s)
            const currentUser = s?.user ?? null
            setUser(currentUser)

            if (currentUser && !hasLoadedProfile.current) {
                hasLoadedProfile.current = true
                await loadProfile(currentUser)
            }

            if (mounted) setLoading(false)
        }

        init()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
            console.log('🔔 Auth event:', event)
            if (event === 'SIGNED_OUT') {
                setSession(null)
                setUser(null)
                setUserProfile(null)
                hasLoadedProfile.current = false
                clearCachedProfile()
                setLoading(false)
            } else if (event === 'SIGNED_IN') {
                // Solo cargar si es un nuevo usuario (no un TOKEN_REFRESHED disfrazado)
                const currentUser = s?.user ?? null
                if (currentUser && !hasLoadedProfile.current) {
                    setSession(s)
                    setUser(currentUser)
                    hasLoadedProfile.current = true
                    await loadProfile(currentUser)
                    setLoading(false)
                }
            }
            // TOKEN_REFRESHED: NO hacemos nada, el caché sigue siendo válido
        })

        return () => {
            mounted = false
            subscription.unsubscribe()
        }
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
