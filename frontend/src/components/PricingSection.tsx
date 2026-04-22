'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { createCheckoutSession } from '@/lib/api'

const PLANS = [
    {
        name: 'Silver Pack',
        badge: '',
        price: '$4,800 MX',
        highlight: false,
        rankImg: '/ranks/silver.webp',
        rankGlow: '#90a4ae',
        detail1: '8 hrs en total',
        detail2: '5 games',
        detail3: '6 – 8',
        description: 'El punto de partida ideal para comenzar a mejorar con estructura y guía profesional.',
        cta: 'Elegir Silver',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SILVER ?? '',
        guarantee: false,
        features: ['Retroalimentación personalizada', 'Coach en vivo'],
    },
    {
        name: 'Esmerald Pack',
        badge: '',
        price: '$7,200 MX',
        highlight: false,
        rankImg: '/ranks/emerald.png',
        rankGlow: '#3dba6a',
        detail1: '12 hrs en total',
        detail2: '10 games',
        detail3: '8 – 10',
        description: 'Para jugadores que quieren progresar de forma constante y afianzar sus bases.',
        cta: 'Elegir Esmerald',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESMERALD ?? '',
        guarantee: false,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo'],
    },
    {
        name: 'Diamond Pack',
        badge: 'RECOMENDADO',
        price: '$11,500 MX',
        highlight: true,
        rankImg: '/ranks/diamond.png',
        rankGlow: '#4a9ee0',
        detail1: '18 hrs en total',
        detail2: '15 games',
        detail3: '9 – 10',
        description: 'El equilibrio perfecto entre intensidad y resultados para escalar de rango rápidamente.',
        cta: 'Elegir Diamond',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_DIAMOND ?? '',
        guarantee: false,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo', 'Videos personalizados de mejoras', 'Teorías aplicadas al juego'],
    },
    {
        name: 'Chall Pack',
        badge: 'RETADOR',
        price: '$15,900 MX',
        highlight: false,
        rankImg: '/ranks/challenger.png',
        rankGlow: '#ffd600',
        detail1: '32 hrs en total',
        detail2: '20 games',
        detail3: '12 – 14',
        description: 'El programa más intensivo. Máxima dedicación para quienes van en serio al Retador.',
        cta: 'Ir al Retador',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CHALLENGER ?? '',
        guarantee: true,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo', 'Videos personalizados de mejoras', 'Teorías aplicadas al juego', 'Práctica guiada', 'Entendimiento analítico pre y post game'],
    },
]

