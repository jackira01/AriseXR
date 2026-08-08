'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import SeguimientoPanel from '@/components/cuenta/SeguimientoPanel'
import ChatPanel from '@/components/cuenta/ChatPanel'
import FacturacionPanel from '@/components/cuenta/FacturacionPanel'
import PaquetesPanel from '@/components/cuenta/PaquetesPanel'
import PlanesPanel from '@/components/cuenta/PlanesPanel'
import TemasPanel from '@/components/cuenta/TemasPanel'
import UserSearchFilter from '@/components/cuenta/UserSearchFilter'
import { signOut } from 'next-auth/react'
import { getUserProfile, type AdminUserSummary } from '@/lib/api'

type Tab = 'seguimiento' | 'chat' | 'facturacion' | 'paquetes' | 'temas' | 'planes'

// Panel de administración de planes: solo visible si la variable de entorno está en 'true'
const PLANS_PANEL_ENABLED = process.env.NEXT_PUBLIC_ADMIN_PLANS_PANEL === 'true'

const USER_TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'seguimiento', label: 'Seguimiento', icon: '📈' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'facturacion', label: 'Facturación', icon: '🧾' },
    { id: 'paquetes', label: 'Paquetes', icon: '📦' },
]

const ADMIN_TABS: { id: Tab; label: string; icon: string }[] = [
    ...USER_TABS,
    { id: 'temas', label: 'Temas', icon: '📚' },
    ...(PLANS_PANEL_ENABLED ? [{ id: 'planes' as Tab, label: 'Planes', icon: '🎯' }] : []),
]

