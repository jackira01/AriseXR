'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    adminGetUserProfile,
    adminGetUserSessions,
    getUserProfile,
    adminAddSession,
    adminAddBaseHours,
    adminUpdateUserTopicStatus,
    adminUpsertTopicStatus,
    adminUpdateSession,
    adminDeleteSession,
    getTopicsCatalog,
    adminCreateTarea,
    adminUpdateTarea,
    adminDeleteTarea,
    updateMiTarea,
    adminGetAllTools,
    adminGetUserTools,
    adminUpdateToolStatus,
    adminAddToolToUser,
    type CatalogCategory,
    type UserProfile,
    type UserSession,
    type ITarea,
    type ITool,
} from '@/lib/api'
import { getPlanDefinition } from '@/lib/plans'

// ── Plan base por defecto (en una app real vendría del perfil del usuario) ──────────
const CURRENT_PLAN = {
    name: 'Sin paquete activo',
    totalHours: 0,
}



type TopicStatus = 'completado' | 'en-progreso' | 'pendiente'

// ── Compute last 4 Mon–Sun week buckets from a sessions list ─────────────
function computeWeekBreakdown(
    sessions: { date: string; hours: number }[]
) {
    const today = new Date()
    const dow = today.getDay() // 0=Sun
    const offsetToMonday = dow === 0 ? -6 : 1 - dow
    const thisMonday = new Date(today)
    thisMonday.setDate(today.getDate() + offsetToMonday)
    thisMonday.setHours(0, 0, 0, 0)

    const fmt = (d: Date) =>
        `${d.getDate()} ${d.toLocaleString('es', { month: 'short' })}`

    return Array.from({ length: 4 }, (_, i) => {
        const start = new Date(thisMonday)
        start.setDate(thisMonday.getDate() - (3 - i) * 7)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        end.setHours(23, 59, 59, 999)

        const done = sessions
            .filter((s) => { const d = new Date(s.date); return d >= start && d <= end })
            .reduce((acc, s) => acc + s.hours, 0)

        return { label: `Sem ${i + 1} (${fmt(start)}–${fmt(end)})`, done }
    })
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string; selectCls: string }> = {
    completado: { label: 'Completado', cls: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-400', selectCls: 'bg-[#0d2414] text-green-400 border-green-500/40 focus:ring-green-500/30' },
    'en-progreso': { label: 'En Progreso', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400 animate-pulse', selectCls: 'bg-[#0a1a2e] text-blue-400 border-blue-500/40 focus:ring-blue-500/30' },
    pendiente: { label: 'Pendiente', cls: 'bg-red-950/40 text-[rgba(255,210,210,.5)] border-red-800/25', dot: 'bg-[rgba(255,210,210,.25)]', selectCls: 'bg-[#1a0a0a] text-[rgba(255,210,210,.55)] border-red-800/35 focus:ring-red-500/20' },
}

// Status cycle order for topic edit mode
const STATUS_CYCLE: TopicStatus[] = ['pendiente', 'en-progreso', 'completado']

const TAREA_STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
    completada: { label: 'Completada', cls: 'bg-green-500/15 text-green-400 border-green-500/30', dot: 'bg-green-400' },
    pendiente: { label: 'Pendiente', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25', dot: 'bg-amber-400' },
}

export default function SeguimientoPanel({ adminUserId, selectedUserName, selectedUserEmail }: { adminUserId?: string; selectedUserName?: string; selectedUserEmail?: string }) {
    const { data: session } = useSession()
    const token = (session as { accessToken?: string } | null)?.accessToken ?? ''
    const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'admin'
    // ── Topic catalog (loaded from DB) ──────────────────────────────────
    const [catalog, setCatalog] = useState<CatalogCategory[]>([])

    const loadCatalog = useCallback(async () => {
        if (!token) return
        try {
            const data = await getTopicsCatalog(token)
            setCatalog(data)
        } catch { /* silently ignore */ }
    }, [token])

    useEffect(() => { loadCatalog() }, [loadCatalog])

    // Flat list derived from live catalog (used for topic search in modal)
    const allTopicsFlat = catalog.flatMap((cat) =>
        cat.topics.map((t) => ({ name: t.name, category: cat.name }))
    )
    // ── Admin state ──────────────────────────────────────────────────────
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
    const [userSessions, setUserSessions] = useState<UserSession[]>([])
    const [loadingAdmin, setLoadingAdmin] = useState(false)

    // ── Horas modals ──────────────────────────────────────────────────────
    const [horasModal, setHorasModal] = useState<'complete' | 'add' | null>(null)
    const [formHours, setFormHours] = useState('')
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0])
    const [formNotes, setFormNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState('')
    // ── Topic search (inside Completar horas modal) ───────────────────────
    const [topicSearch, setTopicSearch] = useState('')
    const [topicSearchResults, setTopicSearchResults] = useState<{ name: string; category: string }[]>([])
    const [selectedTopics, setSelectedTopics] = useState<string[]>([])

    // ── Per-category topic editing ────────────────────────────────────────
    const [editingCatTitle, setEditingCatTitle] = useState<string | null>(null)
    // editDraft keyed by topic NAME (works for topics with or without _id)
    const [editDraft, setEditDraft] = useState<Record<string, TopicStatus>>({})
    const [savingEdits, setSavingEdits] = useState(false)
    const [editError, setEditError] = useState('')
    // openDropdown: key is topic name, value is whether dropdown is open
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)

    // ── Session detail / edit modals ─────────────────────────────────────
    const [viewSession, setViewSession] = useState<UserSession | null>(null)
    const [editSession, setEditSession] = useState<UserSession | null>(null)
    const [editForm, setEditForm] = useState({ hours: '', topic: '', notes: '', date: '' })
    const [editSubmitting, setEditSubmitting] = useState(false)
    const [editFormError, setEditFormError] = useState('')
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

    // ── Tareas state ──────────────────────────────────────────────────────
    const [tareasModal, setTareasModal] = useState<'create' | 'edit' | null>(null)
    const [editingTarea, setEditingTarea] = useState<ITarea | null>(null)
    const [viewTarea, setViewTarea] = useState<ITarea | null>(null)
    const [tareaForm, setTareaForm] = useState({ titulo: '', texto: '', estado: 'pendiente' as 'pendiente' | 'completada' })
    const [tareaSubmitting, setTareaSubmitting] = useState(false)
    const [tareaError, setTareaError] = useState('')
    const [tareaDeleteConfirmId, setTareaDeleteConfirmId] = useState<string | null>(null)
    const [tareaStatusDropdown, setTareaStatusDropdown] = useState<string | null>(null)

    // ── Herramientas state ────────────────────────────────────────────────
    const [allTools, setAllTools] = useState<ITool[]>([])
    const [userTools, setUserTools] = useState<ITool[]>([])
    const [loadingTools, setLoadingTools] = useState(false)
    const [updatingTool, setUpdatingTool] = useState<string | null>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!openDropdown && !tareaStatusDropdown) return
        const handler = () => { setOpenDropdown(null); setTareaStatusDropdown(null) }
        window.addEventListener('click', handler)
        return () => window.removeEventListener('click', handler)
    }, [openDropdown, tareaStatusDropdown])

    // ── Computed values (admin vs static) ────────────────────────────────
    const PLAN_CONFIG: Record<string, { name: string; totalHours: number }> = {
        silver: { name: 'Silver Pack', totalHours: 4 },
        esmerald: { name: 'Esmerald Pack', totalHours: 10 },
        diamond: { name: 'Diamond Pack', totalHours: 18 },
        challenger: { name: 'Chall Pack', totalHours: 32 },
    }

    useEffect(() => {
        if (!token) {
            setUserProfile(null)
            setUserSessions([])
            return
        }

        setLoadingAdmin(true)
        setEditingCatTitle(null)
        setEditDraft({})

        if (adminUserId) {
            Promise.all([
                adminGetUserProfile(token, adminUserId),
                adminGetUserSessions(token, adminUserId),
            ])
                .then(([profile, sessions]) => {
                    setUserProfile(profile)
                    setUserSessions(sessions)
                })
                .finally(() => setLoadingAdmin(false))
        } else {
            getUserProfile(token)
                .then((profile) => {
                    setUserProfile(profile as any)
                    setUserSessions(profile.sessions || [])
                })
                .finally(() => setLoadingAdmin(false))
        }
    }, [adminUserId, token])

    // ── Load all tools and user tools ──────────────────────────────────────
    useEffect(() => {
        if (!token || !isAdmin) return

        setLoadingTools(true)
        Promise.all([
            adminGetAllTools(token),
            adminUserId ? adminGetUserTools(token, adminUserId) : Promise.resolve([]),
        ])
            .then(([all, user]) => {
                setAllTools(all)
                setUserTools(user)
            })
            .catch(() => { /* silently ignore */ })
            .finally(() => setLoadingTools(false))
    }, [token, isAdmin, adminUserId])

    const planCfg = userProfile?.plan
        ? (PLAN_CONFIG[userProfile.plan] ?? getPlanDefinition(userProfile.plan) ? { name: getPlanDefinition(userProfile.plan)!.name, totalHours: getPlanDefinition(userProfile.plan)!.totalHours } : CURRENT_PLAN)
        : CURRENT_PLAN

    const baseHours = planCfg.totalHours ?? 0
    const extraHours = userProfile?.additionalHours ?? 0
    const totalHours = baseHours + extraHours

    const completedHours = userSessions.reduce((acc, s) => acc + s.hours, 0)
    const remainingHours = Math.max(0, totalHours - completedHours)
    const progressPct = totalHours > 0 ? Math.min(100, Math.round((completedHours / totalHours) * 100)) : 0

    const displaySessions = [...userSessions].sort((a, b) => {
        const timeA = new Date(a.date).getTime()
        const timeB = new Date(b.date).getTime()
        if (timeA !== timeB) return timeB - timeA
        const addedA = a.addedAt ? new Date(a.addedAt).getTime() : 0
        const addedB = b.addedAt ? new Date(b.addedAt).getTime() : 0
        return addedB - addedA
    })

    const computedWeeks = computeWeekBreakdown(userSessions)

    // Group sessions by date for the history view
    const groupedSessions: { date: string; totalHours: number; topics: string[] }[] = []
    for (const s of displaySessions) {
        const existing = groupedSessions.find((g) => g.date === s.date)
        if (existing) {
            existing.totalHours = Math.round((existing.totalHours + s.hours) * 10) / 10
            if (!existing.topics.includes(s.topic)) existing.topics.push(s.topic)
        } else {
            groupedSessions.push({ date: s.date, totalHours: s.hours, topics: [s.topic] })
        }
    }

    // ── Horas handlers ────────────────────────────────────────────────────
    function openHorasModal(type: 'complete' | 'add') {
        setHorasModal(type)
        setFormHours('')
        setFormNotes('')
        setFormDate(new Date().toISOString().split('T')[0])
        setFormError('')
        setTopicSearch('')
        setTopicSearchResults([])
        setSelectedTopics([])
    }

    function handleTopicSearch() {
        const normalize = (s: string) =>
            s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        const q = normalize(topicSearch.trim())
        if (!q) { setTopicSearchResults([]); return }
        setTopicSearchResults(
            allTopicsFlat.filter((t) => normalize(t.name).includes(q))
        )
    }

    function addTopic(name: string) {
        if (!selectedTopics.includes(name)) {
            setSelectedTopics((prev) => [...prev, name])
        }
        setTopicSearch('')
        setTopicSearchResults([])
    }

    function removeTopic(name: string) {
        setSelectedTopics((prev) => prev.filter((t) => t !== name))
    }

    async function handleCompleteHours(e: React.FormEvent) {
        e.preventDefault()
        const hrs = parseFloat(formHours)
        if (!hrs || hrs <= 0) { setFormError('Ingresa las horas completadas'); return }
        if (selectedTopics.length === 0) { setFormError('Agrega al menos un tema'); return }
        setSubmitting(true)
        setFormError('')
        try {
            const combinedTopic = selectedTopics.join(', ')
            const result = await adminAddSession(token, adminUserId!, {
                hours: hrs,
                topic: combinedTopic,
                notes: formNotes.trim() || undefined,
                date: formDate,
            })
            setUserSessions(result.sessions)
            setHorasModal(null)
        } catch (err) {
            setFormError((err as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    async function handleAddBaseHours(e: React.FormEvent) {
        e.preventDefault()
        const hrs = parseFloat(formHours)
        if (!hrs || hrs === 0) {
            setFormError('Ingresa las horas a adicionar')
            return
        }
        setSubmitting(true)
        setFormError('')
        try {
            const result = await adminAddBaseHours(token, adminUserId!, hrs)
            setUserProfile((prev) => prev ? { ...prev, additionalHours: result.additionalHours } : prev)
            setHorasModal(null)
        } catch (err) {
            setFormError((err as Error).message)
        } finally {
            setSubmitting(false)
        }
    }

    // ── Session edit/delete handlers ──────────────────────────────────────
    function openEditSession(s: UserSession) {
        setEditSession(s)
        setEditForm({
            hours: String(s.hours),
            topic: s.topic,
            notes: s.notes ?? '',
            date: s.date,
        })
        setEditFormError('')
        setDeleteConfirmId(null)
    }

    async function handleUpdateSession(e: React.FormEvent) {
        e.preventDefault()
        if (!editSession?._id || !adminUserId) return
        const hrs = parseFloat(editForm.hours)
        if (!hrs || hrs <= 0) { setEditFormError('Las horas deben ser mayores a 0'); return }
        if (!editForm.topic.trim()) { setEditFormError('El tema es requerido'); return }
        setEditSubmitting(true)
        setEditFormError('')
        try {
            const result = await adminUpdateSession(token, adminUserId, editSession._id, {
                hours: hrs,
                topic: editForm.topic.trim(),
                notes: editForm.notes.trim() || undefined,
                date: editForm.date,
            })
            setUserSessions(result.sessions)
            setEditSession(null)
        } catch (err) {
            setEditFormError((err as Error).message)
        } finally {
            setEditSubmitting(false)
        }
    }

    async function handleDeleteSession(sessionId: string) {
        if (!adminUserId) return
        setEditSubmitting(true)
        try {
            const result = await adminDeleteSession(token, adminUserId, sessionId)
            setUserSessions(result.sessions)
            setEditSession(null)
            setDeleteConfirmId(null)
        } catch (err) {
            setEditFormError((err as Error).message)
        } finally {
            setEditSubmitting(false)
        }
    }

    // ── Topic edit handlers ───────────────────────────────────────────────
    function startEditCategory(cat: { title: string; topics: { _id?: string; name: string; status: string }[] }) {
        // Init draft with ALL topics in the category, keyed by name
        const draft: Record<string, TopicStatus> = {}
        for (const t of cat.topics) {
            draft[t.name] = t.status as TopicStatus
        }
        setEditDraft(draft)
        setEditingCatTitle(cat.title)
        setEditError('')
    }

    async function saveEdits(cat: { title: string; topics: { _id?: string; name: string; status: string }[] }) {
        if (!adminUserId) return
        setSavingEdits(true)
        setEditError('')
        try {
            // Find topics whose status changed vs the current effective status
            const changedTopics = cat.topics.filter((t) => {
                const drafted = editDraft[t.name]
                return drafted !== undefined && drafted !== t.status
            })

            let latestTopics: UserProfile['topics'] = userProfile?.topics ?? []
            for (const t of changedTopics) {
                const newStatus = editDraft[t.name]
                if (t._id) {
                    // Already saved in DB — update by _id
                    const result = await adminUpdateUserTopicStatus(token, adminUserId, t._id, newStatus)
                    latestTopics = result.topics
                } else {
                    // Not yet in DB — upsert by name
                    const result = await adminUpsertTopicStatus(token, adminUserId, t.name, cat.title, newStatus)
                    latestTopics = result.topics
                }
            }

            setUserProfile((prev) => prev ? { ...prev, topics: latestTopics } : prev)
            setEditingCatTitle(null)
            setEditDraft({})
        } catch (err) {
            setEditError((err as Error).message)
        } finally {
            setSavingEdits(false)
        }
    }

    function cancelEdits() {
        setEditingCatTitle(null)
        setEditDraft({})
        setEditError('')
    }

    // ── Tareas handlers ───────────────────────────────────────────────────
    function openCreateTarea() {
        setTareaForm({ titulo: '', texto: '', estado: 'pendiente' })
        setTareaError('')
        setTareasModal('create')
    }

    function openEditTarea(t: ITarea) {
        setEditingTarea(t)
        setTareaForm({ titulo: t.titulo, texto: t.texto, estado: t.estado })
        setTareaError('')
        setTareaDeleteConfirmId(null)
        setTareasModal('edit')
    }

    async function handleCreateTarea(e: React.FormEvent) {
        e.preventDefault()
        if (!tareaForm.titulo.trim()) { setTareaError('El título de la tarea es requerido'); return }
        if (!adminUserId) return
        setTareaSubmitting(true)
        setTareaError('')
        try {
            const result = await adminCreateTarea(token, adminUserId, { titulo: tareaForm.titulo.trim(), texto: tareaForm.texto.trim() })
            setUserProfile((prev) => prev ? { ...prev, tareas: result.tareas } : prev)
            setTareasModal(null)
        } catch (err) {
            setTareaError((err as Error).message)
        } finally {
            setTareaSubmitting(false)
        }
    }

    async function handleEditTarea(e: React.FormEvent) {
        e.preventDefault()
        if (!editingTarea?._id || !adminUserId) return
        if (!tareaForm.titulo.trim()) { setTareaError('El título de la tarea es requerido'); return }
        setTareaSubmitting(true)
        setTareaError('')
        try {
            const result = await adminUpdateTarea(token, adminUserId, editingTarea._id, {
                titulo: tareaForm.titulo.trim(),
                texto: tareaForm.texto.trim(),
                estado: tareaForm.estado,
            })
            setUserProfile((prev) => prev ? { ...prev, tareas: result.tareas } : prev)
            setTareasModal(null)
            setEditingTarea(null)
        } catch (err) {
            setTareaError((err as Error).message)
        } finally {
            setTareaSubmitting(false)
        }
    }

    async function handleDeleteTarea(tareaId: string) {
        if (!adminUserId) return
        setTareaSubmitting(true)
        try {
            const result = await adminDeleteTarea(token, adminUserId, tareaId)
            setUserProfile((prev) => prev ? { ...prev, tareas: result.tareas } : prev)
            setTareasModal(null)
            setEditingTarea(null)
            setTareaDeleteConfirmId(null)
        } catch (err) {
            setTareaError((err as Error).message)
        } finally {
            setTareaSubmitting(false)
        }
    }

    async function handleTareaStatusChange(tareaId: string, estado: 'pendiente' | 'completada') {
        setTareaStatusDropdown(null)
        try {
            let result: { tareas: ITarea[] }
            if (isAdmin && adminUserId) {
                result = await adminUpdateTarea(token, adminUserId, tareaId, { estado })
                setUserProfile((prev) => prev ? { ...prev, tareas: result.tareas } : prev)
            } else {
                result = await updateMiTarea(token, tareaId, estado)
                setUserProfile((prev) => prev ? { ...prev, tareas: result.tareas } : prev)
            }
        } catch { /* silently ignore inline errors */ }
    }

    // ── Herramientas handlers ─────────────────────────────────────────────
    async function handleToggleTool(toolId: string, currentActive: boolean) {
        if (!adminUserId) return
        setUpdatingTool(toolId)
        try {
            // Encontrar si el usuario ya tiene esta herramienta
            const existingTool = userTools.find(t => t._id === toolId)

            if (existingTool) {
                // Si existe, actualizar su estado
                const result = await adminUpdateToolStatus(token, adminUserId, toolId, !currentActive)
                setUserTools(result.tools)
            } else {
                // Si no existe, crear uno nuevo con estado activo
                const toolData = allTools.find(t => t._id === toolId)
                if (toolData) {
                    const result = await adminAddToolToUser(token, adminUserId, toolId, toolData.name)
                    setUserTools(result.tools)
                }
            }
        } catch { /* silently ignore */ }
        finally {
            setUpdatingTool(null)
        }
    }

    return (
        <>
            {isAdmin && !adminUserId ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-[rgba(255,210,210,.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 7a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z" />
                        </svg>
                        <h2 className="font-serif text-2xl font-bold uppercase text-[#fff0f0] mb-2">Selecciona un usuario</h2>
                        <p className="font-primary text-[.85rem] text-[rgba(255,210,210,.5)]">
                            Usa el filtro "Ver como:" en la parte superior para seleccionar un usuario y ver su progreso
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {/* Header with banner on the right */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 font-primary text-[.7rem] tracking-[4px] uppercase text-red-500 mb-2">
                                <span className="w-5 h-px bg-red-500 inline-block" />
                                Seguimiento
                            </div>
                            <h2 className="font-serif text-2xl font-bold uppercase text-[#fff0f0]">
                                Tu Progreso
                                {loadingAdmin && <span className="ml-3 font-primary text-[.65rem] normal-case tracking-normal text-[rgba(255,210,210,.35)] font-normal">cargando...</span>}
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

                    {/* Top row: progress + weekly breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Main progress card — 2 cols */}
                        <div className="lg:col-span-2 bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl p-6">
                            <div className="flex items-start justify-between mb-1">
                                <div>
                                    <span className="font-primary text-[.85rem] font-semibold text-[rgba(255,210,210,.8)]">Horas Completadas</span>
                                    <p className="font-primary text-[.72rem] text-[rgba(255,210,210,.4)] mt-0.5">{planCfg.name} · {planCfg.totalHours} hrs en total</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {/* Admin action buttons — only visible when admin has selected a user */}
                                    {isAdmin && adminUserId && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openHorasModal('complete')}
                                                className="flex items-center gap-1.5 font-primary text-[.6rem] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-lg bg-green-600/20 border border-green-500/30 text-green-400 hover:bg-green-600/35 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                Completar
                                            </button>
                                            <button
                                                onClick={() => openHorasModal('add')}
                                                className="flex items-center gap-1.5 font-primary text-[.6rem] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/35 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                Adicionar hrs
                                            </button>
                                        </div>
                                    )}
                                    <span className="font-primary text-[2rem] font-black leading-none bg-linear-to-br from-red-400 to-rose-500 bg-clip-text text-transparent">
                                        {progressPct}%
                                    </span>
                                </div>
                            </div>
                            {/* Main bar */}
                            <div className="h-4 bg-red-950/60 rounded-full overflow-hidden border border-red-800/20 my-4 relative">
                                <div
                                    className="h-full bg-linear-to-r from-red-600 to-rose-500 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                                    style={{ width: `${progressPct}%` }}
                                >
                                    <span className="text-[9px] font-black font-primary text-white/80 whitespace-nowrap">{completedHours}h</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 mt-2">
                                {[
                                    { label: 'Completadas', value: `${completedHours} hrs`, cls: 'text-rose-400' },
                                    { label: 'Restantes', value: `${remainingHours} hrs`, cls: 'text-[rgba(255,210,210,.6)]' },
                                    { label: 'Contratadas', value: `${totalHours} hrs`, cls: 'text-red-400' },
                                ].map((s) => (
                                    <div key={s.label} className="bg-red-950/30 rounded-xl p-3 text-center border border-red-800/15">
                                        <p className={`font-primary text-[1.15rem] font-black leading-none mb-1 ${s.cls}`}>{s.value}</p>
                                        <p className="font-primary text-[.65rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.4)]">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Weekly breakdown — replaced with Tools */}
                        <div className="bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl p-6 flex flex-col gap-3">
                            <span className="font-primary text-[.82rem] font-semibold text-[rgba(255,210,210,.8)]">Herramientas</span>
                            {loadingTools ? (
                                <p className="font-primary text-[.75rem] text-[rgba(255,210,210,.4)]">Cargando herramientas...</p>
                            ) : allTools.length === 0 ? (
                                <p className="font-primary text-[.75rem] text-[rgba(255,210,210,.3)]">Sin herramientas disponibles</p>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2">
                                    {allTools.map((tool) => {
                                        // Encontrar si el usuario tiene esta herramienta y su estado
                                        const userTool = userTools.find(ut => ut.topicId === tool._id)
                                        const isActive = userTool?.active ?? false
                                        const toolId = userTool?._id ?? tool._id ?? ''

                                        return (
                                            <div
                                                key={tool._id}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-950/40 border border-red-800/20 hover:border-red-700/30 transition-colors"
                                            >
                                                <span className="font-primary text-[.75rem] text-[rgba(255,210,210,.6)]">{tool.name}</span>
                                                {/* Toggle solo para admin */}
                                                {isAdmin && adminUserId && (
                                                    <button
                                                        onClick={() => handleToggleTool(toolId, isActive)}
                                                        disabled={updatingTool === toolId}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive
                                                            ? 'bg-green-600/40 border border-green-500/40'
                                                            : 'bg-red-950/60 border border-red-800/30'
                                                            } ${updatingTool === toolId ? 'opacity-50' : ''}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'
                                                                }`}
                                                        />
                                                    </button>
                                                )}
                                                {/* Indicador de estado para usuarios no admin */}
                                                {(!isAdmin || !adminUserId) && (
                                                    <span className={`font-primary text-[.65rem] font-bold px-2 py-0.5 rounded-full border ${isActive
                                                        ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                                        : 'bg-red-950/40 text-[rgba(255,210,210,.3)] border-red-800/20'
                                                        }`}>
                                                        {isActive ? 'Activa' : 'Inactiva'}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sessions history */}
                    <div className="bg-red-950/20 backdrop-blur-sm border border-red-800/20 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-red-800/20 bg-red-950/30">
                            <span className="font-primary text-[.82rem] font-semibold text-[rgba(255,210,210,.8)]">Historial de Sesiones</span>
                        </div>
                        <div className={`hidden sm:grid gap-3 px-6 py-2.5 border-b border-red-800/15 bg-red-950/20 ${isAdmin && adminUserId ? 'grid-cols-[1.2fr_0.5fr_1.8fr_1.6fr_auto]' : 'grid-cols-[1.2fr_0.5fr_1.8fr_1.6fr_auto]'}`}>
                            {['Fecha', 'Horas', 'Tema', 'Notas', ''].map((h) => (
                                <span key={h} className="font-primary text-[.65rem] uppercase tracking-[2px] text-[rgba(255,210,210,.35)]">{h}</span>
                            ))}
                        </div>
                        {displaySessions.map((s, i) => (
                            <div
                                key={(s as UserSession)._id ?? i}
                                className={`grid grid-cols-1 sm:grid-cols-[1.2fr_0.5fr_1.8fr_1.6fr_auto] gap-1 sm:gap-3 px-6 py-3 items-center transition-colors hover:bg-red-950/20 ${i < displaySessions.length - 1 ? 'border-b border-red-800/10' : ''}`}
                            >
                                <span className="font-primary text-[.75rem] text-[rgba(255,210,210,.5)]">{s.date}</span>
                                <span className="font-primary text-[.8rem] font-bold text-rose-400">{s.hours}h</span>
                                <span className="font-primary text-[.78rem] text-[rgba(255,210,210,.75)] truncate">{s.topic}</span>
                                <span className="font-primary text-[.75rem] text-[rgba(255,210,210,.45)] truncate">
                                    {(s as UserSession).notes
                                        ? ((s as UserSession).notes!.length > 40 ? (s as UserSession).notes!.slice(0, 40) + '…' : (s as UserSession).notes)
                                        : <span className="text-[rgba(255,210,210,.2)]">—</span>}
                                </span>
                                <div className="flex items-center gap-1.5 justify-end">
                                    {/* Ver */}
                                    <button
                                        onClick={() => setViewSession(s as UserSession)}
                                        title="Ver detalle"
                                        className="p-1.5 rounded-lg bg-red-950/40 border border-red-800/20 text-[rgba(255,210,210,.35)] hover:text-rose-400 hover:border-red-600/40 transition-colors"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    {/* Editar (solo admin) */}
                                    {isAdmin && adminUserId && (s as UserSession)._id && (
                                        <button
                                            onClick={() => openEditSession(s as UserSession)}
                                            title="Editar sesión"
                                            className="p-1.5 rounded-lg bg-amber-900/20 border border-amber-700/25 text-amber-500/50 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {displaySessions.length === 0 && (
                            <p className="font-primary text-[.78rem] text-[rgba(255,210,210,.3)] text-center py-6">Sin sesiones registradas aún</p>
                        )}
                    </div>

                    {/* Temas */}
                    <div>
                        <h3 className="font-primary text-[.72rem] uppercase tracking-[3px] text-[rgba(255,210,210,.4)] mb-4">Temas</h3>
                        {(() => {
                            // Build category list from the live catalog fetched from the DB.
                            // Overlay real user statuses/_ids; topics not yet assigned default to 'pendiente'.
                            const userTopicsMap = new Map(
                                (userProfile?.topics ?? []).map((t) => [t.name, t])
                            )
                            const displayCategories: { title: string; topics: { _id?: string; name: string; status: string }[] }[] =
                                catalog
                                    .filter(cat => cat.name !== 'Herramientas')  // Excluir categoría Herramientas
                                    .map((cat) => ({
                                        title: cat.name,
                                        topics: cat.topics.map((catalogTopic) => {
                                            const userTopic = userTopicsMap.get(catalogTopic.name)
                                            return {
                                                _id: userTopic?._id,
                                                name: catalogTopic.name,
                                                status: userTopic?.status ?? 'pendiente',
                                            }
                                        }),
                                    }))

                            return (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                                    {displayCategories.map((cat) => {
                                        const isEditing = editingCatTitle === cat.title
                                        // Effective topics: use draft (keyed by name) when editing
                                        const effectiveTopics = cat.topics.map((t) => ({
                                            ...t,
                                            status: isEditing && editDraft[t.name] !== undefined
                                                ? editDraft[t.name]
                                                : t.status,
                                        }))
                                        const catCompleted = effectiveTopics.filter((t) => t.status === 'completado').length
                                        const catPct = effectiveTopics.length > 0 ? Math.round((catCompleted / effectiveTopics.length) * 100) : 0
                                        return (
                                            <div key={cat.title} className={`bg-red-950/30 backdrop-blur-sm border rounded-2xl p-5 flex flex-col transition-colors ${isEditing ? 'border-red-500/40' : 'border-red-800/20'}`}>
                                                {/* Category header */}
                                                <div className="flex items-center justify-between mb-2 shrink-0">
                                                    <h4 className="font-serif text-[.92rem] font-bold uppercase text-[#fff0f0]">{cat.title}</h4>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-primary text-[.75rem] font-bold text-red-400">{catPct}%</span>
                                                        {isAdmin && adminUserId && !isEditing && (
                                                            <button
                                                                onClick={() => startEditCategory(cat)}
                                                                className="flex items-center gap-1 font-primary text-[.6rem] font-bold uppercase tracking-[1px] px-2 py-1 rounded-lg bg-red-950/50 border border-red-800/25 text-[rgba(255,210,210,.45)] hover:text-rose-400 hover:border-red-600/40 transition-colors"
                                                            >
                                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Editar
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="h-1.5 bg-red-950/60 rounded-full overflow-hidden mb-3 shrink-0">
                                                    <div className="h-full bg-linear-to-r from-red-600 to-rose-500 rounded-full transition-all duration-500" style={{ width: `${catPct}%` }} />
                                                </div>
                                                {/* Topic list — scroll if >10 */}
                                                <ul className={`flex flex-col gap-1.5 ${effectiveTopics.length > 10 ? 'max-h-64 overflow-y-auto pr-1' : ''}`}>
                                                    {effectiveTopics.map((topic) => {
                                                        const cfg = STATUS_CONFIG[topic.status] ?? STATUS_CONFIG['pendiente']
                                                        return (
                                                            <li
                                                                key={topic.name}
                                                                className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5"
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                                                    <span className={`font-primary text-[.8rem] truncate ${isEditing ? 'text-[rgba(255,210,210,.9)]' : 'text-[rgba(255,210,210,.75)]'}`}>
                                                                        {topic.name}
                                                                    </span>
                                                                </div>
                                                                {isEditing ? (
                                                                    <div className="relative shrink-0">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === topic.name ? null : topic.name) }}
                                                                            className={`flex items-center gap-1.5 font-primary text-[.6rem] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${cfg.cls}`}
                                                                        >
                                                                            {cfg.label}
                                                                            <svg className={`w-3 h-3 transition-transform ${openDropdown === topic.name ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                                                        </button>
                                                                        {openDropdown === topic.name && (
                                                                            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-20 min-w-[130px] bg-[#1a0808] border border-red-800/40 rounded-xl shadow-xl overflow-hidden">
                                                                                {(['pendiente', 'en-progreso', 'completado'] as TopicStatus[]).map((s) => {
                                                                                    const sCfg = STATUS_CONFIG[s]
                                                                                    return (
                                                                                        <button
                                                                                            key={s}
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setEditDraft((prev) => ({ ...prev, [topic.name]: s }))
                                                                                                setOpenDropdown(null)
                                                                                            }}
                                                                                            className={`w-full flex items-center gap-2 px-3 py-2 font-primary text-[.65rem] font-bold uppercase tracking-[1px] transition-colors hover:bg-red-900/30 text-left ${topic.status === s ? 'bg-red-900/20' : ''
                                                                                                }`}
                                                                                        >
                                                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sCfg.dot}`} />
                                                                                            <span className={sCfg.cls.split(' ').find(c => c.startsWith('text-')) ?? 'text-white'}>{sCfg.label}</span>
                                                                                        </button>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className={`shrink-0 font-primary text-[.58rem] font-bold uppercase tracking-[1px] px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                                                                        {cfg.label}
                                                                    </span>
                                                                )}
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                                {/* Edit mode actions */}
                                                {isEditing && (
                                                    <div className="mt-4 pt-3 border-t border-red-700/30 shrink-0 flex flex-col gap-2">
                                                        <p className="font-primary text-[.65rem] text-[rgba(255,210,210,.4)] text-center">
                                                            Cambia el estado de cada tema con el selector
                                                        </p>
                                                        {editError && <p className="font-primary text-[.7rem] text-rose-400 text-center">{editError}</p>}
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={cancelEdits}
                                                                disabled={savingEdits}
                                                                className="flex-1 font-primary text-[.72rem] font-bold uppercase tracking-[1.5px] py-2 rounded-xl bg-red-950/40 border border-red-800/25 text-[rgba(255,210,210,.4)] hover:text-[rgba(255,210,210,.7)] transition-colors disabled:opacity-50"
                                                            >
                                                                Cancelar
                                                            </button>
                                                            <button
                                                                onClick={() => saveEdits(cat)}
                                                                disabled={savingEdits}
                                                                className="flex-1 font-primary text-[.72rem] font-bold uppercase tracking-[1.5px] py-2 rounded-xl bg-red-700/30 border border-red-500/40 text-red-300 hover:bg-red-700/50 transition-colors disabled:opacity-50"
                                                            >
                                                                {savingEdits ? 'Guardando…' : 'Aceptar cambios'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })()}
                    </div>

                    {/* ── Tareas ─────────────────────────────────────────── */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-primary text-[.72rem] uppercase tracking-[3px] text-[rgba(255,210,210,.4)]">Tareas</h3>
                            {isAdmin && adminUserId && (
                                <button
                                    onClick={openCreateTarea}
                                    className="flex items-center gap-1.5 font-primary text-[.6rem] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-lg bg-red-700/20 border border-red-500/30 text-red-300 hover:bg-red-700/35 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Nueva tarea
                                </button>
                            )}
                        </div>
                        <div className="bg-red-950/20 backdrop-blur-sm border border-red-800/20 rounded-2xl">
                            {(userProfile?.tareas ?? []).length === 0 ? (
                                <p className="font-primary text-[.78rem] text-[rgba(255,210,210,.3)] text-center py-6">Sin tareas asignadas aún</p>
                            ) : (
                                <ul className="flex flex-col divide-y divide-red-800/10">
                                    {(userProfile?.tareas ?? []).map((tarea) => {
                                        const cfg = TAREA_STATUS_CONFIG[tarea.estado] ?? TAREA_STATUS_CONFIG['pendiente']
                                        const fechaFmt = new Date(tarea.fechaCreacion).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
                                        return (
                                            <li key={tarea._id} className="flex items-center gap-3 px-5 py-3 hover:bg-red-950/20 transition-colors">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-primary text-[.82rem] font-semibold text-[rgba(255,210,210,.85)] leading-snug truncate">{tarea.titulo}</p>
                                                    <p className="font-primary text-[.65rem] text-[rgba(255,210,210,.35)] mt-0.5">{fechaFmt}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* Ver tarea */}
                                                    <button
                                                        onClick={() => setViewTarea(tarea)}
                                                        title="Ver tarea"
                                                        className="p-1.5 rounded-lg bg-red-950/40 border border-red-800/20 text-[rgba(255,210,210,.35)] hover:text-rose-400 hover:border-red-600/40 transition-colors"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    {/* Status dropdown — posición fixed para evitar clipping */}
                                                    <div className="relative">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setTareaStatusDropdown(tareaStatusDropdown === tarea._id ? null : (tarea._id ?? null)) }}
                                                            className={`flex items-center gap-1.5 font-primary text-[.58rem] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-lg border transition-colors ${cfg.cls}`}
                                                        >
                                                            {cfg.label}
                                                            <svg className={`w-3 h-3 transition-transform ${tareaStatusDropdown === tarea._id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                                        </button>
                                                        {tareaStatusDropdown === tarea._id && (
                                                            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-30 w-36 bg-[#1a0808] border border-red-800/40 rounded-xl shadow-2xl">
                                                                {(['pendiente', 'completada'] as const).map((s) => {
                                                                    const sCfg = TAREA_STATUS_CONFIG[s]
                                                                    return (
                                                                        <button
                                                                            key={s}
                                                                            type="button"
                                                                            onClick={() => tarea._id && handleTareaStatusChange(tarea._id, s)}
                                                                            className={`w-full flex items-center gap-2 px-3 py-2 font-primary text-[.65rem] font-bold uppercase tracking-[1px] transition-colors hover:bg-red-900/30 text-left first:rounded-t-xl last:rounded-b-xl ${tarea.estado === s ? 'bg-red-900/20' : ''}`}
                                                                        >
                                                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sCfg.dot}`} />
                                                                            <span className={sCfg.cls.split(' ').find(c => c.startsWith('text-')) ?? 'text-white'}>{sCfg.label}</span>
                                                                        </button>
                                                                    )
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Editar (solo admin) */}
                                                    {isAdmin && adminUserId && (
                                                        <button
                                                            onClick={() => openEditTarea(tarea)}
                                                            title="Editar tarea"
                                                            className="p-1.5 rounded-lg bg-amber-900/20 border border-amber-700/25 text-amber-500/50 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Completar horas ──────────────────────────────── */}
            {horasModal === 'complete' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setHorasModal(null)}>
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleCompleteHours}
                        className="w-full max-w-lg bg-[#1a0a0a] border border-red-800/30 rounded-2xl p-6 flex flex-col gap-5 shadow-xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-lg font-bold uppercase text-[#fff0f0]">Completar horas</h3>
                            <button type="button" onClick={() => setHorasModal(null)} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl">&times;</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Horas completadas</span>
                                <input
                                    type="number" step="0.5" min="0.5" required
                                    value={formHours} onChange={(e) => setFormHours(e.target.value)}
                                    placeholder="Ej: 2.5"
                                    className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-red-500/50"
                                />
                            </label>

                            {/* Topic search */}
                            <div className="flex flex-col gap-1.5">
                                <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Temas de la sesión</span>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={topicSearch}
                                        onChange={(e) => setTopicSearch(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTopicSearch() } }}
                                        placeholder="Buscar tema por nombre..."
                                        className="flex-1 bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-red-500/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleTopicSearch}
                                        className="shrink-0 px-3 py-2.5 rounded-xl bg-red-800/30 border border-red-700/30 text-[rgba(255,210,210,.6)] hover:text-rose-400 hover:border-red-500/40 transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" /></svg>
                                    </button>
                                </div>

                                {/* Search results */}
                                {topicSearchResults.length > 0 && (
                                    <div className="bg-[#1a0808] border border-red-800/35 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                                        {topicSearchResults.map((t) => (
                                            <button
                                                key={t.name}
                                                type="button"
                                                onClick={() => addTopic(t.name)}
                                                disabled={selectedTopics.includes(t.name)}
                                                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors border-b border-red-800/20 last:border-0 ${selectedTopics.includes(t.name)
                                                    ? 'opacity-40 cursor-not-allowed'
                                                    : 'hover:bg-red-900/25'
                                                    }`}
                                            >
                                                <div>
                                                    <p className="font-primary text-[.78rem] text-[rgba(255,210,210,.85)]">{t.name}</p>
                                                    <p className="font-primary text-[.65rem] text-[rgba(255,210,210,.35)]">{t.category}</p>
                                                </div>
                                                {!selectedTopics.includes(t.name) && (
                                                    <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {topicSearchResults.length === 0 && topicSearch.trim() && (
                                    <p className="font-primary text-[.7rem] text-[rgba(255,210,210,.35)] text-center py-1">Sin resultados para &ldquo;{topicSearch}&rdquo;</p>
                                )}

                                {/* Selected topics */}
                                {selectedTopics.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {selectedTopics.map((name) => (
                                            <span
                                                key={name}
                                                className="flex items-center gap-1.5 font-primary text-[.68rem] px-2.5 py-1 rounded-lg bg-rose-900/30 border border-rose-700/35 text-rose-300"
                                            >
                                                {name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeTopic(name)}
                                                    className="text-rose-400/60 hover:text-rose-300 leading-none ml-0.5"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <label className="flex flex-col gap-1.5">
                                <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Fecha</span>
                                <input
                                    type="date" required
                                    value={formDate} onChange={(e) => setFormDate(e.target.value)}
                                    className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] focus:outline-none focus:border-red-500/50"
                                />
                            </label>

                            <label className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Notas <span className="normal-case tracking-normal text-[rgba(255,210,210,.3)]">(opcional)</span></span>
                                    <span className="font-primary text-[.6rem] text-[rgba(255,210,210,.3)]">{formNotes.length}/300</span>
                                </div>
                                <textarea
                                    maxLength={300}
                                    rows={3}
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    placeholder="Observaciones sobre la sesión..."
                                    className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-red-500/50 resize-none"
                                />
                            </label>
                        </div>
                        {formError && <p className="font-primary text-[.75rem] text-rose-400">{formError}</p>}
                        <button
                            type="submit" disabled={submitting}
                            className="w-full font-primary text-[.8rem] font-bold uppercase tracking-[2px] py-3 rounded-xl bg-green-600/25 border border-green-500/40 text-green-400 hover:bg-green-600/40 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Guardando...' : 'Guardar sesión'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Modal: Adicionar horas ──────────────────────────────── */}
            {horasModal === 'add' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setHorasModal(null)}>
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleAddBaseHours}
                        className="w-full max-w-sm bg-[#1a0a0a] border border-red-800/30 rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-lg font-bold uppercase text-[#fff0f0]">Adicionar horas</h3>
                            <button type="button" onClick={() => setHorasModal(null)} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl">&times;</button>
                        </div>
                        <p className="font-primary text-[.75rem] text-[rgba(255,210,210,.5)]">
                            Horas base actuales: <span className="text-blue-400 font-bold">{totalHours} hrs</span>
                        </p>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Horas a adicionar</span>
                            <input
                                type="number" step="1" required
                                value={formHours} onChange={(e) => setFormHours(e.target.value)}
                                placeholder="Ej: 5"
                                className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-blue-500/50"
                            />
                        </label>
                        {formError && <p className="font-primary text-[.75rem] text-rose-400">{formError}</p>}
                        <button
                            type="submit" disabled={submitting}
                            className="w-full font-primary text-[.8rem] font-bold uppercase tracking-[2px] py-3 rounded-xl bg-blue-600/25 border border-blue-500/40 text-blue-400 hover:bg-blue-600/40 transition-colors disabled:opacity-50"
                        >
                            {submitting ? 'Guardando...' : 'Adicionar horas'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Modal: Ver sesión ───────────────────────────────────── */}
            {viewSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setViewSession(null)}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md bg-[#1a0a0a] border border-red-800/30 rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-lg font-bold uppercase text-[#fff0f0]">Detalle de sesión</h3>
                            <button type="button" onClick={() => setViewSession(null)} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl">&times;</button>
                        </div>
                        <div className="flex flex-col gap-3">
                            {[
                                { label: 'Fecha', value: viewSession.date },
                                { label: 'Horas', value: `${viewSession.hours} hrs` },
                                { label: 'Tema', value: viewSession.topic },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex flex-col gap-0.5 bg-red-950/30 rounded-xl px-4 py-3 border border-red-800/20">
                                    <span className="font-primary text-[.6rem] uppercase tracking-[2px] text-[rgba(255,210,210,.35)]">{label}</span>
                                    <span className="font-primary text-[.85rem] text-[rgba(255,210,210,.9)]">{value}</span>
                                </div>
                            ))}
                            <div className="flex flex-col gap-0.5 bg-red-950/30 rounded-xl px-4 py-3 border border-red-800/20">
                                <span className="font-primary text-[.6rem] uppercase tracking-[2px] text-[rgba(255,210,210,.35)]">Notas</span>
                                {viewSession.notes
                                    ? <p className="font-primary text-[.83rem] text-[rgba(255,210,210,.85)] leading-relaxed whitespace-pre-wrap">{viewSession.notes}</p>
                                    : <span className="font-primary text-[.8rem] text-[rgba(255,210,210,.25)] italic">Sin notas</span>
                                }
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setViewSession(null)}
                            className="w-full font-primary text-[.78rem] font-bold uppercase tracking-[2px] py-2.5 rounded-xl bg-red-950/40 border border-red-800/25 text-[rgba(255,210,210,.5)] hover:text-[rgba(255,210,210,.8)] transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            {/* ── Modal: Editar sesión (admin) ────────────────────────── */}
            {editSession && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => { setEditSession(null); setDeleteConfirmId(null) }}>
                <form
                    onClick={(e) => e.stopPropagation()}
                    onSubmit={handleUpdateSession}
                    className="w-full max-w-md bg-[#1a0a0a] border border-amber-800/30 rounded-2xl p-6 flex flex-col gap-4 shadow-xl"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="font-serif text-lg font-bold uppercase text-[#fff0f0]">Editar sesión</h3>
                        <button type="button" onClick={() => { setEditSession(null); setDeleteConfirmId(null) }} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl">&times;</button>
                    </div>
                    <div className="flex flex-col gap-3">
                        <label className="flex flex-col gap-1.5">
                            <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Horas</span>
                            <input
                                type="number" step="0.5" min="0.5" required
                                value={editForm.hours} onChange={(e) => setEditForm((p) => ({ ...p, hours: e.target.value }))}
                                className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] focus:outline-none focus:border-amber-500/50"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Tema</span>
                            <input
                                type="text" required
                                value={editForm.topic} onChange={(e) => setEditForm((p) => ({ ...p, topic: e.target.value }))}
                                className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] focus:outline-none focus:border-amber-500/50"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Fecha</span>
                            <input
                                type="date" required
                                value={editForm.date} onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                                className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] focus:outline-none focus:border-amber-500/50"
                            />
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Notas <span className="normal-case tracking-normal text-[rgba(255,210,210,.3)]">(opcional)</span></span>
                                <span className="font-primary text-[.6rem] text-[rgba(255,210,210,.3)]">{editForm.notes.length}/300</span>
                            </div>
                            <textarea
                                maxLength={300} rows={3}
                                value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                                placeholder="Observaciones sobre la sesión..."
                                className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-amber-500/50 resize-none"
                            />
                        </label>
                    </div>
                    {editFormError && <p className="font-primary text-[.75rem] text-rose-400">{editFormError}</p>}
                    <div className="flex gap-2">
                        <button
                            type="submit" disabled={editSubmitting}
                            className="flex-1 font-primary text-[.8rem] font-bold uppercase tracking-[1.5px] py-2.5 rounded-xl bg-amber-700/25 border border-amber-500/35 text-amber-400 hover:bg-amber-700/40 transition-colors disabled:opacity-50"
                        >
                            {editSubmitting ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        {deleteConfirmId === editSession._id ? (
                            <button
                                type="button"
                                onClick={() => handleDeleteSession(editSession._id!)}
                                disabled={editSubmitting}
                                className="flex-1 font-primary text-[.8rem] font-bold uppercase tracking-[1.5px] py-2.5 rounded-xl bg-red-700/40 border border-red-500/50 text-red-300 hover:bg-red-700/60 transition-colors disabled:opacity-50"
                            >
                                ¿Confirmar eliminación?
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmId(editSession._id ?? null)}
                                disabled={editSubmitting}
                                className="px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800/30 text-[rgba(255,100,100,.5)] hover:text-red-400 hover:border-red-600/40 transition-colors disabled:opacity-50"
                                title="Eliminar sesión"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                </form>
            </div>
            )}

            {/* ── Modal: Nueva tarea (admin) ──────────────────────────── */}
            {tareasModal === 'create' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setTareasModal(null)}>
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleCreateTarea}
                        className="w-full max-w-md bg-[#1a0a0a] border border-red-800/30 rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-lg font-bold uppercase text-[#fff0f0]">Nueva tarea</h3>
                            <button type="button" onClick={() => setTareasModal(null)} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl">&times;</button>
                        </div>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Título <span className="text-rose-500">*</span></span>
                            <input
                                type="text"
                                required
                                maxLength={300}
                                value={tareaForm.titulo}
                                onChange={(e) => setTareaForm((p) => ({ ...p, titulo: e.target.value }))}
                                placeholder="Título de la tarea..."
                                className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-red-500/50"
                            />
                            <span className={`font-primary text-[.6rem] text-right ${tareaForm.titulo.length > 270 ? 'text-rose-400' : 'text-[rgba(255,210,210,.25)]'}`}>{tareaForm.titulo.length}/300</span>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Descripción</span>
                            <textarea
                                rows={3}
                                maxLength={300}
                                value={tareaForm.texto}
                                onChange={(e) => setTareaForm((p) => ({ ...p, texto: e.target.value }))}
                                placeholder="Describe la tarea (opcional)..."
                                className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] placeholder:text-[rgba(255,210,210,.25)] focus:outline-none focus:border-red-500/50 resize-none"
                            />
                            <span className={`font-primary text-[.6rem] text-right ${tareaForm.texto.length > 270 ? 'text-rose-400' : 'text-[rgba(255,210,210,.25)]'}`}>{tareaForm.texto.length}/300</span>
                        </label>
                        {tareaError && <p className="font-primary text-[.75rem] text-rose-400">{tareaError}</p>}
                        <button
                            type="submit" disabled={tareaSubmitting}
                            className="w-full font-primary text-[.8rem] font-bold uppercase tracking-[2px] py-3 rounded-xl bg-red-700/25 border border-red-500/40 text-red-300 hover:bg-red-700/40 transition-colors disabled:opacity-50"
                        >
                            {tareaSubmitting ? 'Creando...' : 'Crear tarea'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── Modal: Editar tarea (admin) ─────────────────────────── */}
            {tareasModal === 'edit' && editingTarea && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => { setTareasModal(null); setEditingTarea(null); setTareaDeleteConfirmId(null) }}>
                    <form
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleEditTarea}
                        className="w-full max-w-md bg-[#1a0a0a] border border-amber-800/30 rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-serif text-lg font-bold uppercase text-[#fff0f0]">Editar tarea</h3>
                            <button type="button" onClick={() => { setTareasModal(null); setEditingTarea(null); setTareaDeleteConfirmId(null) }} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl">&times;</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Título <span className="text-rose-500">*</span></span>
                                <input
                                    type="text"
                                    required
                                    maxLength={300}
                                    value={tareaForm.titulo}
                                    onChange={(e) => setTareaForm((p) => ({ ...p, titulo: e.target.value }))}
                                    className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] focus:outline-none focus:border-amber-500/50"
                                />
                                <span className={`font-primary text-[.6rem] text-right ${tareaForm.titulo.length > 270 ? 'text-rose-400' : 'text-[rgba(255,210,210,.25)]'}`}>{tareaForm.titulo.length}/300</span>
                            </label>
                            <div className="flex flex-col gap-1.5">
                                <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Estado</span>
                                <div className="flex gap-2">
                                    {(['pendiente', 'completada'] as const).map((s) => {
                                        const cfg = TAREA_STATUS_CONFIG[s]
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => setTareaForm((p) => ({ ...p, estado: s }))}
                                                className={`flex-1 flex items-center justify-center gap-2 font-primary text-[.65rem] font-bold uppercase tracking-[1px] px-3 py-2 rounded-xl border transition-colors ${tareaForm.estado === s ? cfg.cls : 'bg-red-950/30 border-red-800/20 text-[rgba(255,210,210,.35)]'}`}
                                            >
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${tareaForm.estado === s ? cfg.dot : 'bg-[rgba(255,210,210,.2)]'}`} />
                                                {cfg.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            <label className="flex flex-col gap-1.5">
                                <span className="font-primary text-[.7rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.5)]">Descripción</span>
                                <textarea
                                    rows={3}
                                    maxLength={300}
                                    value={tareaForm.texto}
                                    onChange={(e) => setTareaForm((p) => ({ ...p, texto: e.target.value }))}
                                    className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-2.5 font-primary text-sm text-[rgba(255,210,210,.9)] focus:outline-none focus:border-amber-500/50 resize-none"
                                />
                                <span className={`font-primary text-[.6rem] text-right ${tareaForm.texto.length > 270 ? 'text-rose-400' : 'text-[rgba(255,210,210,.25)]'}`}>{tareaForm.texto.length}/300</span>
                            </label>
                        </div>
                        {tareaError && <p className="font-primary text-[.75rem] text-rose-400">{tareaError}</p>}
                        <div className="flex gap-2">
                            <button
                                type="submit" disabled={tareaSubmitting}
                                className="flex-1 font-primary text-[.8rem] font-bold uppercase tracking-[1.5px] py-2.5 rounded-xl bg-amber-700/25 border border-amber-500/35 text-amber-400 hover:bg-amber-700/40 transition-colors disabled:opacity-50"
                            >
                                {tareaSubmitting ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                            {tareaDeleteConfirmId === editingTarea._id ? (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTarea(editingTarea._id!)}
                                    disabled={tareaSubmitting}
                                    className="flex-1 font-primary text-[.8rem] font-bold uppercase tracking-[1.5px] py-2.5 rounded-xl bg-red-700/40 border border-red-500/50 text-red-300 hover:bg-red-700/60 transition-colors disabled:opacity-50"
                                >
                                    ¿Confirmar eliminación?
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setTareaDeleteConfirmId(editingTarea._id ?? null)}
                                    disabled={tareaSubmitting}
                                    className="px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-800/30 text-[rgba(255,100,100,.5)] hover:text-red-400 hover:border-red-600/40 transition-colors disabled:opacity-50"
                                    title="Eliminar tarea"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* ── Modal: Ver tarea ────────────────────────────────────── */}
            {viewTarea && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setViewTarea(null)}>
                    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-[#1a0a0a] border border-red-800/30 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="font-serif text-lg font-bold text-[#fff0f0] leading-tight flex-1">{viewTarea.titulo}</h3>
                            <button onClick={() => setViewTarea(null)} className="text-[rgba(255,210,210,.4)] hover:text-rose-400 leading-none text-xl shrink-0">&times;</button>
                        </div>
                        {viewTarea.texto && (
                            <div className="flex flex-col gap-1">
                                <span className="font-primary text-[.65rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.4)]">Descripción</span>
                                <p className="font-primary text-sm text-[rgba(255,210,210,.8)] leading-relaxed whitespace-pre-wrap">{viewTarea.texto}</p>
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-red-800/20">
                            <div className="flex flex-col gap-0.5">
                                <span className="font-primary text-[.6rem] uppercase tracking-[1.5px] text-[rgba(255,210,210,.3)]">Fecha de creación</span>
                                <span className="font-primary text-[.75rem] text-[rgba(255,210,210,.55)]">
                                    {new Date(viewTarea.fechaCreacion).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                            {(() => {
                                const cfg = TAREA_STATUS_CONFIG[viewTarea.estado] ?? TAREA_STATUS_CONFIG['pendiente']
                                return (
                                    <span className={`flex items-center gap-1.5 font-primary text-[.65rem] font-bold uppercase tracking-[1px] px-3 py-1 rounded-lg border ${cfg.cls}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        {cfg.label}
                                    </span>
                                )
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
