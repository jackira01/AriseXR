import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import Mailjet from 'node-mailjet'
import { User } from '../models/User.js'
import { PendingRegistration } from '../models/PendingRegistration.js'

const router = Router()

function getMailjet() {
    return new Mailjet({
        apiKey: process.env.MJ_APIKEY_PUBLIC as string,
        apiSecret: process.env.MJ_APIKEY_PRIVATE as string,
    })
}

function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendVerificationEmail(email: string, code: string) {
    const mailjet = getMailjet()
    return mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
            {
                From: { Email: process.env.MJ_SENDER_EMAIL as string, Name: 'Arise Coach' },
                To: [{ Email: email }],
                Subject: 'Código de verificación - Arise Coach',
                HTMLPart: `
                    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#0a0a0a;color:#fff0f0;border-radius:16px;">
                        <h2 style="color:#ef4444;margin-bottom:8px;">Verifica tu correo</h2>
                        <p style="color:rgba(255,210,210,.7);margin-bottom:24px;">Usa el siguiente código para completar tu registro en Arise Coach. Expira en 10 minutos.</p>
                        <div style="font-size:2.5rem;font-weight:bold;letter-spacing:10px;text-align:center;color:#fff;background:#1a0a0a;border:1px solid #7f1d1d;border-radius:12px;padding:20px;">${code}</div>
                        <p style="color:rgba(255,210,210,.4);font-size:.8rem;margin-top:24px;">Si no solicitaste esto, ignora este correo.</p>
                    </div>
                `,
            },
        ],
    })
}

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string }

    if (!email || !password) {
        res.status(400).json({ message: 'Email y contraseña son requeridos' })
        return
    }

    try {
        const user = await User.findOne({ email })
        if (!user) {
            res.status(401).json({ message: 'Credenciales inválidas' })
            return
        }

        if (user.provider === 'google') {
            res.status(401).json({ message: 'Esta cuenta fue registrada con Google. Inicia sesión con el botón de Google.', code: 'google_provider' })
            return
        }

        const match = await user.comparePassword(password)
        if (!match) {
            res.status(401).json({ message: 'Credenciales inválidas' })
            return
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
        )

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role,
            },
        })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/auth/register  (email/password) — guarda registro pendiente (fuera de User) y envía código
