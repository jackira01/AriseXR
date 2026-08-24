import 'dotenv/config'
import http from 'http'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import topicsRoutes from './routes/topics.js'
import chatRoutes from './routes/chat.js'
import paymentsRoutes from './routes/payments.js'
import plansRoutes from './routes/plans.js'
import { Message } from './models/Message.js'
import { User } from './models/User.js'

const app = express()
const httpServer = http.createServer(app)
const PORT = process.env.PORT ?? 4000
const SERVER_URL = process.env.NODE_ENV === 'production'
    ? process.env.SERVER_URL_PRODUCTION ?? `port ${PORT}`
    : `http://localhost:${PORT}`

// ── Socket.io ─────────────────────────────────────────────────────────────────
const SOCKET_ORIGINS = process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL_PRODUCTION!]
    : [process.env.CLIENT_URL_LOCAL || 'http://localhost:3000']

// ── Middleware CORS (solo si lo necesitas para otras rutas) ────────────────
app.use(cors({
    origin: true, // O un array simple si tienes múltiples orígenes
    credentials: true
}))

// Habilitar pre-flight para todas las rutas
app.options('*', cors())

app.use(morgan('dev'))

// Payments router must be mounted BEFORE express.json() so the webhook
// route can receive the raw request body required for Stripe signature verification
app.use('/api/payments', paymentsRoutes)
app.use('/api/order', paymentsRoutes)

app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────
console.log('[BOOT] Montando rutas de autenticación')
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/topics', topicsRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/plans', plansRoutes)

app.get('/', (_req, res) => {
    res.json({
        message: 'Bienvenido a la API de AriseXR',
        status: 'ok',
        version: '1.0.0',
    })
})

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
})

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: {
        // Socket.io acepta nativamente un array de strings para manejar los orígenes
        origin: SOCKET_ORIGINS,
        credentials: true
    },
})

// Auth middleware: verifica el JWT enviado en el handshake
io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('No autorizado'))
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: string
            role?: string
        }
        socket.data.userId = payload.userId
        socket.data.role = payload.role ?? 'user'
        next()
    } catch {
        next(new Error('Token inválido'))
    }
})

io.on('connection', (socket) => {
    const socketUserId: string = socket.data.userId
    const socketRole: string = socket.data.role

    // Los admins se unen a una sala compartida para recibir notificaciones de actividad
    if (socketRole === 'admin') {
        socket.join('admins')
    }

    // El cliente envía join_room con el userId de la sala (el del usuario normal)
    socket.on('join_room', (targetUserId: string) => {
        // Usuario solo puede unirse a su propia sala; admin puede unirse a cualquiera
        if (socketRole !== 'admin' && socketUserId !== targetUserId) {
            socket.emit('error', 'Acceso denegado')
            return
        }
        socket.join(`room:${targetUserId}`)
    })

    socket.on('send_message', async ({ roomUserId, text }: { roomUserId: string; text: string }) => {
        if (!text?.trim() || !roomUserId) return

        // Misma comprobación de autorización
        if (socketRole !== 'admin' && socketUserId !== roomUserId) {
            socket.emit('error', 'Acceso denegado')
            return
        }

        try {
            const msg = await Message.create({
                roomUserId,
                senderRole: socketRole as 'user' | 'admin',
                text: text.trim().slice(0, 2000),
            })

            io.to(`room:${roomUserId}`).emit('receive_message', {
                _id: msg._id,
                roomUserId: msg.roomUserId,
                senderRole: msg.senderRole,
                text: msg.text,
                createdAt: msg.createdAt,
            })

            // Si el mensaje lo envió un usuario normal, notificar a los admins
            if (socketRole === 'user') {
                try {
                    const user = await User.findById(socketUserId).select('name email plan').lean() as { _id: unknown; name: string; email: string; plan?: string | null } | null
                    if (user) {
                        io.to('admins').emit('chat_activity', {
                            _id: String(user._id),
                            name: user.name,
                            email: user.email,
                            plan: user.plan ?? null,
                        })
                    }
                } catch { /* ignore */ }
            }
        } catch (err) {
            console.error('Error guardando mensaje:', err)
        }
    })

    socket.on('typing', (roomUserId: string) => {
        socket.to(`room:${roomUserId}`).emit('typing', socketRole)
    })

    socket.on('stop_typing', (roomUserId: string) => {
        socket.to(`room:${roomUserId}`).emit('stop_typing')
    })
})

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`🚀 Backend running on ${SERVER_URL}`)
    })
})