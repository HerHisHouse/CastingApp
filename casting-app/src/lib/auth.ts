import { supabase } from '@/lib/supabase'

export async function signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { 
                username,
                full_name: username,
                display_name: username
            },
        },
    })
    if (error) throw error
    return data
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
}

export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

export async function updateUserMeta(meta: Record<string, string | null>) {
    const { data, error } = await supabase.auth.updateUser({ data: meta })
    if (error) throw error
    return data
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
}