router.post('/register', async (req: Request, res: Response) => {
    const { name, email, password } = req.body as {
        name: string
        email: string
        password: string
    }

    console.log('[AUTH][REGISTER] Petición recibida', {
        email,
        name,
        hasPassword: Boolean(password),
    })

    if (!name || !email || !password) {
        console.log('[AUTH][REGISTER] Datos incompletos', { name: Boolean(name), email: Boolean(email), password: Boolean(password) })
        res.status(400).json({ message: 'Todos los campos son requeridos' })
        return
    }

    try {
        // Rechazar si ya existe una cuenta con ese email
        const existing = await User.findOne({ email, emailVerified: true })
        if (existing) {
            console.log('[AUTH][REGISTER] Conflicto: email ya registrado')
            res.status(409).json({ message: 'El email ya está registrado' })
            return
        }

        const code = generateCode()
        const expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos

        // Guardar como registro pendiente (NO se crea el User hasta verificar)
        const pending = await PendingRegistration.findOne({ email })
        if (pending) {
            pending.name = name
            pending.password = password
            pending.code = code
            pending.expires = expires
            await pending.save()
        } else {
            await PendingRegistration.create({ name, email, password, code, expires })
        }
        console.log('[AUTH][REGISTER] Registro pendiente guardado')

        await sendVerificationEmail(email, code)
        console.log('[AUTH][REGISTER] Código de verificación enviado')
        res.json({ message: 'Código enviado' })
    } catch (err) {
        console.error('[AUTH][REGISTER] Error en registro:', err)
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/auth/send-verification  — reenvía el código de un registro pendiente
router.post('/send-verification', async (req: Request, res: Response) => {
    const { email } = req.body as { email: string }

    if (!email) {
        res.status(400).json({ message: 'Email requerido' })
        return
    }

    try {
        console.log('[AUTH][SEND-VERIFICATION] Petición recibida', { email })

        const existing = await User.findOne({ email, emailVerified: true })
        if (existing) {
            console.log('[AUTH][SEND-VERIFICATION] Conflicto: email ya registrado')
            res.status(409).json({ message: 'El email ya está registrado' })
            return
        }

        const pending = await PendingRegistration.findOne({ email })
        if (!pending) {
            console.log('[AUTH][SEND-VERIFICATION] No hay registro pendiente')
            res.status(404).json({ message: 'No hay un registro pendiente para este email. Regístrate primero.' })
            return
        }

        pending.code = generateCode()
        pending.expires = new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
        await pending.save()

        await sendVerificationEmail(email, pending.code)
        console.log('[AUTH][SEND-VERIFICATION] Código reenviado')
        res.json({ message: 'Código enviado' })
    } catch (err) {
        console.error('[AUTH][SEND-VERIFICATION] Error enviando código:', err)
        res.status(500).json({ message: 'Error enviando el código de verificación' })
    }
})

// POST /api/auth/verify-code  — verifica el código y crea la cuenta (recién aquí se guarda en User)
router.post('/verify-code', async (req: Request, res: Response) => {
    const { email, code } = req.body as { email: string; code: string }
    console.log('[AUTH][VERIFY-CODE] Petición recibida', { email, codeLength: code?.length })

    if (!email || !code) {
        console.log('[AUTH][VERIFY-CODE] Datos incompletos', { email: Boolean(email), code: Boolean(code) })
        res.status(400).json({ message: 'Email y código son requeridos' })
        return
    }

    try {
        const pending = await PendingRegistration.findOne({ email })

        if (!pending) {
            console.log('[AUTH][VERIFY-CODE] Registro pendiente no encontrado')
            res.status(400).json({ message: 'Código no encontrado. Solicita uno nuevo.' })
            return
        }

        if (pending.expires < new Date()) {
            console.log('[AUTH][VERIFY-CODE] Código expirado')
            res.status(400).json({ message: 'El código ha expirado. Solicita uno nuevo.' })
            return
        }

        if (pending.code !== code) {
            console.log('[AUTH][VERIFY-CODE] Código incorrecto')
            res.status(400).json({ message: 'Código incorrecto' })
            return
        }

        // Limpiar usuario legacy no verificado con ese email (si existe de la lógica anterior)
        await User.deleteOne({ email, emailVerified: false })

        // Código correcto → crear la cuenta (insertMany evita re-hashear el password ya hasheado)
        await User.insertMany([{
            name: pending.name,
            email: pending.email,
            password: pending.password,
            provider: 'credentials',
            emailVerified: true,
        }])
        await pending.deleteOne()
        console.log('[AUTH][VERIFY-CODE] Cuenta creada y verificada')

        res.json({ message: 'Email verificado correctamente' })
    } catch (err) {
        console.error('[AUTH][VERIFY-CODE] Error verificando código:', err)
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/auth/register-google  — crea o recupera un usuario de Google (sin verificación de correo)
router.post('/register-google', async (req: Request, res: Response) => {
    const { email, name } = req.body as { email: string; name: string }
    if (!email || !name) { res.status(400).json({ message: 'Email y nombre requeridos' }); return }

    try {
        let user = await User.findOne({ email })

        if (!user) {
            user = await User.create({ name, email, provider: 'google', emailVerified: true })
            // Descartar cualquier registro pendiente con ese email
            await PendingRegistration.deleteOne({ email })
        }

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role,
            },
            token: jwt.sign(
                { userId: user._id, role: user.role },
                process.env.JWT_SECRET as string,
                { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
            ),
        })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// LEGACY kept for backwards compat — use /register-google instead
router.post('/check-user', async (req: Request, res: Response) => {
    const { email } = req.body as { email: string }
    if (!email) { res.status(400).json({ message: 'Email requerido' }); return }
    try {
        const user = await User.findOne({ email, emailVerified: true })
        res.json({ exists: !!user })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

// POST /api/auth/login-google  — LEGACY, reemplazado por /register-google
router.post('/login-google', async (req: Request, res: Response) => {
    const { email } = req.body as { email: string }
    if (!email) { res.status(400).json({ message: 'Email requerido' }); return }

    try {
        const user = await User.findOne({ email, provider: 'google', emailVerified: true })
        if (!user) {
            res.status(401).json({ message: 'Cuenta no encontrada. Regístrate primero.' })
            return
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions
        )

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                plan: user.plan,
                role: user.role,
            },
        })
    } catch {
        res.status(500).json({ message: 'Error interno del servidor' })
    }
})

export default router
