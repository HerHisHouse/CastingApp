'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, userProfile } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login')
            } else if (userProfile?.has_completed_onboarding) {
                router.replace('/')
            }
        }
    }, [user, loading, userProfile, router])

    if (loading || !user || userProfile?.has_completed_onboarding) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d14' }}>
                <Loader2 size={32} color="#7c6af7" className="spin" />
            </div>
        )
    }

    return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#0d0d14', 
            color: '#e2e0f0',
            fontFamily: 'var(--font-outfit), sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
        }}>
            <div style={{ width: '100%', maxWidth: '600px', animation: 'fadeIn 0.5s ease-out' }}>
                {children}
            </div>
        </div>
    )
}
