import { Router, type Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { Invoice } from '../models/Invoice.js'
import { Topic } from '../models/Topic.js'
import { Category } from '../models/Category.js'
import { PlanAssignment } from '../models/PlanAssignment.js'
import { assignPlanToUser, updateAssignment, adjustAssignmentHours, getCurrentActiveAssignment } from '../lib/planLifecycle.js'
import type { PlanSlug } from '../models/Plan.js'

const router = Router()

// Guard: admin only
function requireAdmin(req: AuthRequest, res: Response): boolean {
    if (req.userRole !== 'admin') {
        res.status(403).json({ message: 'Acceso denegado' })
        return false
    }
    return true
}

// GET /api/admin/users?q=search
router.get('/users', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const q = (req.query.q as string | undefined)?.trim() ?? ''
        const filter = q
            ? { $or: [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }] }
            : {}
        const users = await User.find(filter).select('-password').limit(50).lean()
        res.json(users)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// GET /api/admin/users/:userId/profile
router.get('/users/:userId/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const user = await User.findById(req.params.userId).select('-password').lean()
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
        const currentAssignment = await getCurrentActiveAssignment(userId)
        res.json({ ...user, currentAssignment })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// GET /api/admin/users/:userId/sessions
router.get('/users/:userId/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const user = await User.findById(req.params.userId).select('sessions').lean()
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        res.json(user.sessions ?? [])
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// GET /api/admin/users/:userId/invoices
router.get('/users/:userId/invoices', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const invoices = await Invoice.find({ userId: req.params.userId })
            .sort({ createdAt: -1 })
            .lean()
        res.json(invoices)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/admin/users/:userId/sessions — completar horas
router.post('/users/:userId/sessions', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { hours, topic, notes, date } = req.body as {
            hours: number
            topic: string
            notes?: string
            date?: string
        }
        if (!hours || hours <= 0 || !topic?.trim()) {
            res.status(400).json({ message: 'Horas y tema son requeridos' })
            return
        }
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

        const newSession = {
            date: date ?? new Date().toISOString().split('T')[0],
            hours,
            topic: topic.trim(),
            notes: notes?.trim(),
            addedAt: new Date(),
        }
        user.sessions.push(newSession)
        await user.save()

        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
        const assignment = await getCurrentActiveAssignment(userId)
        if (assignment && assignment.trackingMode !== 'time') {
            assignment.usedHours = Math.max(0, assignment.usedHours + hours)
            assignment.remainingHours = Math.max(0, assignment.grantedHours - assignment.usedHours)
            await assignment.save()
        }

        res.status(201).json({
            sessions: user.sessions,
            completedHours: user.sessions.reduce((a, s) => a + s.hours, 0),
            assignment: assignment ?? null,
        })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/sessions/:sessionId — editar sesión
router.patch('/users/:userId/sessions/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { hours, topic, notes, date } = req.body as {
            hours?: number
            topic?: string
            notes?: string
            date?: string
        }
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

        const s = (user.sessions as unknown as Array<{ _id: { toString(): string }; hours: number; topic: string; notes?: string; date: string }>)
            .find((x) => x._id.toString() === req.params.sessionId)
        if (!s) { res.status(404).json({ message: 'Sesión no encontrada' }); return }

        const oldHours = s.hours

        if (hours !== undefined && hours > 0) s.hours = hours
        if (topic?.trim()) s.topic = topic.trim()
        if (notes !== undefined) s.notes = notes.trim() || undefined
        if (date) s.date = date

        await user.save()

        let assignment = null
        if (hours !== undefined && hours > 0 && hours !== oldHours) {
            const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
            assignment = await getCurrentActiveAssignment(userId)
            if (assignment && assignment.trackingMode !== 'time') {
                const delta = hours - oldHours
                assignment.usedHours = Math.max(0, assignment.usedHours + delta)
                assignment.remainingHours = Math.max(0, assignment.grantedHours - assignment.usedHours)
                await assignment.save()
            }
        }

        res.json({
            sessions: user.sessions,
            completedHours: user.sessions.reduce((a, x) => a + x.hours, 0),
            assignment,
        })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// DELETE /api/admin/users/:userId/sessions/:sessionId — eliminar sesión
router.delete('/users/:userId/sessions/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

        const idx = (user.sessions as unknown as Array<{ _id: { toString(): string }; hours: number }>)
            .findIndex((x) => x._id.toString() === req.params.sessionId)
        if (idx === -1) { res.status(404).json({ message: 'Sesión no encontrada' }); return }

        const sessionHours = (user.sessions[idx] as unknown as { hours: number }).hours
        user.sessions.splice(idx, 1)
        await user.save()

        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
        const assignment = await getCurrentActiveAssignment(userId)
        if (assignment && assignment.trackingMode !== 'time') {
            assignment.usedHours = Math.max(0, assignment.usedHours - sessionHours)
            assignment.remainingHours = Math.max(0, assignment.grantedHours - assignment.usedHours)
            await assignment.save()
        }

        res.json({
            sessions: user.sessions,
            completedHours: user.sessions.reduce((a, x) => a + x.hours, 0),
            assignment: assignment ?? null,
        })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/hours — adicionar horas base
router.patch('/users/:userId/hours', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { additionalHours } = req.body as { additionalHours: number }
        if (additionalHours === undefined || isNaN(additionalHours)) {
            res.status(400).json({ message: 'additionalHours es requerido' })
            return
        }
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $inc: { additionalHours } },
            { new: true, select: 'additionalHours' }
        )
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        res.json({ additionalHours: user.additionalHours })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/admin/users/:userId/topics — add a topic from the catalog to a user
router.post('/users/:userId/topics', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { topicId } = req.body as { topicId: string }
        if (!topicId) { res.status(400).json({ message: 'topicId es requerido' }); return }

        const topic = await Topic.findById(topicId)
        if (!topic) { res.status(404).json({ message: 'Tema no encontrado en el catálogo' }); return }

        const category = await Category.findById(topic.categoryId)
        const categoryName = category?.name ?? ''

        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

        const alreadyExists = user.topics.some((t) => t.name === topic.name)
        if (alreadyExists) { res.status(409).json({ message: 'El usuario ya tiene este tema' }); return }

        user.topics.push({ name: topic.name, categoryName, status: 'pendiente' })
        await user.save()
        res.status(201).json({ topics: user.topics })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/topics/:topicName (legacy, mantiene compatibilidad)
router.patch('/users/:userId/topics/:topicName', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { status } = req.body as { status: 'pendiente' | 'en-progreso' | 'completado' }
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

        const topic = user.topics.find((t) => t.name === req.params.topicName)
        if (topic) {
            topic.status = status
        } else {
            user.topics.push({ name: req.params.topicName as string, status })
        }
        await user.save()
        res.json({ topics: user.topics })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/topic-status/by-name — upsert topic by name
router.patch('/users/:userId/topic-status/by-name', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { name, categoryName, status } = req.body as { name: string; categoryName?: string; status: string }
        const validStatuses = ['pendiente', 'en-progreso', 'completado']
        if (!name || !validStatuses.includes(status)) {
            res.status(400).json({ message: 'Nombre y estado válido requeridos' }); return
        }
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

        const existing = user.topics.find((t) => t.name === name)
        if (existing) {
            existing.status = status as 'pendiente' | 'en-progreso' | 'completado'
        } else {
            user.topics.push({ name, categoryName, status: status as 'pendiente' | 'en-progreso' | 'completado' })
        }
        await user.save()
        res.json({ topics: user.topics })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/admin/users/:userId/plan-assignments — asignar un plan con historial
router.post('/users/:userId/plan-assignments', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { plan, source = 'admin', notes, grantedHours, invoiceId } = req.body as {
            plan: string
            source?: string
            notes?: string
            grantedHours?: number
            invoiceId?: string
        }
        const validPlans = ['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger']
        if (!validPlans.includes(plan)) {
            res.status(400).json({ message: 'Plan inválido. Usa: intro, silver, gold, esmerald, diamond, no_life, challenger' })
            return
        }

        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
        const assignment = await assignPlanToUser({
            userId,
            planSlug: plan as PlanSlug,
            source: source === 'stripe' ? 'stripe' : 'admin',
            grantedHours,
            notes,
            invoiceId,
        })

        res.status(201).json({ assignment })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/plan-assignments/:assignmentId — actualizar asignación
router.patch('/users/:userId/plan-assignments/:assignmentId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { grantedHours, notes, status } = req.body as {
            grantedHours?: number
            notes?: string
            status?: string
        }
        const validStatuses = ['active', 'archived', 'expired']
        if (status !== undefined && !validStatuses.includes(status)) {
            res.status(400).json({ message: 'Estado inválido. Usa: active, archived, expired' })
            return
        }

        const assignmentId = Array.isArray(req.params.assignmentId) ? req.params.assignmentId[0] : req.params.assignmentId
        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

        const assignment = await updateAssignment({
            assignmentId,
            userId,
            grantedHours,
            notes,
            status: status as 'active' | 'archived' | 'expired' | undefined,
        })

        res.json({ assignment })
    } catch (err) {
        res.status(500).json({ message: (err as Error).message ?? 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/plan-assignments/:assignmentId/adjust-hours — ajustar horas
router.patch('/users/:userId/plan-assignments/:assignmentId/adjust-hours', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { grantedHoursDelta, usedHoursDelta } = req.body as {
            grantedHoursDelta?: number
            usedHoursDelta?: number
        }

        const assignmentId = Array.isArray(req.params.assignmentId) ? req.params.assignmentId[0] : req.params.assignmentId
        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId

        const assignment = await adjustAssignmentHours({
            assignmentId,
            userId,
            grantedHoursDelta,
            usedHoursDelta,
        })

        res.json({ assignment })
    } catch (err) {
        res.status(500).json({ message: (err as Error).message ?? 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/plan — asignar o quitar plan manualmente
router.patch('/users/:userId/plan', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { plan } = req.body as { plan: string | null }
        const validPlans = ['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger', null]
        if (!validPlans.includes(plan)) {
            res.status(400).json({ message: 'Plan inválido. Usa: intro, silver, gold, esmerald, diamond, no_life, challenger o null' })
            return
        }

        if (!plan) {
                await PlanAssignment.updateOne(
                    { userId: req.params.userId, status: 'active' },
                    { status: 'archived' }
                )

                const user = await User.findByIdAndUpdate(
                    req.params.userId,
                    {
                        plan: null,
                        hasPlan: false,
                        planActive: false,
                        currentPlanSlug: null,
                        currentPlanAssignmentId: null,
                        additionalHours: 0,
                    },
                { new: true, select: 'name email plan hasPlan planActive currentPlanSlug currentPlanAssignmentId' }
            )
            if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
            res.json({ plan: user.plan, hasPlan: user.hasPlan, planActive: user.planActive })
            return
        }

        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
        const assignment = await assignPlanToUser({
            userId,
            planSlug: plan as PlanSlug,
            source: 'admin',
        })

        const user = await User.findById(userId).select('name email plan hasPlan planActive currentPlanSlug currentPlanAssignmentId')
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        res.json({ plan: user.plan, hasPlan: user.hasPlan, planActive: user.planActive, assignment })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/admin/users/:userId/tareas — crear tarea
router.post('/users/:userId/tareas', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { titulo, texto } = req.body as { titulo?: string; texto?: string }
        if (!titulo?.trim()) { res.status(400).json({ message: 'El título de la tarea es requerido' }); return }
        if (titulo.trim().length > 300) { res.status(400).json({ message: 'El título no puede superar los 300 caracteres' }); return }
        if (texto && texto.trim().length > 300) { res.status(400).json({ message: 'La descripción no puede superar los 300 caracteres' }); return }
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        user.tareas.push({ titulo: titulo.trim(), texto: texto?.trim() ?? '', fechaCreacion: new Date(), estado: 'pendiente' } as any)
        await user.save()
        res.status(201).json({ tareas: user.tareas })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/tareas/:tareaId — editar título, texto y/o estado
router.patch('/users/:userId/tareas/:tareaId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { titulo, texto, estado } = req.body as { titulo?: string; texto?: string; estado?: string }
        const validEstados = ['pendiente', 'completada']
        if (estado !== undefined && !validEstados.includes(estado)) {
            res.status(400).json({ message: 'Estado inválido. Usa: pendiente o completada' }); return
        }
        if (titulo !== undefined && titulo.trim().length > 300) { res.status(400).json({ message: 'El título no puede superar los 300 caracteres' }); return }
        if (texto !== undefined && texto.trim().length > 300) { res.status(400).json({ message: 'La descripción no puede superar los 300 caracteres' }); return }
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        const tarea = (user.tareas as unknown as Array<{ _id: { toString(): string }; titulo: string; texto: string; estado: string }>)
            .find((t) => t._id.toString() === req.params.tareaId)
        if (!tarea) { res.status(404).json({ message: 'Tarea no encontrada' }); return }
        if (titulo?.trim()) tarea.titulo = titulo.trim()
        if (texto !== undefined) tarea.texto = texto.trim()
        if (estado) tarea.estado = estado
        await user.save()
        res.json({ tareas: user.tareas })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// DELETE /api/admin/users/:userId/tareas/:tareaId — eliminar tarea
router.delete('/users/:userId/tareas/:tareaId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        const idx = (user.tareas as unknown as Array<{ _id: { toString(): string } }>)
            .findIndex((t) => t._id.toString() === req.params.tareaId)
        if (idx === -1) { res.status(404).json({ message: 'Tarea no encontrada' }); return }
        user.tareas.splice(idx, 1)
        await user.save()
        res.json({ tareas: user.tareas })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/topic-status/:topicId — update by subdoc _id
router.patch('/users/:userId/topic-status/:topicId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { status } = req.body as { status: string }
        const validStatuses = ['pendiente', 'en-progreso', 'completado']
        if (!validStatuses.includes(status)) {
            res.status(400).json({ message: 'Estado inválido' }); return
        }
        const user = await User.findById(req.params.userId)
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }

        const topic = user.topics.find((t: any) => t._id?.toString() === req.params.topicId)
        if (!topic) { res.status(404).json({ message: 'Tema no encontrado' }); return }

        topic.status = status as 'pendiente' | 'en-progreso' | 'completado'
        await user.save()
        res.json({ topics: user.topics })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// GET /api/admin/herramientas — obtener todos los topics de la categoría "Herramientas"
router.get('/herramientas', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const category = await Category.findOne({ name: 'Herramientas' })
        if (!category) {
            res.status(404).json({ message: 'Categoría Herramientas no encontrada' })
            return
        }
        const tools = await Topic.find({ categoryId: category._id }).lean()
        res.json(tools)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// GET /api/admin/users/:userId/herramientas — obtener las herramientas del usuario
router.get('/users/:userId/herramientas', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const user = await User.findById(req.params.userId).select('tools').lean()
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' })
            return
        }
        res.json(user.tools ?? [])
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/admin/users/:userId/herramientas — agregar una herramienta al usuario
router.post('/users/:userId/herramientas', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { topicId, name } = req.body as { topicId: string; name: string }
        if (!topicId || !name?.trim()) {
            res.status(400).json({ message: 'topicId y name son requeridos' })
            return
        }

        const user = await User.findById(req.params.userId)
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' })
            return
        }

        const alreadyExists = user.tools.some((t: any) => t.topicId === topicId)
        if (alreadyExists) {
            res.status(409).json({ message: 'El usuario ya tiene esta herramienta' })
            return
        }

        user.tools.push({ name: name.trim(), topicId, active: true, addedAt: new Date() } as any)
        await user.save()
        res.status(201).json({ tools: user.tools })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/admin/users/:userId/herramientas/:toolId — actualizar estado activo/inactivo
router.patch('/users/:userId/herramientas/:toolId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { active } = req.body as { active: boolean }
        if (active === undefined) {
            res.status(400).json({ message: 'El campo active es requerido' })
            return
        }

        const user = await User.findById(req.params.userId)
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' })
            return
        }

        const tool = user.tools.find((t: any) => t._id?.toString() === req.params.toolId)
        if (!tool) {
            res.status(404).json({ message: 'Herramienta no encontrada' })
            return
        }

        tool.active = active
        await user.save()
        res.json({ tools: user.tools })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// DELETE /api/admin/users/:userId/herramientas/:toolId — eliminar una herramienta del usuario
router.delete('/users/:userId/herramientas/:toolId', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const user = await User.findById(req.params.userId)
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' })
            return
        }

        const idx = user.tools.findIndex((t: any) => t._id?.toString() === req.params.toolId)
        if (idx === -1) {
            res.status(404).json({ message: 'Herramienta no encontrada' })
            return
        }

        user.tools.splice(idx, 1)
        await user.save()
        res.json({ tools: user.tools })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

export default router
