import { Router, type Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { Invoice } from '../models/Invoice.js'
import { Topic } from '../models/Topic.js'
import { Category } from '../models/Category.js'

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
        const user = await User.findById(req.params.userId).select('-password -verificationCode -verificationCodeExpires').lean()
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        res.json(user)
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
        res.status(201).json({ sessions: user.sessions, completedHours: user.sessions.reduce((a, s) => a + s.hours, 0) })
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

        if (hours !== undefined && hours > 0) s.hours = hours
        if (topic?.trim()) s.topic = topic.trim()
        if (notes !== undefined) s.notes = notes.trim() || undefined
        if (date) s.date = date

        await user.save()
        res.json({ sessions: user.sessions, completedHours: user.sessions.reduce((a, x) => a + x.hours, 0) })
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

        const idx = (user.sessions as unknown as Array<{ _id: { toString(): string } }>)
            .findIndex((x) => x._id.toString() === req.params.sessionId)
        if (idx === -1) { res.status(404).json({ message: 'Sesión no encontrada' }); return }

        user.sessions.splice(idx, 1)
        await user.save()
        res.json({ sessions: user.sessions, completedHours: user.sessions.reduce((a, x) => a + x.hours, 0) })
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

// PATCH /api/admin/users/:userId/plan — asignar o quitar plan manualmente
router.patch('/users/:userId/plan', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { plan } = req.body as { plan: string | null }
        const validPlans = ['silver', 'esmerald', 'diamond', 'challenger', null]
        if (!validPlans.includes(plan)) {
            res.status(400).json({ message: 'Plan inválido. Usa: silver, esmerald, diamond, challenger o null' })
            return
        }
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                plan: plan ?? null,
                hasPlan: plan !== null,
                planActive: plan !== null,
            },
            { new: true, select: 'name email plan hasPlan planActive' }
        )
        if (!user) { res.status(404).json({ message: 'Usuario no encontrado' }); return }
        res.json({ plan: user.plan, hasPlan: user.hasPlan, planActive: user.planActive })
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

export default router
