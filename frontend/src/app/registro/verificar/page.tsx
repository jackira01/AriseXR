'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Header from '@/components/Header'

function VerificarContent() {
    const router = useRouter()
    const params = useSearchParams()
    const email = params.get('email') ?? ''
    const pwd = params.get('pwd') ?? ''

    const [code, setCode] = useState(['', '', '', '', '', ''])
    const [error, setError] = useState('')
    const [info, setInfo] = useState('')
    const [loading, setLoading] = useState(false)
    // El código ya fue enviado por /register al llegar a esta página
    const [sent, setSent] = useState(true)
    const [cooldown, setCooldown] = useState(0)
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000'

    useEffect(() => {
        if (cooldown <= 0) return
        const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
        return () => clearTimeout(t)
    }, [cooldown])

    async function sendCode() {
        if (loading || cooldown > 0) return
        setLoading(true)
        setError('')
        setInfo('')
        try {
            const res = await fetch(`${backendUrl}/api/auth/send-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            })
            const data = await res.json() as { message?: string }
            if (!res.ok) {
                if (res.status === 409) {
                    setError('Este email ya tiene una cuenta. Ve a iniciar sesión.')
                } else {
                    setError(data.message ?? 'Error al enviar el código.')
                }
            } else {
                setSent(true)
                setInfo('Código enviado. Revisa tu bandeja de entrada.')
                setCooldown(60)
            }
        } catch {
            setError('Error de conexión. Intenta de nuevo.')
        }
        setLoading(false)
    }

    function handleInput(index: number, value: string) {
        const digit = value.replace(/\D/g, '').slice(-1)
        const next = [...code]
        next[index] = digit
        setCode(next)
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    function handlePaste(e: React.ClipboardEvent) {
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        if (paste.length === 6) {
            setCode(paste.split(''))
            inputRefs.current[5]?.focus()
        }
    }

    async function handleVerify(e: React.FormEvent) {
        e.preventDefault()
        const fullCode = code.join('')
        if (fullCode.length < 6) {
            setError('Introduce el código de 6 dígitos completo.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch(`${backendUrl}/api/auth/verify-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: fullCode }),
            })
            const data = await res.json() as { message?: string }
            if (!res.ok) {
                setError(data.message ?? 'Código incorrecto.')
                setLoading(false)
                return
            }

            // Verificado → iniciar sesión automáticamente y redirigir a cuenta
            if (pwd) {
                const signInRes = await signIn('credentials', { email, password: pwd, redirect: false })
                if (!signInRes?.error) {
                    router.push('/cuenta')
                    return
                }
            }
            router.push('/login')
        } catch {
            setError('Error de conexión. Intenta de nuevo.')
            setLoading(false)
        }
    }

    if (!email) {
        return (
            <main className="relative z-10 min-h-screen flex items-center justify-center px-5">
                <div className="text-center">
                    <p className="font-primary text-red-400 mb-4">Parámetros inválidos.</p>
                    <Link href="/login" className="font-primary text-[.82rem] uppercase tracking-[2px] text-red-500 hover:text-red-400">
                        ← Volver al login
                    </Link>
                </div>
            </main>
        )
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
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-3">
                            <span className="w-7 h-px bg-red-500 inline-block" />
                            Verificación
                            <span className="w-7 h-px bg-red-500 inline-block" />
                        </div>
                        <h1 className="font-serif text-3xl font-bold uppercase text-[#fff0f0]">
                            Confirma tu{' '}
                            <span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">correo</span>
                        </h1>
                        <p className="font-primary text-[.85rem] text-[rgba(255,210,210,.55)] mt-3 leading-relaxed">
                            Hemos enviado un código de 6 dígitos a{' '}
                            <span className="text-red-400">{email}</span>
                        </p>
                        <p className="font-primary text-[.8rem] text-[rgba(255,200,150,.6)] mt-4 px-3 py-2 bg-amber-900/20 border border-amber-800/30 rounded-lg leading-relaxed">
                            ⚠️ Si no ves el código, revisa tu carpeta de <strong>spam</strong> o <strong>promociones</strong>. A veces nuestros correos llegan allí por error.
                        </p>
                    </div>

                    <div className="bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl p-8 flex flex-col gap-6">
                        <form onSubmit={handleVerify} className="flex flex-col gap-6">
                            {/* Code inputs */}
                            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                                {code.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { inputRefs.current[i] = el }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleInput(i, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-12 h-14 text-center bg-black/30 border border-red-800/25 rounded-xl font-serif text-2xl font-bold text-[#fff0f0] focus:outline-none focus:border-red-600/60 transition-colors"
                                    />
                                ))}
                            </div>

                            {error && (
                                <p className="font-primary text-[.82rem] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-center">
                                    {error}
                                </p>
                            )}
                            {info && !error && (
                                <p className="font-primary text-[.82rem] text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-center">
                                    {info}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !sent}
                                className="w-full py-3 bg-linear-to-br from-red-700 to-red-500 text-white font-primary text-[.87rem] font-bold tracking-[2px] uppercase rounded-xl hover:brightness-110 transition-all duration-250 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Verificando...' : 'Verificar y registrarse'}
                            </button>
                        </form>

                        <div className="text-center">
                            <p className="font-primary text-[.8rem] text-[rgba(255,210,210,.4)] mb-2">
                                ¿No recibiste el código?
                            </p>
                            <button
                                type="button"
                                onClick={sendCode}
                                disabled={loading || cooldown > 0}
                                className="font-primary text-[.8rem] uppercase tracking-[2px] text-red-400 hover:text-red-300 disabled:text-[rgba(255,210,210,.3)] disabled:cursor-not-allowed transition-colors"
                            >
                                {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
                            </button>
                        </div>
                    </div>

                    <div className="text-center mt-6">
                        <Link href="/login" className="font-primary text-[.82rem] tracking-[2px] uppercase text-[rgba(255,210,210,.45)] hover:text-red-400 transition-colors duration-200">
                            ← Volver al login
                        </Link>
                    </div>
                </div>
            </main>
        </>
    )
}

export default function VerificarPage() {
    return (
        <Suspense>
            <VerificarContent />
        </Suspense>
    )
}
