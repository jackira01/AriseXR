import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

import mongoose from 'mongoose'
import { Plan, type IPlanDefinition } from '../models/Plan.js'

const FRONTEND_PLANS: Omit<IPlanDefinition, 'stripePriceId'>[] = [
    {
        slug: 'intro',
        name: 'Intro Pack',
        description: 'El punto de partida perfecto para conocer nuestro método y análisis de errores.',
        price: 31,
        currency: 'USD',
        totalHours: 1,
        features: ['Análisis de errores', 'Retroalimentación inicial'],
        badge: 'INICIADOR',
        rankImage: '/ranks/grandmaster.png',
        active: true,
        sortOrder: 1,
    },
    {
        slug: 'silver',
        name: 'Silver Pack',
        description: 'El punto de partida ideal para comenzar a mejorar con estructura y guía profesional.',
        price: 125,
        currency: 'USD',
        totalHours: 4,
        features: ['Retroalimentación personalizada', 'Coach en vivo'],
        badge: null,
        rankImage: '/ranks/silver.webp',
        active: true,
        sortOrder: 2,
    },
    {
        slug: 'gold',
        name: 'Gold Pack',
        description: 'Una propuesta de alto impacto para jugadores que buscan una guía más profunda y continua.',
        price: 99,
        currency: 'USD',
        totalHours: 6,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado'],
        badge: 'ORO',
        rankImage: '/ranks/gold.webp',
        active: true,
        sortOrder: 3,
    },
    {
        slug: 'esmerald',
        name: 'Esmerald Pack',
        description: 'Para jugadores que quieren progresar de forma constante y afianzar sus bases.',
        price: 219,
        currency: 'USD',
        totalHours: 10,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo'],
        badge: null,
        rankImage: '/ranks/emerald.png',
        active: true,
        sortOrder: 4,
    },
    {
        slug: 'diamond',
        name: 'Diamond Pack',
        description: 'El equilibrio perfecto entre intensidad y resultados para escalar de rango rápidamente.',
        price: 500,
        currency: 'USD',
        totalHours: 18,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo', 'Videos personalizados de mejoras', 'Teorías aplicadas al juego'],
        badge: 'RECOMENDADO',
        rankImage: '/ranks/diamond.png',
        active: true,
        sortOrder: 5,
    },
    {
        slug: 'no_life',
        name: 'No Life Pack',
        description: 'El paquete más intenso para jugadores que quieren acompañamiento diario y seguimiento continuo.',
        price: 2499,
        currency: 'USD',
        totalHours: 0,
        features: ['Sesión diaria garantizada', 'Todo lo del Chall Pack incluido', 'Seguimiento y ajuste día a día', 'Acceso prioritario directo contigo'],
        badge: 'EXCLUSIVO',
        rankImage: '/ranks/no_life.jpg',
        active: true,
        sortOrder: 6,
    },
    {
        slug: 'challenger',
        name: 'Chall Pack',
        description: 'El programa más intensivo. Máxima dedicación para quienes van en serio al Retador.',
        price: 938,
        currency: 'USD',
        totalHours: 32,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo', 'Videos personalizados de mejoras', 'Teorías aplicadas al juego', 'Práctica guiada', 'Entendimiento analítico pre y post game'],
        badge: 'RETADOR',
        rankImage: '/ranks/challenger.png',
        active: true,
        sortOrder: 7,
    },
]

async function seedPlans() {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        console.error('MONGODB_URI no definida en .env')
        process.exit(1)
    }

    await mongoose.connect(uri)
    console.log('Conectado a MongoDB')

    let upserted = 0
    let created = 0

    for (const plan of FRONTEND_PLANS) {
        const existing = await Plan.findOne({ slug: plan.slug })
        if (existing) {
            await Plan.updateOne({ slug: plan.slug }, { $set: plan })
            upserted++
        } else {
            await Plan.create(plan)
            created++
        }
        console.log(`  ${existing ? 'Actualizado' : 'Creado'}  ${plan.slug} — ${plan.name} ($${plan.price} USD, ${plan.totalHours}h)`)
    }

    console.log(`\nSeed completado: ${created} creados, ${upserted} actualizados`)
    await mongoose.disconnect()
}

seedPlans().catch((err) => {
    console.error('Error:', err)
    process.exit(1)
})
