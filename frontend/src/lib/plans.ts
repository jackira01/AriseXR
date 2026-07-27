export type PlanSlug = 'intro' | 'silver' | 'gold' | 'esmerald' | 'diamond' | 'no_life' | 'challenger' | null

export type PlanTimeUnit = 'hours' | 'days' | 'months'

export interface PlanDefinition {
    slug: Exclude<PlanSlug, null>
    name: string
    totalHours: number
    timeValue?: number | null
    timeUnit?: PlanTimeUnit
}

// Tiempo del plan para mostrar en UI (el consumo interno sigue siendo por horas).
// Si no hay timeValue/timeUnit definidos, muestra totalHours en horas.
export function formatPlanTime(plan: { totalHours: number; timeValue?: number | null; timeUnit?: PlanTimeUnit | null }): string {
    const unit = plan.timeUnit ?? 'hours'
    const value = plan.timeValue ?? plan.totalHours
    if (unit === 'days') return `${value} ${value === 1 ? 'día' : 'días'}`
    if (unit === 'months') return `${value} ${value === 1 ? 'mes' : 'meses'}`
    return `${value} hrs`
}

const planCache = new Map<string, PlanDefinition>()
let cacheLoaded = false

export async function loadPlanCatalog(): Promise<void> {
    if (cacheLoaded) return
    try {
        const { getPlansCatalog } = await import('./api')
        const plans = await getPlansCatalog()
        for (const plan of plans) {
            planCache.set(plan.slug, {
                slug: plan.slug as Exclude<PlanSlug, null>,
                name: plan.name,
                totalHours: plan.totalHours,
                timeValue: plan.timeValue ?? null,
                timeUnit: plan.timeUnit ?? 'hours',
            })
        }
        cacheLoaded = true
    } catch {
    }
}

export function getPlanDefinition(slug?: string | null): PlanDefinition | undefined {
    if (!slug) return undefined
    return planCache.get(slug)
}
