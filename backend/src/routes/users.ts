import { Router, type Response } from 'express'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { User } from '../models/User.js'

const router = Router()

// GET /api/users/me
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.userId).select('-password')
        if (!user) {
            res.status(404).json({ message: 'Usuario no encontrado' })
            return
        }
        res.json(user)
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// PATCH /api/users/me/topics/:topicName
router.patch(
    '/me/topics/:topicName',
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
        const { topicName } = req.params
        const { status } = req.body as {
            status: 'pendiente' | 'en-progreso' | 'completado'
        }

        try {
            const user = await User.findById(req.userId)
            if (!user) {
                res.status(404).json({ message: 'Usuario no encontrado' })
                return
            }

            const topic = user.topics.find((t) => t.name === topicName)
            if (topic) {
                topic.status = status
            } else {
                user.topics.push({ name: topicName as string, status })
            }

            await user.save()
            res.json({ topics: user.topics })
        } catch {
            res.status(500).json({ message: 'Error interno del servidor' })
        }
    }
)

// PATCH /api/users/me/tareas/:tareaId — usuario actualiza el estado de su tarea
router.patch(
    '/me/tareas/:tareaId',
    authMiddleware,
    async (req: AuthRequest, res: Response) => {
        const { estado } = req.body as { estado?: string }
        const validEstados = ['pendiente', 'completada']
        if (!estado || !validEstados.includes(estado)) {
            res.status(400).json({ message: 'Estado inválido. Usa: pendiente o completada' })
            return
        }
        try {
            const user = await User.findById(req.userId)
            if (!user) {
                res.status(404).json({ message: 'Usuario no encontrado' })
                return
            }
            const tarea = (user.tareas as unknown as Array<{ _id: { toString(): string }; estado: string }>)
                .find((t) => t._id.toString() === req.params.tareaId)
            if (!tarea) {
                res.status(404).json({ message: 'Tarea no encontrada' })
                return
            }
            tarea.estado = estado
            await user.save()
            res.json({ tareas: user.tareas })
        } catch {
            res.status(500).json({ message: 'Error interno del servidor' })
        }
    }
)

export default router
