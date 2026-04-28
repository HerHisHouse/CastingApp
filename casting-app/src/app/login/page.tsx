'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp, signIn } from '@/lib/auth'
import { Eye, EyeOff, Loader2, ArrowRight, UserPlus } from 'lucide-react'

type Mode = 'login' | 'register'

function InputField({
    id, label, type = 'text', value, onChange, placeholder, error, children,
}: {
    id: string, label: string, type?: string, value: string, placeholder?: string,
    onChange: (v: string) => void, error?: string, children?: React.ReactNode,
}) {
    return (
        <div className="form-group">
            <label className="form-label" htmlFor={id}>{label}</label>
            <div style={{ position: 'relative' }}>
                <input
                    id={id}
                    className={`form-input${error ? ' input-error' : ''}`}
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={id}
                    style={{ background: 'rgba(255,255,255,0.04)', borderColor: error ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
                />
                {children}
            </div>
            {error && <p className="field-error">{error}</p>}
        </div>
    )
}

function PasswordField({ id, label, value, onChange, placeholder, error }: {
    id: string, label: string, value: string,
    onChange: (v: string) => void, placeholder?: string, error?: string,
}) {
    const [show, setShow] = useState(false)
    return (
        <InputField id={id} label={label} type={show ? 'text' : 'password'}
            value={value} onChange={onChange} placeholder={placeholder} error={error}>
            <button type="button" onClick={() => setShow(s => !s)} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0',
            }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </InputField>
    )
}

export default function AuthPage() {
    const router = useRouter()
    const [mode, setMode] = useState<Mode>('login')
    const [loading, setLoading] = useState(false)
    const [globalError, setGlobalError] = useState<string | null>(null)

    const [loginEmail, setLoginEmail] = useState('')
    const [loginPass, setLoginPass] = useState('')

    const [regName, setRegName] = useState('')
    const [regEmail, setRegEmail] = useState('')
    const [regPass, setRegPass] = useState('')
    const [regConfirm, setRegConfirm] = useState('')
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    const switchMode = (m: Mode) => {
        setMode(m)
        setGlobalError(null)
        setFieldErrors({})
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setGlobalError(null)
        if (!loginEmail || !loginPass) { setGlobalError('Rellena todos los campos.'); return }
        setLoading(true)
        try {
            await signIn(loginEmail, loginPass)
            router.push('/')
        } catch {
            setGlobalError('Credenciales incorrectas. Revisa tu email y contraseña.')
        } finally { setLoading(false) }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        const errors: Record<string, string> = {}
        if (!regName.trim()) errors.name = 'El nombre es obligatorio.'
        if (!regEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Introduce un email válido.'
        if (regPass.length < 6) errors.pass = 'La contraseña debe tener al menos 6 caracteres.'
        if (regPass !== regConfirm) errors.confirm = 'Las contraseñas no coinciden.'
        if (Object.keys(errors).length) { setFieldErrors(errors); return }

        setGlobalError(null)
        setFieldErrors({})
        setLoading(true)
        try {
            await signUp(regEmail, regPass, regName.trim())
            setMode('login')
            setGlobalError('✅ Cuenta creada. Revisa tu email para confirmarla y luego inicia sesión.')
        } catch (err: unknown) {
            setGlobalError(err instanceof Error ? err.message : 'Error al crear la cuenta.')
        } finally { setLoading(false) }
    }

    return (
        <div className="auth-page">
            {/* Decorative background glows */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
            }}>
                <div style={{
                    position: 'absolute', top: '-20%', left: '-10%',
                    width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(124,106,247,0.15) 0%, transparent 70%)',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-15%', right: '-10%',
                    width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(157,143,255,0.1) 0%, transparent 70%)',
                }} />
            </div>

            <div className="auth-card" style={{ position: 'relative', zIndex: 1 }}>
                {/* Brand */}
                <div className="auth-brand">
                    <div style={{
                        width: 64, height: 64, borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(124,106,247,0.2) 0%, rgba(18,16,30,0.8) 100%)',
                        border: '1px solid rgba(124,106,247,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 32px rgba(124,106,247,0.25)',
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="44" height="44">
                            <rect width="40" height="40" rx="9" fill="#12101e"/>
                            <polygon points="10,8 10,32 30,20" fill="#7c6af7" opacity="0.18"/>
                            <polygon points="10,8 10,20 20,14" fill="#7c6af7"/>
                            <polygon points="10,20 10,32 20,26" fill="#a78bfa"/>
                            <polygon points="20,14 20,26 30,20" fill="#534AB7"/>
                        </svg>
                    </div>
                    <h1 className="auth-title">
                        <span style={{ color: '#ffffff' }}>Cach</span><span style={{ color: '#a78bfa' }}>é</span>
                    </h1>
                    <p className="auth-subtitle">
                        Gestiona tu carrera artística: castings, proyectos y finanzas
                    </p>
                </div>

                {/* Global error/info */}
                {globalError && (
                    <div className={`auth-alert ${globalError.startsWith('✅') ? 'auth-alert-success' : 'auth-alert-error'}`}
                        style={{ marginBottom: '16px' }}>
                        {globalError}
                    </div>
                )}

                {/* Login form */}
                {mode === 'login' && (
                    <form onSubmit={handleLogin} className="auth-form">
                        <InputField id="email" label="Email" type="email"
                            value={loginEmail} onChange={setLoginEmail} placeholder="tu@email.com" />
                        <PasswordField id="password" label="Contraseña"
                            value={loginPass} onChange={setLoginPass} placeholder="••••••••" />

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading
                                ? <><Loader2 size={16} className="spin" /> Iniciando sesión…</>
                                : <><span>Iniciar sesión</span><ArrowRight size={16} /></>
                            }
                        </button>

                        <div className="auth-divider">
                            <span>¿No tienes cuenta?</span>
                        </div>

                        <button
                            type="button"
                            className="auth-register-btn"
                            onClick={() => switchMode('register')}
                        >
                            <UserPlus size={16} />
                            Crear una cuenta gratis
                        </button>
                    </form>
                )}

                {/* Register form */}
                {mode === 'register' && (
                    <form onSubmit={handleRegister} className="auth-form">
                        <InputField id="username" label="Nombre de usuario"
                            value={regName} onChange={setRegName} placeholder="Tu nombre" error={fieldErrors.name} />
                        <InputField id="reg-email" label="Email" type="email"
                            value={regEmail} onChange={setRegEmail} placeholder="tu@email.com" error={fieldErrors.email} />
                        <PasswordField id="reg-password" label="Contraseña"
                            value={regPass} onChange={setRegPass} placeholder="Mín. 6 caracteres" error={fieldErrors.pass} />
                        <PasswordField id="reg-confirm" label="Confirmar contraseña"
                            value={regConfirm} onChange={setRegConfirm} placeholder="Repite la contraseña" error={fieldErrors.confirm} />

                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading
                                ? <><Loader2 size={16} className="spin" /> Creando cuenta…</>
                                : <><span>Crear cuenta</span><ArrowRight size={16} /></>
                            }
                        </button>

                        <div className="auth-divider">
                            <span>¿Ya tienes cuenta?</span>
                        </div>

                        <button
                            type="button"
                            className="auth-back-btn"
                            onClick={() => switchMode('login')}
                        >
                            Volver a iniciar sesión
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
