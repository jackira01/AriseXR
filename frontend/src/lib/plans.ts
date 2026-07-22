export type PlanSlug = 'intro' | 'silver' | 'gold' | 'esmerald' | 'diamond' | 'no_life' | 'challenger' | null

export interface PlanDefinition {
    slug: Exclude<PlanSlug, null>
    name: string
    badge?: string
    price: string
    highlight?: boolean
    rankImg: string
    rankGlow: string
    detail1: string
    detail2: string
    detail3: string
    description?: string
    cta?: string
    priceId?: string
    guarantee?: boolean
    features: string[]
    totalHours: number
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
    {
        slug: 'intro',
        name: 'Intro Pack',
        badge: 'INICIADOR',
        price: '$31 USD',
        highlight: false,
        rankImg: '/ranks/grandmaster.png',
        rankGlow: '#90a4ae',
        detail1: '1 hr en total',
        detail2: '1 game',
        detail3: '1 – 2',
        description: 'El punto de partida perfecto para conocer nuestro método y análisis de errores.',
        cta: 'Elegir Intro',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INTRO ?? '',
        guarantee: false,
        features: ['Análisis de errores', 'Retroalimentación inicial'],
        totalHours: 1,
    },
    {
        slug: 'gold',
        name: 'Gold Pack',
        badge: 'ORO',
        price: '$99 USD',
        highlight: false,
        rankImg: '/ranks/gold.webp',
        rankGlow: '#ffcf4d',
        detail1: '6 hrs en total',
        detail2: '3 herramientas',
        detail3: 'Personalizado',
        description: 'Una propuesta de alto impacto para jugadores que buscan una guía más profunda y continua.',
        cta: 'Elegir Gold',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GOLD ?? '',
        guarantee: false,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado'],
        totalHours: 6,
    },
    {
        slug: 'silver',
        name: 'Silver Pack',
        badge: '',
        price: '$125 USD',
        highlight: false,
        rankImg: '/ranks/silver.webp',
        rankGlow: '#90a4ae',
        detail1: '4 hrs en total',
        detail2: '5 games',
        detail3: '4 – 6',
        description: 'El punto de partida ideal para comenzar a mejorar con estructura y guía profesional.',
        cta: 'Elegir Silver',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SILVER ?? '',
        guarantee: false,
        features: ['Retroalimentación personalizada', 'Coach en vivo'],
        totalHours: 4,
    },
    {
        slug: 'esmerald',
        name: 'Esmerald Pack',
        badge: '',
        price: '$219 USD',
        highlight: false,
        rankImg: '/ranks/emerald.png',
        rankGlow: '#3dba6a',
        detail1: '10 hrs en total',
        detail2: '10 games',
        detail3: '8 – 10',
        description: 'Para jugadores que quieren progresar de forma constante y afianzar sus bases.',
        cta: 'Elegir Esmerald',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESMERALD ?? '',
        guarantee: false,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo'],
        totalHours: 10,
    },
    {
        slug: 'diamond',
        name: 'Diamond Pack',
        badge: 'RECOMENDADO',
        price: '$500 USD',
        highlight: true,
        rankImg: '/ranks/diamond.png',
        rankGlow: '#4a9ee0',
        detail1: '18 hrs en total',
        detail2: '15 games',
        detail3: '9 – 10',
        description: 'El equilibrio perfecto entre intensidad y resultados para escalar de rango rápidamente.',
        cta: 'Elegir Diamond',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_DIAMOND ?? '',
        guarantee: false,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo', 'Videos personalizados de mejoras', 'Teorías aplicadas al juego'],
        totalHours: 18,
    },
    {
        slug: 'challenger',
        name: 'Chall Pack',
        badge: 'RETADOR',
        price: '$938 USD',
        highlight: false,
        rankImg: '/ranks/challenger.png',
        rankGlow: '#ffd600',
        detail1: '32 hrs en total',
        detail2: '20 games',
        detail3: '12 – 14',
        description: 'El programa más intensivo. Máxima dedicación para quienes van en serio al Retador.',
        cta: 'Ir al Retador',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CHALLENGER ?? '',
        guarantee: true,
        features: ['Retroalimentación personalizada', 'Coach en vivo', 'Entrenamiento personalizado', 'Análisis previo', 'Videos personalizados de mejoras', 'Teorías aplicadas al juego', 'Práctica guiada', 'Entendimiento analítico pre y post game'],
        totalHours: 32,
    },
    {
        slug: 'no_life',
        name: 'No Life Pack',
        badge: 'EXCLUSIVO',
        price: '$2,499 USD',
        highlight: false,
        rankImg: '/ranks/no_life.jpg',
        rankGlow: '#c084fc',
        detail1: '2–4 hrs/día',
        detail2: '1 mes',
        detail3: 'Todas las herramientas',
        description: 'El paquete más intenso para jugadores que quieren acompañamiento diario y seguimiento continuo.',
        cta: 'Elegir No Life',
        priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_NOLIFE ?? '',
        guarantee: false,
        features: ['Sesión diaria garantizada', 'Todo lo del Chall Pack incluido', 'Seguimiento y ajuste día a día', 'Acceso prioritario directo contigo'],
        totalHours: 0,
    },
]

export function getPlanDefinition(slug?: string | null): PlanDefinition | undefined {
    return PLAN_DEFINITIONS.find((plan) => plan.slug === slug)
}
