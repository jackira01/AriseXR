'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { adminGetUserProfile, getUserProfile, createCheckoutSession, adminAssignPlan, getPlansCatalog, type PlanCatalogItem } from '@/lib/api'
import { loadPlanCatalog, formatPlanTime } from '@/lib/plans'

export default function PaquetesPanel({ adminUserId, selectedUserName, selectedUserEmail }: { adminUserId?: string; selectedUserName?: string; selectedUserEmail?: string }) {
    const { data: session } = useSession()
    const token = (session as { accessToken?: string } | null)?.accessToken ?? ''
    const userId = (session?.user as { id?: string } | undefined)?.id ?? ''
    const userEmail = session?.user?.email ?? ''
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

    const [adminUserName, setAdminUserName] = useState<string | null>(null)
    const [adminUserPlan, setAdminUserPlan] = useState<string | null>(null)
    const [plans, setPlans] = useState<PlanCatalogItem[]>([])
    const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null)
    const [assigningPlan, setAssigningPlan] = useState<string | null>(null)
    const [assigningClose, setAssigningClose] = useState(false)
    const [confirmPlan, setConfirmPlan] = useState<string | null>(null)
    const [confirmClose, setConfirmClose] = useState(false)
    const [assignError, setAssignError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return

        if (adminUserId) {
            adminGetUserProfile(token, adminUserId).then((p) => {
                setAdminUserName(p.name)
                setAdminUserPlan(p.plan ?? null)
            })
        } else {
            getUserProfile(token).then((p) => {
                setAdminUserName(p.name)
                setAdminUserPlan(p.plan ?? null)
            })
        }
    }, [adminUserId, token])

    useEffect(() => {
        void loadPlanCatalog()
        void getPlansCatalog().then((data) => {
            const activePlans = (data ?? []).filter((plan) => plan.active !== false)
            setPlans(activePlans)
        })
    }, [])

    useEffect(() => {
        const resetLoadingState = () => setLoadingPriceId(null)

        window.addEventListener('pageshow', resetLoadingState)
        window.addEventListener('focus', resetLoadingState)
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                resetLoadingState()
            }
        })

        return () => {
            window.removeEventListener('pageshow', resetLoadingState)
            window.removeEventListener('focus', resetLoadingState)
        }
    }, [])

    // The user's active plan
    const currentPlan = plans.find((p) =>
        adminUserPlan ? p.slug === adminUserPlan : false
    )

    return (
        <div className="flex flex-col gap-8">
            {/* Header with banner on the right */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 font-primary text-[.7rem] tracking-[4px] uppercase text-red-500 mb-2">
                        <span className="w-5 h-px bg-red-500 inline-block" />
                        Paquetes
                    </div>
                    <h2 className="font-serif text-2xl font-bold uppercase text-[#fff0f0]">Paquetes Disponibles</h2>
                </div>
                {/* Banner usuario seleccionado */}
                {adminUserId && selectedUserName && (
                    <div className="flex items-center gap-3 bg-red-950/40 border border-red-700/30 rounded-xl px-5 py-3 shrink-0">
                        <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1118.88 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex flex-col">
                            <span className="font-primary font-semibold text-[.88rem] text-[#fff0f0] leading-tight">{selectedUserName}</span>
                            {selectedUserEmail && <span className="font-primary text-[.73rem] text-[rgba(255,210,210,.5)] leading-tight">{selectedUserEmail}</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* Subtitle */}
            <p className="font-primary text-[.88rem] text-[rgba(255,210,210,.5)]">
                {adminUserId && adminUserName
                    ? `Paquetes disponibles para ${adminUserName}.`
                    : !adminUserPlan
                        ? 'No has comprado ningún paquete. Empieza eligiendo uno de los siguientes.'
                        : 'Tu paquete actual está resaltado. Puedes cambiar o hacer upgrade en cualquier momento.'}
            </p>

            {/* Current plan summary banner */}
            {currentPlan && (
                <div className="bg-red-950/40 backdrop-blur-sm border border-red-700/30 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentPlan.rankImage ?? '/ranks/silver.webp'} alt={currentPlan.name} className="w-12 h-12 object-contain shrink-0"
                        style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.24))' }} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-serif text-[1.1rem] font-bold uppercase text-white">{currentPlan.name}</span>
                            <span className="font-primary text-[.6rem] font-black tracking-[3px] uppercase px-3 py-0.5 rounded-full bg-linear-to-r from-cyan-500/80 to-blue-500/80 text-white">Paquete Activo</span>
                        </div>
                        <div className="flex gap-5 mt-2 flex-wrap">
                            {[formatPlanTime(currentPlan), 'seguimiento activo', 'contenido guiado'].map((d) => (
                                <span key={d} className="font-primary text-[.78rem] text-[rgba(255,210,210,.6)]">{d}</span>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <span className="font-primary text-[1.8rem] font-black text-white">${currentPlan.price} USD</span>
                        {adminUserId && (
                            confirmClose ? (
                                <div className="flex flex-col gap-2 items-end">
                                    <p className="font-primary text-[.68rem] text-right text-[rgba(255,210,210,.7)]">¿Cerrar la orden activa del usuario?</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                try {
                                                    setAssigningClose(true)
                                                    await adminAssignPlan(token, adminUserId, null)
                                                    setAdminUserPlan(null)
                                                    setConfirmClose(false)
                                                } catch (err) {
                                                    console.error('[Admin] Error cerrando orden:', err)
                                                } finally {
                                                    setAssigningClose(false)
                                                }
                                            }}
                                            disabled={assigningClose}
                                            className="px-4 py-1.5 bg-linear-to-br from-red-700 to-red-500 text-white font-primary text-[.68rem] font-bold tracking-[1px] uppercase rounded-xl hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {assigningClose ? 'Cerrando...' : 'Confirmar'}
                                        </button>
                                        <button
                                            onClick={() => setConfirmClose(false)}
                                            disabled={assigningClose}
                                            className="px-4 py-1.5 bg-white/10 text-white/70 font-primary text-[.68rem] font-bold tracking-[1px] uppercase rounded-xl hover:bg-white/15 transition-all duration-200 disabled:opacity-60"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmClose(true)}
                                    disabled={assigningClose || assigningPlan !== null}
                                    className="px-5 py-2 bg-red-900/60 border border-red-600/40 text-red-300 font-primary text-[.72rem] font-bold tracking-[2px] uppercase rounded-xl hover:bg-red-800/60 hover:text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    Cerrar Orden
                                </button>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Plan cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 xl:gap-3">
                {plans.map((plan) => {
                    const isCurrent = adminUserPlan ? plan.slug === adminUserPlan : false
                    return (
                        <div
                            key={plan.name}
                            className={`relative flex flex-col rounded-2xl p-4 xl:p-3 border transition-all duration-300 ${isCurrent
                                ? 'bg-linear-to-br from-red-800/90 to-red-700/80 border-red-500/40 shadow-[0_0_40px_rgba(180,20,20,.4)]'
                                : 'bg-red-950/25 backdrop-blur-sm border-red-800/20 hover:border-red-700/40 hover:bg-red-950/35'
                                }`}
                        >
                            {isCurrent && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 font-primary text-[.5rem] xl:text-[.48rem] font-black tracking-[2px] xl:tracking-[1.5px] uppercase px-2.5 py-0.5 rounded-full bg-linear-to-r from-cyan-400 to-blue-400 text-white shadow-lg whitespace-nowrap">
                                    {adminUserId ? 'PAQUETE DEL USUARIO' : 'TU PAQUETE ACTUAL'}
                                </div>
                            )}

                            {/* Rank image */}
                            <div className="flex justify-center mb-2">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={plan.rankImage ?? '/ranks/silver.webp'} alt={plan.name} className="w-10 xl:w-9 h-10 xl:h-9 object-contain"
                                    style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }} />
                            </div>

                            {/* Name + price */}
                            <h3 className={`font-serif text-[0.95rem] xl:text-[0.85rem] font-bold uppercase text-center leading-tight mb-0.5 ${isCurrent ? 'text-white' : 'text-[#fff0f0]'}`}>
                                {plan.name}
                            </h3>
                            <p className={`font-primary text-[1.3rem] xl:text-[1.1rem] font-black text-center leading-none mb-2.5 xl:mb-2 ${isCurrent ? 'text-white' : 'text-[#fff0f0]'}`}>
                                ${plan.price} USD
                            </p>

                            {/* Details row */}
                            <div className={`flex flex-col gap-0.5 mb-2.5 xl:mb-2 pb-2.5 xl:pb-2 border-b ${isCurrent ? 'border-white/15' : 'border-red-800/20'}`}>
                                {[
                                    { icon: '⏱', val: formatPlanTime(plan) },
                                    { icon: '🎮', val: 'seguimiento activo' },
                                    { icon: '📚', val: 'contenido guiado' },
                                ].map((d) => (
                                    <div key={d.val} className={`flex items-center gap-1.5 font-primary text-[.7rem] xl:text-[.63rem] ${isCurrent ? 'text-red-100' : 'text-[rgba(255,210,210,.7)]'}`}>
                                        <span>{d.icon}</span> {d.val}
                                    </div>
                                ))}
                            </div>

                            {/* Features */}
                            <ul className="flex flex-col gap-1 mb-3 xl:mb-2.5 flex-1">
                                {(plan.features ?? []).map((f) => (
                                    <li key={f} className={`flex items-start gap-1.5 font-primary text-[.65rem] xl:text-[.6rem] ${isCurrent ? 'text-white/80' : 'text-[rgba(255,210,210,.6)]'}`}>
                                        <svg className={`w-3 h-3 shrink-0 mt-px ${isCurrent ? 'text-cyan-300' : 'text-red-400'}`} viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                                        </svg>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            {/* CTA */}
                            {isCurrent ? (
                                <div className="w-full py-2 xl:py-1.5 bg-white/15 text-white font-primary text-[.65rem] xl:text-[.6rem] font-bold tracking-[1.5px] xl:tracking-[1px] uppercase rounded-xl text-center border border-white/20">
                                    ✓ {adminUserId ? 'Paquete del Usuario' : 'Paquete Activo'}
                                </div>
                            ) : adminUserId ? (
                                confirmPlan === plan.name ? (
                                    <div className="flex flex-col gap-1.5">
                                        <p className="font-primary text-[.6rem] xl:text-[.55rem] text-center text-[rgba(255,210,210,.7)]">¿Asignar <strong className="text-white">{plan.name}</strong> a este usuario?</p>
                                        {assignError && (
                                            <p className="font-primary text-[.55rem] xl:text-[.5rem] text-center text-red-400">{assignError}</p>
                                        )}
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        setAssigningPlan(plan.name)
                                                        setAssignError(null)
                                                        await adminAssignPlan(token, adminUserId, plan.slug)
                                                        setAdminUserPlan(plan.slug)
                                                        setConfirmPlan(null)
                                                    } catch (err) {
                                                        console.error('[Admin] Error asignando plan:', err)
                                                        setAssignError(err instanceof Error ? err.message : 'Error al asignar el plan')
                                                    } finally {
                                                        setAssigningPlan(null)
                                                    }
                                                }}
                                                disabled={assigningPlan !== null}
                                                className="flex-1 py-1.5 bg-linear-to-br from-emerald-600 to-green-500 text-white font-primary text-[.6rem] xl:text-[.55rem] font-bold tracking-[0.5px] uppercase rounded-xl hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {assigningPlan === plan.name ? 'Asignando...' : 'Confirmar'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmPlan(null)}
                                                disabled={assigningPlan !== null}
                                                className="flex-1 py-1.5 bg-white/10 text-white/70 font-primary text-[.6rem] xl:text-[.55rem] font-bold tracking-[0.5px] uppercase rounded-xl hover:bg-white/15 transition-all duration-200 disabled:opacity-60"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setConfirmPlan(plan.name)}
                                        disabled={assigningPlan !== null || assigningClose}
                                        className="w-full py-2 xl:py-1.5 bg-linear-to-br from-emerald-700 to-green-600 text-white font-primary text-[.65rem] xl:text-[.6rem] font-bold tracking-[1.5px] xl:tracking-[1px] uppercase rounded-xl text-center hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        Cambiar
                                    </button>
                                )
                            ) : isAdmin ? (
                                <div className="w-full py-2 xl:py-1.5 bg-white/5 text-[rgba(255,210,210,.35)] font-primary text-[.6rem] xl:text-[.55rem] tracking-[1px] uppercase rounded-xl text-center border border-white/10 cursor-not-allowed">
                                    Selecciona un usuario
                                </div>
                            ) : (
                                <button
                                    onClick={async () => {
                                        try {
                                            const effectivePriceId = plan.stripePriceId
                                            if (!effectivePriceId) return
                                            setLoadingPriceId(effectivePriceId)
                                            const url = await createCheckoutSession(token, userId, userEmail, effectivePriceId)
                                            window.location.assign(url)
                                        } catch (err) {
                                            console.error('[Stripe] Error al iniciar el pago:', err)
                                            setLoadingPriceId(null)
                                        }
                                    }}
                                    disabled={loadingPriceId !== null}
                                    className="w-full py-2 xl:py-1.5 bg-linear-to-br from-red-700 to-red-500 text-white font-primary text-[.65rem] xl:text-[.6rem] font-bold tracking-[1.5px] xl:tracking-[1px] uppercase rounded-xl text-center hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {loadingPriceId === (plan.stripePriceId ?? '') ? 'Redirigiendo...' : 'Comprar Paquete'}
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
