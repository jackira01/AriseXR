import { Router, type Request, type Response } from 'express'
import express from 'express'
import Stripe from 'stripe'
import { Plan } from '../models/Plan.js'
import { User } from '../models/User.js'
import { Invoice } from '../models/Invoice.js'
import { authMiddleware, type AuthRequest } from '../middleware/auth.js'
import { assignPlanToUser } from '../lib/planLifecycle.js'

const router = Router()

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string)
const allowPromotionCodes = process.env.STRIPE_ALLOW_PROMOTION_CODES === 'true'

const STRIPE_REDIRECT_URL = process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL_PRODUCTION
    : process.env.CLIENT_URL_LOCAL || 'http://localhost:3000'

const PLAN_LABELS: Record<string, string> = {
    intro: 'Intro Pack',
    silver: 'Silver Pack',
    gold: 'Gold Pack',
    esmerald: 'Esmerald Pack',
    diamond: 'Diamond Pack',
    no_life: 'No Life Pack',
    challenger: 'Chall Pack',
}

const VALID_PLAN_SLUGS = new Set(['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger'])

// ── POST /api/payments/create-checkout-session ────────────────────────────────
router.post(
    '/create-session',
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

        const planDoc = await Plan.findOne({ stripePriceId: priceId }).lean()
        if (!planDoc) {
            res.status(400).json({ error: 'priceId inválido' })
            return
        }

        const plan = planDoc.slug

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'payment',
                customer_email: email,
                client_reference_id: userId,
                line_items: [{ price: priceId, quantity: 1 }],
                metadata: { plan },
                allow_promotion_codes: allowPromotionCodes,
                success_url: `${STRIPE_REDIRECT_URL}/cuenta`,
                cancel_url: `${STRIPE_REDIRECT_URL}/cuenta`,
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
        let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>

        try {
            event = await stripe.webhooks.constructEventAsync(
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
            const plan = session.metadata?.plan as 'intro' | 'silver' | 'gold' | 'esmerald' | 'diamond' | 'no_life' | 'challenger' | undefined

            if (!userId || !plan || !VALID_PLAN_SLUGS.has(plan)) {
                res.status(400).json({ error: 'checkout.session.completed sin usuario o plan válido' })
                return
            }

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

                // 2. Activar plan en User. invoiceId evita duplicar asignaciones si Stripe reintenta.
                await assignPlanToUser({
                    userId,
                    planSlug: plan,
                    source: 'stripe',
                    invoiceId: session.id,
                    assignedAt: new Date(event.created * 1000),
                })

                await User.findByIdAndUpdate(userId, {
                    $addToSet: {
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
                // 500 hace que Stripe reintente; el invoiceId hace el procesamiento idempotente.
                console.error('[Stripe] Error procesando checkout.session.completed:', err)
                res.status(500).json({ error: 'No se pudo procesar el pago' })
                return
            }
        }

        res.json({ received: true })
    }
)

export default router