export default function CuentaClient() {
    const { data: session } = useSession()
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
    const TABS = isAdmin ? ADMIN_TABS : USER_TABS

    const [activeTab, setActiveTab] = useState<Tab>('seguimiento')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [selectedUser, setSelectedUser] = useState<AdminUserSummary | null>(null)

    const [hasPlanStatus, setHasPlanStatus] = useState<boolean>(true)
    const [hasInvoices, setHasInvoices] = useState<boolean>(true)
    const [loadingProfile, setLoadingProfile] = useState<boolean>(true)

    useEffect(() => {
        if (!session?.user) {
            setLoadingProfile(false)
            return
        }
        if (isAdmin) {
            setLoadingProfile(false)
            return
        }

        const token = (session as { accessToken?: string } | null)?.accessToken ?? ''
        getUserProfile(token)
            .then(profile => {
                setHasPlanStatus(!!profile.planActive || !!profile.hasPlan || !!profile.plan)
                setHasInvoices(Array.isArray(profile.invoices) && profile.invoices.length > 0)
            })
            .catch(err => {
                console.error(err)
            })
            .finally(() => {
                setLoadingProfile(false)
            })
    }, [session, isAdmin])

    function handleTabClick(id: Tab) {
        setActiveTab(id)
        // setSidebarOpen(false)
    }

    const needsCTA = !isAdmin && !hasPlanStatus && !hasInvoices && !loadingProfile
    const isLockedTab = needsCTA && (activeTab === 'seguimiento' || activeTab === 'chat' || activeTab === 'temas')

    return (
        <div className="min-h-screen bg-[#080102] text-[#fff0f0]">
            {/* Background */}
            <div
                className="fixed inset-0 z-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 20%, rgba(120,5,5,.45) 0%, transparent 65%), radial-gradient(ellipse 50% 50% at 80% 80%, rgba(80,0,0,.3) 0%, transparent 65%)' }}
            />

            {/* Header */}
            <header className="relative z-30 border-b border-red-800/20 bg-[#080102]/90 backdrop-blur-[12px] sticky top-0">
                <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="AriseXR" className="h-8 w-auto transition-opacity duration-200 group-hover:opacity-75" />
                        <span className="font-primary text-[.78rem] uppercase tracking-[3px] text-[rgba(255,210,210,.4)] group-hover:text-[rgba(255,210,210,.65)] transition-colors duration-200">Panel</span>
                    </Link>
                    <div className="flex items-center gap-5">
                        <span className="hidden sm:block font-primary text-[.78rem] uppercase tracking-[2px] text-red-500/70">
                            {TABS.find((t) => t.id === activeTab)?.label}
                        </span>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="font-primary text-[.78rem] uppercase tracking-[2px] text-[rgba(255,210,210,.4)] hover:text-red-400 transition-colors duration-200"
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Sidebar toggle button ──────────────────────────────────────── */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed right-6 top-1/2 -translate-y-1/2 z-35 w-10 h-10 rounded-full flex items-center justify-center bg-red-950/60 border border-red-800/40 text-[rgba(255,210,210,.7)] hover:text-red-400 hover:bg-red-950/80 hover:border-red-700/60 transition-all duration-200"
                aria-label={sidebarOpen ? 'Cerrar sidebar' : 'Abrir sidebar'}
            >
                <svg className={`w-5 h-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* ── Sidebar overlay ──────────────────────────────────────── */}
            <div
                className="fixed left-0 top-16 bottom-0 z-40 w-64 flex flex-col bg-[#0c0101]/95 backdrop-blur-xl border-r border-red-800/25 shadow-[4px_0_40px_rgba(0,0,0,.55)] transition-transform duration-300 ease-out"
                style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
            >

                {/* Logo / label */}
                <div className="px-6 pt-6 pb-5 border-b border-red-800/15 shrink-0">
                    <span className="font-primary text-[.65rem] uppercase tracking-[4px] text-red-500/70">Navegación</span>
                </div>

                {/* Admin user filter — top of sidebar, above nav tabs */}
                {isAdmin && (
                    <div className="px-3 pt-4 pb-3 border-b border-red-800/15 shrink-0 relative z-50">
                        <span className="block font-primary text-[.6rem] uppercase tracking-[3px] text-red-500/60 mb-2 px-1">Ver como</span>
                        <UserSearchFilter selected={selectedUser} onSelect={setSelectedUser} />
                    </div>
                )}

                {/* Nav tabs */}
                <nav className="flex flex-col gap-1.5 px-3 pt-5 pb-4 flex-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl font-primary text-[.88rem] font-semibold tracking-[.5px] transition-all duration-200 text-left ${activeTab === tab.id
                                ? 'bg-red-700/80 text-white shadow-[0_0_20px_rgba(180,20,20,.35)]'
                                : 'text-[rgba(255,210,210,.6)] hover:bg-red-950/50 hover:text-[#fff0f0]'
                                }`}
                        >
                            <span className="text-base w-5 text-center">{tab.icon}</span>
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Sign-out at bottom */}
                <div className="px-3 pb-6 pt-3 border-t border-red-800/15 shrink-0">
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-primary text-[.82rem] text-[rgba(255,210,210,.45)] hover:text-red-400 hover:bg-red-950/40 transition-all duration-200"
                    >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar sesión
                    </button>
                </div>
            </div>

            {/* ── Main content — full width ──────────────────────────── */}
            <main className="relative z-10 max-w-7xl mx-auto px-5 sm:px-10 py-8">
                {isLockedTab ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center my-12 bg-red-950/20 backdrop-blur-sm border border-red-800/30 rounded-2xl p-10 mx-auto max-w-2xl shadow-[0_0_30px_rgba(180,20,20,.1)]">
                        <span className="text-5xl mb-6 grayscale text-red-500/80">🔒</span>
                        <h2 className="font-serif text-3xl font-bold uppercase text-[#fff0f0] mb-3">Desbloquea tu potencial</h2>
                        <p className="font-primary text-[.95rem] text-[rgba(255,210,210,.6)] mb-8 max-w-md">
                            Adquiere uno de nuestros paquetes de entrenamiento y obtén acceso total al seguimiento de tus métricas, historiales y chat directo con el coach.
                        </p>
                        <button
                            onClick={() => setActiveTab('paquetes')}
                            className="bg-linear-to-r from-red-600 to-red-800 text-white font-primary font-bold tracking-[2px] uppercase text-[.85rem] px-8 py-3.5 rounded-full hover:shadow-[0_0_20px_rgba(220,38,38,.4)] transition-all duration-300 border border-red-500/30"
                        >
                            Ver paquetes disponibles
                        </button>
                    </div>
                ) : (
                    <>
                        {activeTab === 'seguimiento' && <SeguimientoPanel adminUserId={selectedUser?._id} selectedUserName={selectedUser?.name} selectedUserEmail={selectedUser?.email} />}
                        {activeTab === 'chat' && <ChatPanel isAdmin={isAdmin} />}
                        {activeTab === 'facturacion' && <FacturacionPanel adminUserId={selectedUser?._id} selectedUserName={selectedUser?.name} selectedUserEmail={selectedUser?.email} />}
                        {activeTab === 'paquetes' && <PaquetesPanel adminUserId={selectedUser?._id} selectedUserName={selectedUser?.name} selectedUserEmail={selectedUser?.email} />}
                        {activeTab === 'temas' && isAdmin && <TemasPanel />}
                        {activeTab === 'planes' && isAdmin && PLANS_PANEL_ENABLED && <PlanesPanel />}
                    </>
                )}
            </main>
        </div>
    )
}
