'use client'

import { useState } from 'react'
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
