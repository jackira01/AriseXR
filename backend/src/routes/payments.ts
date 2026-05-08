import { Router, type Request, type Response } from 'express'
import express from 'express'
import Stripe from 'stripe'
import { User } from '../models/User.js'
import { Invoice } from '../models/Invoice.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'

const router = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)

const PLAN_LABELS: Record<string, string> = {
    intro: 'Intro Pack',
    silver: 'Silver Pack',
    esmerald: 'Esmerald Pack',
    diamond: 'Diamond Pack',
    challenger: 'Chall Pack',
}

function buildPricePlanMap(): Record<string, string> {
    const map: Record<string, string> = {}
    const entries: [string, string][] = [
        [process.env.STRIPE_PRICE_INTRO ?? '', 'intro'],
        [process.env.STRIPE_PRICE_SILVER ?? '', 'silver'],
        [process.env.STRIPE_PRICE_ESMERALD ?? '', 'esmerald'],
        [process.env.STRIPE_PRICE_DIAMOND ?? '', 'diamond'],
        [process.env.STRIPE_PRICE_CHALLENGER ?? '', 'challenger'],
    ]
    for (const [priceId, plan] of entries) {
        if (priceId) map[priceId] = plan
    }
    return map
}

const PRICE_PLAN_MAP = buildPricePlanMap()

// ── POST /api/payments/create-checkout-session ────────────────────────────────
router.post(
    '/create-checkout-session',
    express.json(),
    async (req: Request, res: Response) => {
        const { userId, email, priceId } = req.body as {
            userId: string
            email: string
            priceId: string
        }

        if (!userId || !email || !priceId) {
            res.status(400).json({ error: 'userId, email y priceId son requeridos' })
            return
        }

        const plan = PRICE_PLAN_MAP[priceId]
        if (!plan) {
            res.status(400).json({ error: 'priceId inválido' })
            return
        }

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                customer_email: email,
                client_reference_id: userId,
                line_items: [{ price: priceId, quantity: 1 }],
                metadata: { plan },
                success_url: `${process.env.CLIENT_URL}/cuenta`,
                cancel_url: `${process.env.CLIENT_URL}/cuenta`,
            })

            res.json({ url: session.url })
        } catch (err) {
            console.error('[Stripe] create-checkout-session error:', err)
            res.status(500).json({ error: 'No se pudo crear la sesión de pago' })
        }
    }
)

// ── GET /api/payments/invoices ────────────────────────────────────────────────
router.get('/invoices', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const invoices = await Invoice.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .lean()
        res.json(invoices)
    } catch (err) {
        console.error('[Invoices] Error al obtener facturas:', err)
        res.status(500).json({ error: 'Error al obtener facturas' })
    }
})

// ── POST /api/payments/webhook ────────────────────────────────────────────────
// Debe montarse ANTES de express.json() global — recibe el body raw de Stripe
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
        const sig = req.headers['stripe-signature'] as string
        let event: ReturnType<typeof stripe.webhooks.constructEvent>

        try {
            event = stripe.webhooks.constructEvent(
                req.body as Buffer,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET as string
            )
        } catch (err) {
            console.error('[Stripe] Webhook signature error:', (err as Error).message)
            res.status(400).send(`Webhook Error: ${(err as Error).message}`)
            return
        }

        if (event.type === 'checkout.session.completed') {
            // Tipamos solo los campos necesarios para evitar problemas de namespace en CJS
            const session = event.data.object as {
                id: string
                client_reference_id: string | null
                metadata: Record<string, string> | null
                amount_total: number | null
                currency: string | null
            }

            const userId = session.client_reference_id
            const plan = session.metadata?.plan as 'silver' | 'esmerald' | 'diamond' | 'challenger' | undefined

            if (userId && plan) {
                try {
                    const amountTotal = session.amount_total ?? 0
                    const currency = (session.currency ?? 'usd').toUpperCase()
                    const planLabel = PLAN_LABELS[plan] ?? plan
                    const description = `${planLabel} — Pago único`
                    const dateLabel = new Date().toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })

                    // 1. Crear documento Invoice (upsert para idempotencia)
                    await Invoice.findOneAndUpdate(
                        { stripeSessionId: session.id },
                        {
                            $setOnInsert: {
                                userId,
                                stripeSessionId: session.id,
                                plan,
                                planLabel,
                                description,
                                amount: amountTotal / 100,
                                currency,
                                status: 'Pagado',
                            },
                        },
                        { upsert: true, new: true }
                    )

                    // 2. Activar plan en User y registrar factura embebida
                    await User.findByIdAndUpdate(userId, {
                        hasPlan: true,
                        planActive: true,
                        plan,
                        $push: {
                            invoices: {
                                invoiceId: session.id,
                                date: dateLabel,
                                description,
                                amount: amountTotal / 100,
                                currency,
                                status: 'Pagado',
                            },
                        },
                    })
                } catch (err) {
                    console.error('[Stripe] Error procesando checkout.session.completed:', err)
                }
            }
        }

        res.json({ received: true })
    }
)

export default router
