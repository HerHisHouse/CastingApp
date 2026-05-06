'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import { Loader2 } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, userProfile } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace('/login')
            } else if (userProfile && !userProfile.has_completed_onboarding) {
                router.replace('/onboarding')
            }
        }
    }, [user, loading, userProfile, router])

    // ... loading UI is now handled in AuthContext ...
    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <Loader2 size={28} color="var(--accent-light)" className="spin" />
        </div>
    )

    if (!user) return null

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
