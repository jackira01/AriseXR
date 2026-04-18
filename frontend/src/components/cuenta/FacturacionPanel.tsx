'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getUserInvoices, adminGetUserInvoices, type InvoiceRecord } from '@/lib/api'

type InvoiceStatus = 'Pagado' | 'Pendiente' | 'Procesando'

const STATUS_CLS: Record<InvoiceStatus, string> = {
    Pagado: 'text-green-400 bg-green-500/10 border-green-500/25',
    Pendiente: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
    Procesando: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
}

function formatAmount(amount: number, currency: string) {
    return `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.toUpperCase()}`
}

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: '2-digit' })
}

export default function FacturacionPanel({ adminUserId, selectedUserName, selectedUserEmail }: { adminUserId?: string; selectedUserName?: string; selectedUserEmail?: string }) {
    const { data: session } = useSession()
    const token = (session as { accessToken?: string } | null)?.accessToken ?? ''
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'

    const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!token) return

        // Admin sin usuario seleccionado — no cargamos nada
        if (isAdmin && !adminUserId) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        const fetcher = adminUserId
            ? adminGetUserInvoices(token, adminUserId)
            : getUserInvoices(token)

        fetcher
            .then(setInvoices)
            .catch(() => setError('No se pudieron cargar las facturas.'))
            .finally(() => setLoading(false))
    }, [token, adminUserId, isAdmin])

    const totalPaid = invoices.filter((i) => i.status === 'Pagado').reduce((acc, i) => acc + i.amount, 0)
    const totalPending = invoices.filter((i) => i.status === 'Pendiente').reduce((acc, i) => acc + i.amount, 0)
    const currency = invoices[0]?.currency ?? 'USD'

    return (
        <div className="flex flex-col gap-8">
            {/* Header with banner on the right */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 font-primary text-[.7rem] tracking-[4px] uppercase text-red-500 mb-2">
                        <span className="w-5 h-px bg-red-500 inline-block" />
                        Facturación
                    </div>
                    <h2 className="font-serif text-2xl font-bold uppercase text-[#fff0f0]">
                        {adminUserId ? 'Facturas del Usuario' : 'Tus Facturas'}
                    </h2>
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

            {/* Admin sin usuario seleccionado */}
            {isAdmin && !adminUserId && (
                <div className="bg-red-950/20 border border-red-800/20 rounded-2xl px-8 py-14 text-center">
                    <p className="text-4xl mb-4">👤</p>
                    <p className="font-primary text-[.92rem] text-[rgba(255,210,210,.55)]">
                        Selecciona un usuario desde el panel lateral para ver sus facturas.
                    </p>
                </div>
            )}

            {/* Loading */}
            {loading && (isAdmin ? !!adminUserId : true) && (
                <div className="bg-red-950/20 border border-red-800/20 rounded-2xl px-8 py-14 text-center">
                    <p className="font-primary text-[.88rem] text-[rgba(255,210,210,.4)] animate-pulse">Cargando facturas...</p>
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="bg-red-950/20 border border-red-800/20 rounded-2xl px-8 py-10 text-center">
                    <p className="font-primary text-[.88rem] text-red-400">{error}</p>
                </div>
            )}

            {/* Contenido */}
            {!loading && !error && (isAdmin ? !!adminUserId : true) && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
                            {[
                                { label: 'Total Pagado', value: `$${totalPaid.toLocaleString('es-MX')} ${currency}`, color: 'text-green-400', icon: '✓' },
                                { label: 'Pendiente', value: `$${totalPending.toLocaleString('es-MX')} ${currency}`, color: 'text-amber-400', icon: '⏳' },
                                { label: 'Facturas Totales', value: `${invoices.length}`, color: 'text-red-400', icon: '🧾' },
                            ].map((s) => (
                                <div key={s.label} className="bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-1">
                                    <span className="text-xl mb-1">{s.icon}</span>
                                    <p className={`font-primary text-[1.5rem] font-black leading-none ${s.color}`}>{s.value}</p>
                                    <p className="font-primary text-[.68rem] uppercase tracking-[2px] text-[rgba(255,210,210,.45)] mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Próximo cobro pendiente */}
                        {(() => {
                            const next = invoices.find((i) => i.status === 'Pendiente')
                            if (!next) return null
                            return (
                                <div className="bg-amber-950/25 backdrop-blur-sm border border-amber-700/25 rounded-2xl p-5 flex flex-col justify-between">
                                    <div>
                                        <span className="font-primary text-[.65rem] uppercase tracking-[3px] text-amber-500/80">Próximo Cobro</span>
                                        <p className="font-primary text-[1.6rem] font-black text-amber-400 leading-none mt-2">{formatAmount(next.amount, next.currency)}</p>
                                        <p className="font-primary text-[.78rem] text-[rgba(255,210,210,.6)] mt-1">{next.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                        <span className="font-primary text-[.72rem] text-amber-400/80">{formatDate(next.createdAt)}</span>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>

                    {/* Tabla */}
                    <div className="bg-red-950/20 backdrop-blur-sm border border-red-800/20 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-red-800/20 bg-red-950/30">
                            <span className="font-primary text-[.82rem] font-semibold text-[rgba(255,210,210,.8)]">Historial de Facturas</span>
                        </div>
                        <div className="hidden sm:grid grid-cols-[1.2fr_1.5fr_2.5fr_1.2fr_1fr] gap-4 px-6 py-3 border-b border-red-800/20 bg-red-950/20">
                            {['ID', 'Fecha', 'Descripción', 'Monto', 'Estado'].map((h) => (
                                <span key={h} className="font-primary text-[.65rem] uppercase tracking-[2px] text-[rgba(255,210,210,.35)]">{h}</span>
                            ))}
                        </div>

                        {invoices.length === 0 ? (
                            <div className="px-6 py-14 text-center">
                                <p className="font-primary text-[.88rem] text-[rgba(255,210,210,.35)]">No hay facturas registradas.</p>
                            </div>
                        ) : (
                            invoices.map((inv, i) => (
                                <div
                                    key={inv._id}
                                    className={`grid grid-cols-1 sm:grid-cols-[1.2fr_1.5fr_2.5fr_1.2fr_1fr] gap-2 sm:gap-4 px-6 py-4 transition-colors hover:bg-red-950/20 ${i < invoices.length - 1 ? 'border-b border-red-800/15' : ''}`}
                                >
                                    <span className="font-primary text-[.72rem] font-bold text-[rgba(255,210,210,.4)] truncate" title={inv.stripeSessionId}>
                                        {inv.stripeSessionId.slice(0, 12)}…
                                    </span>
                                    <span className="font-primary text-[.82rem] text-[rgba(255,210,210,.7)]">{formatDate(inv.createdAt)}</span>
                                    <span className="font-primary text-[.82rem] text-[#fff0f0]">{inv.description}</span>
                                    <span className="font-primary text-[.88rem] font-bold text-[#fff0f0]">{formatAmount(inv.amount, inv.currency)}</span>
                                    <span className={`self-start font-primary text-[.68rem] font-bold uppercase tracking-[1.5px] px-2.5 py-1 rounded-full border ${STATUS_CLS[inv.status]}`}>
                                        {inv.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
