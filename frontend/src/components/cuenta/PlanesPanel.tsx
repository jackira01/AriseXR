'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    getPlansCatalog,
    adminCreatePlan,
    adminUpdatePlan,
    adminDeletePlan,
    type PlanCatalogItem,
    type PlanTimeUnit,
    type AdminPlanPayload,
} from '@/lib/api'
import { formatPlanTime } from '@/lib/plans'

// El backend limita los slugs a este conjunto (enum del modelo Plan)
const PLAN_SLUGS = ['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger'] as const

type ModalMode = { type: 'add' } | { type: 'edit'; plan: PlanCatalogItem } | null

interface PlanFormState {
    slug: string
    name: string
    description: string
    price: string
    currency: string
    totalHours: string
    timeValue: string
    timeUnit: PlanTimeUnit
    stripePriceId: string
    badge: string
    rankImage: string
    featuresText: string
    sortOrder: string
    active: boolean
}

const EMPTY_FORM: PlanFormState = {
    slug: PLAN_SLUGS[0],
    name: '',
    description: '',
    price: '',
    currency: 'USD',
    totalHours: '',
    timeValue: '',
    timeUnit: 'hours',
    stripePriceId: '',
    badge: '',
    rankImage: '',
    featuresText: '',
    sortOrder: '0',
    active: true,
}

