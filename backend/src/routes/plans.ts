import { Router, type Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { Plan, ensureDefaultPlans, type PlanSlug, type PlanTimeUnit } from '../models/Plan.js'

const router = Router()

function requireAdmin(req: AuthRequest, res: Response): boolean {
    if (req.userRole !== 'admin') {
        res.status(403).json({ message: 'Acceso denegado' })
        return false
    }
    return true
}

router.get('/', async (_req, res) => {
    try {
        await ensureDefaultPlans()
        const plans = await Plan.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean()
        res.json(plans)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

router.get('/:slug', async (req, res) => {
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
        const plan = await Plan.findOne({ slug: slug.toLowerCase() as PlanSlug }).lean()
        if (!plan) {
            res.status(404).json({ message: 'Plan no encontrado' })
            return
        }
        res.json(plan)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const payload = req.body as Partial<{
            slug: PlanSlug
            name: string
            description: string
            price: number
            currency: string
            totalHours: number
            timeValue: number | null
            timeUnit: PlanTimeUnit
            stripePriceId: string | null
            features: string[]
            badge: string | null
            rankImage: string | null
            active: boolean
            sortOrder: number
        }>

        if (!payload.slug || !payload.name) {
            res.status(400).json({ message: 'slug y name son requeridos' })
            return
        }

        const created = await Plan.create({
            slug: payload.slug,
            name: payload.name,
            description: payload.description ?? '',
            price: payload.price ?? 0,
            currency: payload.currency ?? 'USD',
            totalHours: payload.totalHours ?? 0,
            timeValue: payload.timeValue ?? null,
            timeUnit: payload.timeUnit ?? 'hours',
            stripePriceId: payload.stripePriceId ?? null,
            features: payload.features ?? [],
            badge: payload.badge ?? null,
            rankImage: payload.rankImage ?? null,
            active: payload.active ?? true,
            sortOrder: payload.sortOrder ?? 0,
        })

        res.status(201).json(created)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

router.patch('/:slug', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
        const updated = await Plan.findOneAndUpdate(
            { slug: slug.toLowerCase() as PlanSlug },
            req.body,
            { new: true }
        )

        if (!updated) {
            res.status(404).json({ message: 'Plan no encontrado' })
            return
        }

        res.json(updated)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

router.delete('/:slug', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug
        const deleted = await Plan.findOneAndDelete({ slug: slug.toLowerCase() as PlanSlug })
        if (!deleted) {
            res.status(404).json({ message: 'Plan no encontrado' })
            return
        }
        res.json({ deleted: true })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

export default router
