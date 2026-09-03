import dotenv from 'dotenv'
import mongoose from 'mongoose'
import Stripe from 'stripe'
import { Plan } from '../models/Plan.js'

if (process.argv[2] === 'test') {
    process.env.NODE_ENV = 'test'
    process.env.ENV_FILE = '.env.test'
}

const envFile = process.env.ENV_FILE ?? (process.env.NODE_ENV === 'test' ? '.env.test' : '.env')
dotenv.config({ path: envFile, override: envFile === '.env.test' })

const stripeKey = process.env.STRIPE_SECRET_KEY
const mongoUri = process.env.MONGODB_URI

if (!stripeKey?.startsWith('sk_test_')) {
    throw new Error('Este script solo acepta STRIPE_SECRET_KEY=sk_test_...')
}
if (!mongoUri || !mongoUri.includes('test')) {
    throw new Error('Usa una base de datos de prueba, por ejemplo ariseXR_test')
}

const stripe = new Stripe(stripeKey)

async function createTestPrices() {
    await mongoose.connect(mongoUri!)
    const plans = await Plan.find({ active: { $ne: false } }).sort({ sortOrder: 1 })
    if (plans.length === 0) throw new Error('No hay planes en MongoDB. Ejecuta primero npm run seed:plans')

    const products = await stripe.products.list({ limit: 100, active: true })

    for (const plan of plans) {
        const metadataSlug = String(plan.slug)
        let product = products.data.find((candidate) => candidate.metadata?.arisexr_plan_slug === metadataSlug)

        if (!product) {
            product = await stripe.products.create({
                name: plan.name,
                description: plan.description || undefined,
                metadata: { arisexr_plan_slug: metadataSlug },
            })
            console.log(`Producto creado: ${product.name} (${product.id})`)
        }

        const amount = Math.round(plan.price * 100)
        const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 })
        let price = prices.data.find((candidate) =>
            candidate.type === 'one_time' &&
            candidate.unit_amount === amount &&
            candidate.currency === plan.currency.toLowerCase()
        )

        if (!price) {
            price = await stripe.prices.create({
                product: product.id,
                currency: plan.currency.toLowerCase(),
                unit_amount: amount,
                metadata: { arisexr_plan_slug: metadataSlug },
            })
            console.log(`Price creado: ${metadataSlug} -> ${price.id}`)
        } else {
            console.log(`Price existente: ${metadataSlug} -> ${price.id}`)
        }

        plan.stripePriceId = price.id
        await plan.save()
    }

    console.log('Precios de prueba creados y vinculados a los planes de MongoDB.')
}

createTestPrices()
    .catch((error) => {
        console.error('Error creando precios de prueba:', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await mongoose.disconnect()
    })