export default function PlanesPanel() {
    const { data: session } = useSession()
    const token = (session as { accessToken?: string } | null)?.accessToken ?? ''

    const [plans, setPlans] = useState<PlanCatalogItem[]>([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState<ModalMode>(null)
    const [form, setForm] = useState<PlanFormState>(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState('')

    const loadPlans = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getPlansCatalog()
            setPlans(data)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadPlans() }, [loadPlans])

    const usedSlugs = new Set(plans.map((p) => p.slug))
    const availableSlugs = PLAN_SLUGS.filter((s) => !usedSlugs.has(s as PlanCatalogItem['slug']))

    function setField<K extends keyof PlanFormState>(key: K, value: PlanFormState[K]) {
        setForm((f) => ({ ...f, [key]: value }))
    }

    function openModal(m: NonNullable<ModalMode>) {
        setModal(m)
        setFormError('')
        if (m.type === 'add') {
            setForm({ ...EMPTY_FORM, slug: availableSlugs[0] ?? PLAN_SLUGS[0] })
        } else {
            const p = m.plan
            setForm({
                slug: p.slug,
                name: p.name,
                description: p.description ?? '',
                price: String(p.price ?? ''),
                currency: p.currency ?? 'USD',
                totalHours: String(p.totalHours ?? ''),
                timeValue: p.timeValue != null ? String(p.timeValue) : '',
                timeUnit: p.timeUnit ?? 'hours',
                stripePriceId: p.stripePriceId ?? '',
                badge: p.badge ?? '',
                rankImage: p.rankImage ?? '',
                featuresText: (p.features ?? []).join('\n'),
                sortOrder: String(p.sortOrder ?? 0),
                active: p.active !== false,
            })
        }
    }

    function buildPayload(): AdminPlanPayload {
        return {
            name: form.name.trim(),
            description: form.description.trim(),
            price: Number(form.price) || 0,
            currency: form.currency.trim() || 'USD',
            totalHours: Number(form.totalHours) || 0,
            timeValue: form.timeValue.trim() === '' ? null : Number(form.timeValue),
            timeUnit: form.timeUnit,
            stripePriceId: form.stripePriceId.trim() || null,
            badge: form.badge.trim() || null,
            rankImage: form.rankImage.trim() || null,
            features: form.featuresText.split('\n').map((f) => f.trim()).filter(Boolean),
            sortOrder: Number(form.sortOrder) || 0,
            active: form.active,
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!form.name.trim()) { setFormError('El nombre es requerido'); return }
        if (modal?.type === 'add' && !form.slug) { setFormError('El slug es requerido'); return }
        setSubmitting(true)
        setFormError('')
        try {
            if (modal?.type === 'add') {
                await adminCreatePlan(token, { ...buildPayload(), slug: form.slug as PlanCatalogItem['slug'] })
            } else if (modal?.type === 'edit') {
                await adminUpdatePlan(token, modal.plan.slug, buildPayload())
            }
            await loadPlans()
            setModal(null)
        } catch (err) {
            setFormError((err as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    async function handleDelete(plan: PlanCatalogItem) {
        if (!window.confirm(`¿Eliminar el plan "${plan.name}" (${plan.slug})? Los usuarios con este plan asignado conservarán su asignación histórica.`)) return
        try {
            await adminDeletePlan(token, plan.slug)
            await loadPlans()
        } catch (err) {
            alert((err as Error).message)
        }
    }

    const inputCls = 'bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-red-500/50'
    const labelCls = 'font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]'

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 font-primary text-[.7rem] tracking-[4px] uppercase text-red-500 mb-2">
                        <span className="w-5 h-px bg-red-500 inline-block" />
                        Admin
                    </div>
                    <h2 className="font-serif text-2xl font-bold uppercase text-[#fff0f0]">Planes del Catálogo</h2>
                    <p className="font-primary text-[.78rem] text-[rgba(255,210,210,.4)] mt-1">
                        Gestiona los planes disponibles: precios, tiempos, Stripe y visibilidad
                    </p>
                </div>
                {availableSlugs.length > 0 && (
                    <button
                        onClick={() => openModal({ type: 'add' })}
                        className="flex items-center gap-2 font-primary text-[.78rem] font-bold uppercase tracking-[1.5px] px-4 py-2 rounded-xl bg-red-700/25 border border-red-500/30 text-red-400 hover:bg-red-700/40 transition-colors shrink-0"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo plan
                    </button>
                )}
            </div>

            {/* Plans list */}
            {loading ? (
                <p className="font-primary text-[.78rem] text-[rgba(255,210,210,.35)] text-center py-10">Cargando planes...</p>
            ) : plans.length === 0 ? (
                <div className="bg-red-950/20 border border-red-800/20 rounded-2xl p-8 text-center">
                    <p className="font-primary text-[.82rem] text-[rgba(255,210,210,.4)]">No hay planes. Crea uno para empezar.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {plans.map((plan) => (
                        <div
                            key={plan._id ?? plan.slug}
                            className={`bg-red-950/25 backdrop-blur-sm border rounded-2xl px-5 py-4 flex items-center gap-4 ${plan.active === false ? 'border-red-800/10 opacity-60' : 'border-red-800/20'}`}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={plan.rankImage ?? '/ranks/silver.webp'}
                                alt={plan.name}
                                className="w-11 h-11 object-contain shrink-0"
                                style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.18))' }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="font-serif text-[.95rem] font-bold uppercase text-[#fff0f0] truncate">{plan.name}</h3>
                                    <span className="font-primary text-[.6rem] uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-red-700/20 border border-red-500/25 text-red-400">{plan.slug}</span>
                                    {plan.badge && (
                                        <span className="font-primary text-[.6rem] uppercase tracking-[1.5px] px-2 py-0.5 rounded-full bg-amber-600/15 border border-amber-500/25 text-amber-400">{plan.badge}</span>
                                    )}
                                    <span className={`font-primary text-[.6rem] uppercase tracking-[1.5px] px-2 py-0.5 rounded-full border ${plan.active === false ? 'bg-zinc-600/15 border-zinc-500/25 text-zinc-400' : 'bg-green-600/15 border-green-500/25 text-green-400'}`}>
                                        {plan.active === false ? 'Inactivo' : 'Activo'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                                    <span className="font-primary text-[.78rem] font-bold text-white">${plan.price} {plan.currency ?? 'USD'}</span>
                                    <span className="font-primary text-[.75rem] text-[rgba(255,210,210,.55)]">⏱ {formatPlanTime(plan)}</span>
                                    <span className="font-primary text-[.72rem] text-[rgba(255,210,210,.4)]">{plan.features?.length ?? 0} características</span>
                                    <span className="font-primary text-[.72rem] text-[rgba(255,210,210,.4)]">Orden: {plan.sortOrder ?? 0}</span>
                                    {plan.stripePriceId && (
                                        <span className="font-primary text-[.72rem] text-[rgba(255,210,210,.4)] truncate max-w-45" title={plan.stripePriceId}>
                                            Stripe: {plan.stripePriceId}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => openModal({ type: 'edit', plan })}
                                    title="Editar plan"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(255,210,210,.35)] hover:text-blue-400 hover:bg-blue-950/40 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => handleDelete(plan)}
                                    title="Eliminar plan"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgba(255,210,210,.35)] hover:text-red-400 hover:bg-red-950/40 transition-colors"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {modal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
                    onClick={() => setModal(null)}
                >
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleSubmit}
                        className="w-full max-w-2xl bg-[#1a0a0a] border border-red-800/30 rounded-2xl p-6 flex flex-col gap-5 shadow-xl my-8"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-lg font-bold uppercase text-[#fff0f0]">
                                {modal.type === 'add' ? 'Nuevo plan' : `Editar plan — ${modal.plan.name}`}
                            </h3>
                            <button type="button" onClick={() => setModal(null)} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl">&times;</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Slug */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Slug (identificador)</span>
                                <select
                                    required
                                    value={form.slug}
                                    disabled={modal.type === 'edit'}
                                    onChange={(e) => setField('slug', e.target.value)}
                                    className={`${inputCls} disabled:opacity-50`}
                                >
                                    {(modal.type === 'add' ? availableSlugs : [form.slug]).map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </label>

                            {/* Name */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Nombre</span>
                                <input
                                    type="text" required autoFocus
                                    value={form.name} onChange={(e) => setField('name', e.target.value)}
                                    placeholder="Ej: Diamond Pack"
                                    className={inputCls}
                                />
                            </label>

                            {/* Description */}
                            <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <span className={labelCls}>Descripción</span>
                                <textarea
                                    rows={2}
                                    value={form.description} onChange={(e) => setField('description', e.target.value)}
                                    placeholder="Descripción corta del plan"
                                    className={`${inputCls} resize-none`}
                                />
                            </label>

                            {/* Price */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Precio</span>
                                <input
                                    type="number" min="0" step="0.01" required
                                    value={form.price} onChange={(e) => setField('price', e.target.value)}
                                    placeholder="499"
                                    className={inputCls}
                                />
                            </label>

                            {/* Currency */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Moneda</span>
                                <input
                                    type="text"
                                    value={form.currency} onChange={(e) => setField('currency', e.target.value)}
                                    placeholder="USD"
                                    className={inputCls}
                                />
                            </label>

                            {/* Total hours */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Horas consumibles (interno)</span>
                                <input
                                    type="number" min="0" step="0.5" required
                                    value={form.totalHours} onChange={(e) => setField('totalHours', e.target.value)}
                                    placeholder="20"
                                    className={inputCls}
                                />
                            </label>

                            {/* Time display */}
                            <div className="flex gap-3">
                                <label className="flex flex-col gap-1.5 flex-1">
                                    <span className={labelCls}>Tiempo a mostrar</span>
                                    <input
                                        type="number" min="0" step="0.5"
                                        value={form.timeValue} onChange={(e) => setField('timeValue', e.target.value)}
                                        placeholder="= horas"
                                        className={inputCls}
                                    />
                                </label>
                                <label className="flex flex-col gap-1.5 flex-1">
                                    <span className={labelCls}>Unidad</span>
                                    <select
                                        value={form.timeUnit}
                                        onChange={(e) => setField('timeUnit', e.target.value as PlanTimeUnit)}
                                        className={inputCls}
                                    >
                                        <option value="hours">Horas</option>
                                        <option value="days">Días</option>
                                        <option value="months">Meses</option>
                                    </select>
                                </label>
                            </div>

                            {/* Stripe Price ID */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Stripe Price ID</span>
                                <input
                                    type="text"
                                    value={form.stripePriceId} onChange={(e) => setField('stripePriceId', e.target.value)}
                                    placeholder="price_..."
                                    className={inputCls}
                                />
                            </label>

                            {/* Badge */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Badge (etiqueta)</span>
                                <input
                                    type="text"
                                    value={form.badge} onChange={(e) => setField('badge', e.target.value)}
                                    placeholder="Ej: RECOMENDADO"
                                    className={inputCls}
                                />
                            </label>

                            {/* Rank image */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Imagen de rango (ruta)</span>
                                <input
                                    type="text"
                                    value={form.rankImage} onChange={(e) => setField('rankImage', e.target.value)}
                                    placeholder="/ranks/diamond.png"
                                    className={inputCls}
                                />
                            </label>

                            {/* Sort order */}
                            <label className="flex flex-col gap-1.5">
                                <span className={labelCls}>Orden</span>
                                <input
                                    type="number" step="1"
                                    value={form.sortOrder} onChange={(e) => setField('sortOrder', e.target.value)}
                                    className={inputCls}
                                />
                            </label>

                            {/* Features */}
                            <label className="flex flex-col gap-1.5 sm:col-span-2">
                                <span className={labelCls}>Características (una por línea)</span>
                                <textarea
                                    rows={4}
                                    value={form.featuresText} onChange={(e) => setField('featuresText', e.target.value)}
                                    placeholder={'Retroalimentación personalizada\nCoach en vivo'}
                                    className={`${inputCls} resize-none`}
                                />
                            </label>

                            {/* Active */}
                            <label className="flex items-center gap-3 sm:col-span-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.active}
                                    onChange={(e) => setField('active', e.target.checked)}
                                    className="w-4 h-4 accent-red-500"
                                />
                                <span className={labelCls}>Plan activo (visible en la web)</span>
                            </label>
                        </div>

                        {formError && <p className="font-primary text-[.75rem] text-rose-400">{formError}</p>}

                        <button
                            type="submit" disabled={submitting}
                            className="w-full font-primary text-[.8rem] font-bold uppercase tracking-[2px] py-3 rounded-xl bg-red-700/25 border border-red-500/40 text-red-400 hover:bg-red-700/40 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Guardando...' : 'Guardar'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