export default function PricingSection() {
    const { data: session } = useSession()
    const router = useRouter()
    const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null)
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

    useEffect(() => {
        const updateCountdown = () => {
            const targetDate = new Date('2026-04-23T23:59:00').getTime()
            const now = new Date().getTime()
            const difference = targetDate - now

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                })
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
            }
        }

        updateCountdown()
        const interval = setInterval(updateCountdown, 1000)
        return () => clearInterval(interval)
    }, [])

    async function handleCheckout(priceId: string) {
        if (!session) {
            router.push('/login')
            return
        }

        const token = (session as { accessToken?: string }).accessToken ?? ''
        const userId = session.user?.id ?? ''
        const email = session.user?.email ?? ''

        try {
            setLoadingPriceId(priceId)
            const url = await createCheckoutSession(token, userId, email, priceId)
            window.location.href = url
        } catch (err) {
            console.error('[Stripe] Error al iniciar el pago:', err)
        } finally {
            setLoadingPriceId(null)
        }
    }

    return (
        <section id="precios" className="relative z-[2] py-16 md:py-28 px-5 sm:px-8 lg:px-13">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 md:mb-20">
                    <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-4">
                        <span className="w-7 h-px bg-red-500 inline-block" />
                        Paquetes
                        <span className="w-7 h-px bg-red-500 inline-block" />
                    </div>
                    <h2 className="font-serif text-[clamp(2rem,3.5vw,3rem)] font-bold uppercase text-[#fff0f0]">
                        Elige Tu{' '}
                        <span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">Paquete</span>
                    </h2>
                    <p className="font-primary text-[1rem] text-[rgba(255,210,210,.6)] mt-4 max-w-xl mx-auto leading-relaxed">
                        Todos los paquetes incluyen los mismos beneficios. La diferencia está en la intensidad de las sesiones.
                    </p>
                </div>

                {/* Discount banner */}
                <div className="mb-12 bg-gradient-to-r from-purple-900/40 via-red-900/40 to-orange-900/40 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 sm:p-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex items-center justify-center gap-2 mb-5">
                            <h3 className="font-serif text-xl font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-orange-300">
                                Cupones Disponibles
                            </h3>
                        </div>

                        {/* Countdown timer */}
                        <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
                            <span className="font-primary text-[.75rem] uppercase tracking-[1px] text-[rgba(255,210,210,.6)]">Válido hasta:</span>
                            <div className="flex gap-2 sm:gap-3">
                                {[
                                    { value: timeLeft.days, label: 'Días' },
                                    { value: timeLeft.hours, label: 'Hrs' },
                                    { value: timeLeft.minutes, label: 'Min' },
                                    { value: timeLeft.seconds, label: 'Seg' },
                                ].map(({ value, label }) => (
                                    <div key={label} className="flex flex-col items-center gap-1">
                                        <div className="bg-gradient-to-br from-red-600 to-orange-600 rounded-lg px-2.5 sm:px-3 py-1.5 border border-red-400/40 shadow-lg shadow-red-500/20">
                                            <span className="font-serif font-black text-white text-[1.1rem] sm:text-[1.3rem] block min-w-[2.5rem] text-center">
                                                {String(value).padStart(2, '0')}
                                            </span>
                                        </div>
                                        <span className="font-primary text-[.6rem] sm:text-[.65rem] uppercase tracking-[1px] text-[rgba(255,210,210,.5)]">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {[
                                { code: 'CHALL20', discount: '20%', color: 'from-yellow-500 to-orange-500' },
                                { code: 'DIAMOND12', discount: '12%', color: 'from-blue-400 to-cyan-400' },
                                { code: 'EMERALD8', discount: '8%', color: 'from-green-400 to-emerald-500' },
                                { code: 'SILVER5', discount: '5%', color: 'from-gray-300 to-gray-400' },
                            ].map((coupon) => (
                                <div
                                    key={coupon.code}
                                    className="relative flex flex-col items-center justify-center p-4 rounded-xl border-2 border-white/20 bg-transparent transition-all hover:scale-105 hover:border-white/40 cursor-pointer group"
                                >
                                    <div className="text-center">
                                        <div className="font-serif text-[1.8rem] sm:text-2xl font-black text-white drop-shadow-lg mb-1">
                                            {coupon.discount}
                                        </div>
                                        <div className="font-primary text-[.7rem] sm:text-[.75rem] font-bold tracking-[2px] uppercase text-white/90 drop-shadow-md">
                                            {coupon.code}
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 bg-white transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                    {PLANS.map((plan, i) => (
                        <div
                            key={plan.name}
                            style={{ animationDelay: `${i * 100}ms` }}
                            className={`relative flex flex-col rounded-2xl p-6 sm:p-7 border transition-all duration-300 ${plan.highlight
                                ? 'bg-linear-to-br from-red-800 to-red-600 border-red-500/40 shadow-[0_0_60px_rgba(180,20,20,.45)] lg:scale-105'
                                : 'bg-red-950/30 backdrop-blur-sm border-red-800/20 hover:shadow-red-950/60 hover:border-red-700/35 shadow-[0_0_30px_rgba(0,0,0,.5)]'
                                }`}
                        >
                            {plan.badge && (
                                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 font-primary text-[.62rem] font-black tracking-[3px] uppercase px-4 py-1 rounded-full shadow-lg whitespace-nowrap ${plan.highlight
                                    ? 'bg-linear-to-r from-cyan-400 to-blue-400 text-white'
                                    : 'bg-linear-to-r from-yellow-400 to-amber-400 text-[#1a0f35]'
                                    }`}>
                                    {plan.badge}
                                </div>
                            )}

                            <div className="flex justify-center mb-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={plan.rankImg}
                                    alt={plan.name}
                                    className="w-16 h-16 object-contain"
                                    style={{ filter: `drop-shadow(0 0 14px ${plan.rankGlow}88)` }}
                                />
                            </div>

                            <h3 className={`font-serif text-[1.35rem] font-bold uppercase text-center leading-tight mb-5 ${plan.highlight ? 'text-white' : 'text-[#fff0f0]'}`}>
                                {plan.name}
                            </h3>

                            <div className={`flex flex-col gap-1.5 mb-4 ${plan.highlight ? 'text-red-100' : 'text-[rgba(255,210,210,.8)]'}`}>
                                <div className="flex items-center gap-2 font-primary text-[.85rem] font-semibold"><span>⏱</span> {plan.detail1}</div>
                                <div className="flex items-center gap-2 font-primary text-[.85rem] font-semibold"><span>🎮</span> {plan.detail2}</div>
                                <div className="flex items-center gap-2 font-primary text-[.85rem] font-semibold"><span>📚</span> {plan.detail3} temas</div>
                            </div>

                            <div className={`h-px mb-4 ${plan.highlight ? 'bg-white/20' : 'bg-red-800/25'}`} />

                            <div className="text-center mb-4">
                                <span className={`font-primary text-[2.2rem] font-black leading-none ${plan.highlight ? 'text-white' : 'text-[#fff0f0]'}`}>{plan.price}</span>
                            </div>

                            <p className={`font-primary text-[.82rem] leading-relaxed text-center mb-4 ${plan.highlight ? 'text-white/75' : 'text-[rgba(255,200,200,.6)]'}`}>
                                {plan.description}
                            </p>

                            <ul className="flex flex-col gap-2 mb-6 flex-1">
                                {plan.features.map((feat) => (
                                    <li key={feat} className={`flex items-start gap-2 font-primary text-[.8rem] leading-snug ${plan.highlight ? 'text-white/80' : 'text-[rgba(255,210,210,.75)]'}`}>
                                        <svg className={`w-4 h-4 shrink-0 mt-[1px] ${plan.highlight ? 'text-white/70' : 'text-red-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                        </svg>
                                        {feat}
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleCheckout(plan.priceId)}
                                disabled={loadingPriceId !== null}
                                className={`w-full py-3 font-primary text-[.87rem] font-bold tracking-[2px] uppercase rounded-xl cursor-pointer transition-all duration-250 text-center disabled:opacity-60 disabled:cursor-not-allowed ${plan.highlight
                                    ? 'bg-white text-red-700 hover:bg-white/90 shadow-[0_4px_20px_rgba(0,0,0,.2)]'
                                    : 'bg-linear-to-br from-red-700 to-red-500 text-white hover:brightness-110 shadow-[0_0_20px_rgba(180,20,20,.35)]'
                                    }`}
                            >
                                {loadingPriceId === plan.priceId ? 'Redirigiendo...' : plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Guarantee banner */}
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 bg-amber-950/40 backdrop-blur-sm border border-amber-400/25 rounded-2xl px-8 py-5 shadow-sm max-w-3xl mx-auto">
                    <div className="text-3xl shrink-0">🛡️</div>
                    <div>
                        <p className="font-primary text-[.82rem] font-black uppercase tracking-[2px] text-amber-400 mb-0.5">Garantía de Subida de Rango</p>
                        <p className="font-primary text-[.85rem] text-[rgba(200,185,240,.65)] leading-snug">
                            Con el <strong className="text-amber-400">Retador Pack</strong> (4–5 sesiones) cubres <strong className="text-white">todos los temas</strong> del programa. Si los completas y no subes de rango, <strong className="text-white">te devolvemos el dinero</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}
