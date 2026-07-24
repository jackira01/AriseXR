export type PlanSlug = 'intro' | 'silver' | 'gold' | 'esmerald' | 'diamond' | 'no_life' | 'challenger' | null

export interface PlanDefinition {
    slug: Exclude<PlanSlug, null>
    name: string
    totalHours: number
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
