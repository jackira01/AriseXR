import { Router, type Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { Category } from '../models/Category.js'
import { Topic } from '../models/Topic.js'

const router = Router()

function requireAdmin(req: AuthRequest, res: Response): boolean {
    if (req.userRole !== 'admin') {
        res.status(403).json({ message: 'Acceso denegado' })
        return false
    }
    return true
}

// ── Categories ───────────────────────────────────────────────────────────────

// GET /api/topics/categories  — list all categories with their topics
router.get('/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 }).lean()
        const topics = await Topic.find().sort({ createdAt: -1 }).lean()

        const result = categories.map((cat) => ({
            ...cat,
            topics: topics.filter((t) => String(t.categoryId) === String(cat._id)),
        }))
        res.json(result)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/topics/categories
router.post('/categories', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { name } = req.body as { name: string }
        if (!name?.trim()) { res.status(400).json({ message: 'El nombre es requerido' }); return }

        const existing = await Category.findOne({ name: name.trim() })
        if (existing) { res.status(409).json({ message: 'Ya existe una categoría con ese nombre' }); return }

        const category = await Category.create({ name: name.trim() })
        res.status(201).json(category)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/topics/categories/:id
router.patch('/categories/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { name } = req.body as { name: string }
        if (!name?.trim()) { res.status(400).json({ message: 'El nombre es requerido' }); return }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name: name.trim() },
            { new: true }
        )
        if (!category) { res.status(404).json({ message: 'Categoría no encontrada' }); return }
        res.json(category)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// DELETE /api/topics/categories/:id
router.delete('/categories/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const topicsCount = await Topic.countDocuments({ categoryId: req.params.id })
        if (topicsCount > 0) {
            res.status(409).json({ message: `No se puede eliminar: tiene ${topicsCount} tema(s) asignado(s)` })
            return
        }
        const category = await Category.findByIdAndDelete(req.params.id)
        if (!category) { res.status(404).json({ message: 'Categoría no encontrada' }); return }
        res.json({ message: 'Categoría eliminada' })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// ── Topics ───────────────────────────────────────────────────────────────────

// POST /api/topics
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { name, categoryId } = req.body as { name: string; categoryId: string }
        if (!name?.trim() || !categoryId) {
            res.status(400).json({ message: 'Nombre y categoría son requeridos' })
            return
        }
        const category = await Category.findById(categoryId)
        if (!category) { res.status(404).json({ message: 'Categoría no encontrada' }); return }

        const existing = await Topic.findOne({ name: name.trim(), categoryId })
        if (existing) { res.status(409).json({ message: 'Ya existe ese tema en esta categoría' }); return }

        const topic = await Topic.create({ name: name.trim(), categoryId })
        res.status(201).json({ ...topic.toObject(), categoryName: category.name })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/topics/:id
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const { name, categoryId } = req.body as { name?: string; categoryId?: string }
        const update: { name?: string; categoryId?: string } = {}
        if (name?.trim()) update.name = name.trim()
        if (categoryId) update.categoryId = categoryId

        const topic = await Topic.findByIdAndUpdate(req.params.id, update, { new: true }).populate<{ categoryId: { name: string } }>('categoryId', 'name')
        if (!topic) { res.status(404).json({ message: 'Tema no encontrado' }); return }
        res.json(topic)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// DELETE /api/topics/:id
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
    if (!requireAdmin(req, res)) return
    try {
        const topic = await Topic.findByIdAndDelete(req.params.id)
        if (!topic) { res.status(404).json({ message: 'Tema no encontrado' }); return }
        res.json({ message: 'Tema eliminado' })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

export default router
