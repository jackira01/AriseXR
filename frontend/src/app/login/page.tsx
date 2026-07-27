'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'

type Mode = 'login' | 'register'

export default function LoginPage() {
    const router = useRouter()
    const [mode, setMode] = useState<Mode>('login')

    // Login
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Register
    const [regName, setRegName] = useState('')
    const [regEmail, setRegEmail] = useState('')
    const [regPassword, setRegPassword] = useState('')
    const [regConfirm, setRegConfirm] = useState('')

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    function switchMode(m: Mode) {
        setMode(m)
        setError('')
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError('')

        const res = await signIn('credentials', {
            email,
            password,
            redirect: false,
        })

        setLoading(false)

        if (res?.error === 'google_provider') {
            setError('Esta cuenta fue creada con Google. Usa el botón "Continuar con Google" para entrar.')
        } else if (res?.error) {
            setError('Email o contraseña incorrectos.')
        } else {
            router.push('/cuenta')
        }
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        if (regPassword !== regConfirm) {
            setError('Las contraseñas no coinciden.')
            return
        }
        if (regPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.')
            return
        }

        setLoading(true)

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'
            const res = await fetch(`${backendUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
            })

            const data = await res.json() as { message?: string }

            if (!res.ok) {
                setError(data.message ?? 'Error al registrar.')
                setLoading(false)
                return
            }

            // Registro iniciado → redirigir a verificación de correo
            setLoading(false)
            router.push(`/registro/verificar?email=${encodeURIComponent(regEmail)}&pwd=${encodeURIComponent(regPassword)}`)
        } catch {
            setError('Error de conexión.')
            setLoading(false)
        }
    }

    async function handleGoogleSignIn() {
        await signIn('google', { callbackUrl: '/cuenta' })
    }

    return (
        <>
            <Header />
            <div
                className="fixed inset-0 z-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(160,10,10,.4) 0%, transparent 65%)' }}
            />
            <main className="relative z-10 min-h-screen flex items-center justify-center px-5 py-20">
                <div className="max-w-md w-full">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-3">
                            <span className="w-7 h-px bg-red-500 inline-block" />
                            {mode === 'login' ? 'Acceso' : 'Registro'}
                            <span className="w-7 h-px bg-red-500 inline-block" />
                        </div>
                        <h1 className="font-serif text-3xl font-bold uppercase text-[#fff0f0]">
                            {mode === 'login' ? (
                                <>Inicia{' '}<span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">Sesión</span></>
                            ) : (
                                <>Crea tu{' '}<span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">cuenta</span></>
                            )}
                        </h1>
                    </div>

                    {/* Mode tabs */}
                    <div className="flex rounded-xl overflow-hidden border border-red-800/20 mb-6">
                        <button
                            onClick={() => switchMode('login')}
                            className={`flex-1 py-2.5 font-primary text-[.78rem] tracking-[2px] uppercase transition-colors duration-200 ${mode === 'login' ? 'bg-red-700/60 text-white' : 'bg-black/20 text-[rgba(255,210,210,.45)] hover:text-red-400'}`}
                        >
                            Iniciar sesión
                        </button>
                        <button
                            onClick={() => switchMode('register')}
                            className={`flex-1 py-2.5 font-primary text-[.78rem] tracking-[2px] uppercase transition-colors duration-200 ${mode === 'register' ? 'bg-red-700/60 text-white' : 'bg-black/20 text-[rgba(255,210,210,.45)] hover:text-red-400'}`}
                        >
                            Registrarse
                        </button>
                    </div>

                    {/* Form card */}
                    <div className="bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl p-8 flex flex-col gap-5">

                        {mode === 'login' ? (
                            <form onSubmit={handleLogin} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="font-primary text-[.78rem] uppercase tracking-[2px] text-[rgba(255,210,210,.6)]">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="bg-black/30 border border-red-800/25 rounded-xl px-4 py-3 font-primary text-[.9rem] text-[#fff0f0] placeholder-[rgba(255,210,210,.3)] focus:outline-none focus:border-red-600/60 transition-colors"
                                        placeholder="tu@email.com"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="font-primary text-[.78rem] uppercase tracking-[2px] text-[rgba(255,210,210,.6)]">Contraseña</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="bg-black/30 border border-red-800/25 rounded-xl px-4 py-3 font-primary text-[.9rem] text-[#fff0f0] placeholder-[rgba(255,210,210,.3)] focus:outline-none focus:border-red-600/60 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {error && (
                                    <p className="font-primary text-[.82rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-linear-to-br from-red-700 to-red-500 text-white font-primary text-[.87rem] font-bold tracking-[2px] uppercase rounded-xl hover:brightness-110 transition-all duration-250 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Entrando...' : 'Entrar'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-2">
                                    <label className="font-primary text-[.78rem] uppercase tracking-[2px] text-[rgba(255,210,210,.6)]">Nombre</label>
                                    <input
                                        type="text"
                                        value={regName}
                                        onChange={(e) => setRegName(e.target.value)}
                                        required
                                        className="bg-black/30 border border-red-800/25 rounded-xl px-4 py-3 font-primary text-[.9rem] text-[#fff0f0] placeholder-[rgba(255,210,210,.3)] focus:outline-none focus:border-red-600/60 transition-colors"
                                        placeholder="Tu nombre"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="font-primary text-[.78rem] uppercase tracking-[2px] text-[rgba(255,210,210,.6)]">Email</label>
                                    <input
                                        type="email"
                                        value={regEmail}
                                        onChange={(e) => setRegEmail(e.target.value)}
                                        required
                                        className="bg-black/30 border border-red-800/25 rounded-xl px-4 py-3 font-primary text-[.9rem] text-[#fff0f0] placeholder-[rgba(255,210,210,.3)] focus:outline-none focus:border-red-600/60 transition-colors"
                                        placeholder="tu@email.com"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="font-primary text-[.78rem] uppercase tracking-[2px] text-[rgba(255,210,210,.6)]">Contraseña</label>
                                    <input
                                        type="password"
                                        value={regPassword}
                                        onChange={(e) => setRegPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="bg-black/30 border border-red-800/25 rounded-xl px-4 py-3 font-primary text-[.9rem] text-[#fff0f0] placeholder-[rgba(255,210,210,.3)] focus:outline-none focus:border-red-600/60 transition-colors"
                                        placeholder="Mín. 6 caracteres"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="font-primary text-[.78rem] uppercase tracking-[2px] text-[rgba(255,210,210,.6)]">Confirmar contraseña</label>
                                    <input
                                        type="password"
                                        value={regConfirm}
                                        onChange={(e) => setRegConfirm(e.target.value)}
                                        required
                                        className="bg-black/30 border border-red-800/25 rounded-xl px-4 py-3 font-primary text-[.9rem] text-[#fff0f0] placeholder-[rgba(255,210,210,.3)] focus:outline-none focus:border-red-600/60 transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {error && (
                                    <p className="font-primary text-[.82rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                        {error}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-linear-to-br from-red-700 to-red-500 text-white font-primary text-[.87rem] font-bold tracking-[2px] uppercase rounded-xl hover:brightness-110 transition-all duration-250 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Registrando...' : 'Crear cuenta'}
                                </button>
                            </form>
                        )}

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <span className="flex-1 h-px bg-red-800/25" />
                            <span className="font-primary text-[.72rem] uppercase tracking-[2px] text-[rgba(255,210,210,.35)]">o</span>
                            <span className="flex-1 h-px bg-red-800/25" />
                        </div>

                        {/* Google button */}
                        <button
                            type="button"
                            onClick={handleGoogleSignIn}
                            className="w-full py-3 flex items-center justify-center gap-3 bg-white/5 border border-red-800/20 rounded-xl font-primary text-[.85rem] tracking-[1px] text-[#fff0f0] hover:bg-white/10 transition-all duration-200"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
                            </svg>
                            {mode === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}
                        </button>
                    </div>

                    <div className="text-center mt-6">
                        <Link href="/" className="font-primary text-[.82rem] tracking-[2px] uppercase text-[rgba(255,210,210,.45)] hover:text-red-400 transition-colors duration-200">
                            ← Volver al inicio
                        </Link>
                    </div>
                </div>
            </main>
        </>
    )
}
