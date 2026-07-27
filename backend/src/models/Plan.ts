import mongoose, { Schema, type Document } from 'mongoose'

export type PlanSlug = 'intro' | 'silver' | 'gold' | 'esmerald' | 'diamond' | 'no_life' | 'challenger'

export type PlanTimeUnit = 'hours' | 'days' | 'months'

export interface IPlanDefinition {
    slug: PlanSlug
    name: string
    description: string
    price: number
    currency: string
    totalHours: number
    timeValue?: number | null
    timeUnit?: PlanTimeUnit
    stripePriceId?: string | null
    features: string[]
    badge?: string | null
    rankImage?: string | null
    active: boolean
    sortOrder: number
}

export interface IPlan extends Document, IPlanDefinition {
    createdAt: Date
    updatedAt: Date
}

const PlanSchema = new Schema<IPlan>(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            enum: ['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger'],
        },
        name: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        price: { type: Number, required: true, default: 0 },
        currency: { type: String, default: 'USD' },
        totalHours: { type: Number, required: true, default: 0 },
        // Tiempo a mostrar en UI (el consumo interno sigue siendo por horas).
        // Si timeValue es null y timeUnit es 'hours', se muestra totalHours.
        timeValue: { type: Number, default: null },
        timeUnit: { type: String, enum: ['hours', 'days', 'months'], default: 'hours' },
        stripePriceId: { type: String, default: null },
        features: { type: [String], default: [] },
        badge: { type: String, default: null },
        rankImage: { type: String, default: null },
        active: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
)

export const Plan = mongoose.model<IPlan>('Plan', PlanSchema)

export const DEFAULT_PLAN_DEFINITIONS: IPlanDefinition[] = [
    {
        slug: 'intro',
        name: 'Intro Pack',
        description: 'Ideal para empezar con estructura básica.',
        price: 49,
        currency: 'USD',
        totalHours: 2,
        stripePriceId: null,
        features: ['2 horas de coaching', 'Seguimiento orientado'],
        badge: 'Starter',
        rankImage: '/ranks/intro.png',
        active: true,
        sortOrder: 1,
    },
    {
        slug: 'silver',
        name: 'Silver Pack',
        description: 'Paquete pensado para trabajar con mayor continuidad.',
        price: 129,
        currency: 'USD',
        totalHours: 4,
        stripePriceId: null,
        features: ['4 horas de coaching', 'Análisis de partidas', 'Soporte más cercano'],
        badge: 'Popular',
        rankImage: '/ranks/silver.png',
        active: true,
        sortOrder: 2,
    },
    {
        slug: 'gold',
        name: 'Gold Pack',
        description: 'El siguiente paso para mejorar de forma consistente.',
        price: 229,
        currency: 'USD',
        totalHours: 8,
        stripePriceId: null,
        features: ['8 horas de coaching', 'Plan de mejora', 'Sesiones detalladas'],
        badge: 'Pro',
        rankImage: '/ranks/gold.png',
        active: true,
        sortOrder: 3,
    },
    {
        slug: 'esmerald',
        name: 'Esmerald Pack',
        description: 'Más profundidad y acompañamiento para cada semana.',
        price: 349,
        currency: 'USD',
        totalHours: 12,
        stripePriceId: null,
        features: ['12 horas de coaching', 'Seguimiento semanal', 'Enfoque de mejora continua'],
        badge: 'Premium',
        rankImage: '/ranks/esmerald.png',
        active: true,
        sortOrder: 4,
    },
    {
        slug: 'diamond',
        name: 'Diamond Pack',
        description: 'Para jugadores que buscan una mejora seria y sostenida.',
        price: 499,
        currency: 'USD',
        totalHours: 20,
        stripePriceId: null,
        features: ['20 horas de coaching', 'Acompañamiento fuerte', 'Estrategia profunda'],
        badge: 'Elite',
        rankImage: '/ranks/diamond.png',
        active: true,
        sortOrder: 5,
    },
    {
        slug: 'no_life',
        name: 'No Life Pack',
        description: 'Para jugadores comprometidos con una mejora profunda.',
        price: 799,
        currency: 'USD',
        totalHours: 40,
        timeValue: 1,
        timeUnit: 'months',
        stripePriceId: null,
        features: ['40 horas de coaching', 'Atención intensiva', 'Feedback continuo'],
        badge: 'High Intensity',
        rankImage: '/ranks/no_life.png',
        active: true,
        sortOrder: 6,
    },
    {
        slug: 'challenger',
        name: 'Challenger Pack',
        description: 'Máximo nivel de acompañamiento y detalle.',
        price: 1199,
        currency: 'USD',
        totalHours: 60,
        stripePriceId: null,
        features: ['60 horas de coaching', 'Nivel experto', 'Acompañamiento premium'],
        badge: 'Top Tier',
        rankImage: '/ranks/challenger.png',
        active: true,
        sortOrder: 7,
    },
]

export async function ensureDefaultPlans() {
    for (const planDefinition of DEFAULT_PLAN_DEFINITIONS) {
        await Plan.updateOne(
            { slug: planDefinition.slug },
            {
                $setOnInsert: {
                    slug: planDefinition.slug,
                    name: planDefinition.name,
                    description: planDefinition.description,
                    price: planDefinition.price,
                    currency: planDefinition.currency,
                    totalHours: planDefinition.totalHours,
                    timeValue: planDefinition.timeValue ?? null,
                    timeUnit: planDefinition.timeUnit ?? 'hours',
                    stripePriceId: planDefinition.stripePriceId,
                    features: planDefinition.features,
                    badge: planDefinition.badge,
                    rankImage: planDefinition.rankImage,
                    active: planDefinition.active,
                    sortOrder: planDefinition.sortOrder,
                },
            },
            { upsert: true }
        )

        // Migración suave: completar timeValue/timeUnit en planes existentes que no los tengan
        await Plan.updateOne(
            { slug: planDefinition.slug, timeUnit: { $exists: false } },
            { $set: { timeValue: planDefinition.timeValue ?? null, timeUnit: planDefinition.timeUnit ?? 'hours' } }
        )
    }
}
