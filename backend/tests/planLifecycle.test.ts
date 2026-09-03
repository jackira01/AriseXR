import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { Plan } from '../src/models/Plan.js'
import { PlanAssignment } from '../src/models/PlanAssignment.js'
import { User } from '../src/models/User.js'
import { assignPlanToUser, calculatePlanExpiresAt } from '../src/lib/planLifecycle.js'

// Datos de plan iguales a los que crea `seedPlans.ts` en producción.
// `no_life` es un plan mensual y en el seed se guarda con totalHours: 0.
const SEED_PLANS = [
    { slug: 'intro', name: 'Intro Pack', totalHours: 1, timeUnit: 'hours', timeValue: null },
    { slug: 'silver', name: 'Silver Pack', totalHours: 4, timeUnit: 'hours', timeValue: null },
    { slug: 'gold', name: 'Gold Pack', totalHours: 6, timeUnit: 'hours', timeValue: null },
    { slug: 'esmerald', name: 'Esmerald Pack', totalHours: 10, timeUnit: 'hours', timeValue: null },
    { slug: 'diamond', name: 'Diamond Pack', totalHours: 18, timeUnit: 'hours', timeValue: null },
    { slug: 'no_life', name: 'No Life Pack', totalHours: 0, timeUnit: 'months', timeValue: 1 },
    { slug: 'challenger', name: 'Chall Pack', totalHours: 32, timeUnit: 'hours', timeValue: null },
] as const

interface CapturedAssignment {
    userId: string
    planId: unknown
    planSlug: string
    grantedHours: number
    usedHours: number
    remainingHours: number
    status: string
    source: string
    trackingMode: string
    invoiceId: unknown
    expiresAt: Date | null
}

let createdAssignments: CapturedAssignment[]
let updatedUsers: Array<{ userId: string; update: Record<string, unknown> }>
let previousActiveAssignment: { grantedHours: number; usedHours: number; status: string; save: () => Promise<void> } | null
let savedArchived: Array<{ grantedHours: number; usedHours: number }>
let forcePlanMissing: boolean
let existingStripeAssignment: (CapturedAssignment & { _id: string }) | null

function installModelMocks(): void {
    createdAssignments = []
    updatedUsers = []
    previousActiveAssignment = null
    savedArchived = []
    forcePlanMissing = false
    existingStripeAssignment = null

    // Plan.findOne({ slug }) → plan del seed (o null si forcePlanMissing o el slug no existe)
    ;(Plan as unknown as { findOne: (q: { slug: string }) => Promise<{ _id: string; slug: string; totalHours: number; timeValue: number | null; timeUnit: string } | null> }).findOne =
        async ({ slug }: { slug: string }) => {
            if (forcePlanMissing) return null
            const found = SEED_PLANS.find((p) => p.slug === slug)
            if (!found) return null
            return { _id: `plan_${slug}`, slug, totalHours: found.totalHours, timeValue: found.timeValue, timeUnit: found.timeUnit }
        }

    // PlanAssignment.findOne(...).sort(...) → asignación activa previa (o null)
    ;(PlanAssignment as unknown as {
        findOne: (query: Record<string, unknown>) => { sort: () => Promise<{ grantedHours: number; usedHours: number; status: string; save: () => Promise<void> } | (CapturedAssignment & { _id: string }) | null> }
    }).findOne = () => ({
        sort: async () => {
            if (existingStripeAssignment) return existingStripeAssignment
            if (!previousActiveAssignment) return null
            return {
                ...previousActiveAssignment,
                save: async () => {
                    savedArchived.push({ grantedHours: previousActiveAssignment!.grantedHours, usedHours: previousActiveAssignment!.usedHours })
                    previousActiveAssignment = null
                },
            }
        },
    })

    // PlanAssignment.create(data) → captura y devuelve el documento con _id
    ;(PlanAssignment as unknown as {
        create: (data: CapturedAssignment) => Promise<CapturedAssignment & { _id: string }>
    }).create = async (data: CapturedAssignment) => {
        createdAssignments.push(data)
        return { _id: `assignment_${createdAssignments.length}`, ...data }
    }

    // User.findByIdAndUpdate(userId, update) → captura la actualización
    ;(User as unknown as {
        findByIdAndUpdate: (userId: string, update: Record<string, unknown>) => Promise<{ _id: string }>
    }).findByIdAndUpdate = async (userId: string, update: Record<string, unknown>) => {
        updatedUsers.push({ userId, update })
        return { _id: userId }
    }
}

beforeEach(() => {
    installModelMocks()
})

test('asigna un plan activo y actualiza al usuario para los 7 paquetes', async () => {
    for (const plan of SEED_PLANS) {
        installModelMocks()
        const assignment = await assignPlanToUser({
            userId: '64b000000000000000000001',
            planSlug: plan.slug,
            source: 'stripe',
            invoiceId: `cs_${plan.slug}`,
        })

        assert.equal(createdAssignments.length, 1, `debe crearse 1 asignación para ${plan.slug}`)
        const created = createdAssignments[0]
        assert.equal(created.planSlug, plan.slug)
        assert.equal(created.status, 'active')
        assert.equal(created.source, 'stripe')
        assert.equal(created.invoiceId, `cs_${plan.slug}`)
        assert.equal(created.remainingHours, Math.max(0, created.grantedHours - created.usedHours))

        // El usuario debe quedar marcado con el plan
        assert.equal(updatedUsers.length, 1, `debe actualizarse el usuario para ${plan.slug}`)
        const { update } = updatedUsers[0]
        assert.equal(update.plan, plan.slug)
        assert.equal(update.hasPlan, true)
        assert.equal(update.planActive, true)
        assert.equal(update.currentPlanSlug, plan.slug)
        assert.equal(update.currentPlanAssignmentId, assignment._id)
    }
})

test('asigna el modo de seguimiento correcto para cada paquete', async () => {
    const EXPECTED_HOURS: Record<string, number> = {
        intro: 1,
        silver: 4,
        gold: 6,
        esmerald: 10,
        diamond: 18,
        no_life: 0,
        challenger: 32,
    }

    for (const plan of SEED_PLANS) {
        installModelMocks()
        await assignPlanToUser({
            userId: '64b000000000000000000001',
            planSlug: plan.slug,
            source: 'stripe',
        })

        const created = createdAssignments[0]
        const expected = EXPECTED_HOURS[plan.slug]
        assert.equal(created.grantedHours, expected, `grantedHours de ${plan.slug} debe ser ${expected}`)
        assert.equal(created.remainingHours, expected, `remainingHours de ${plan.slug} debe ser ${expected}`)
        assert.equal(created.trackingMode, plan.slug === 'no_life' ? 'time' : 'hours')
    }
})

test('no_life no consume horas y vence exactamente un mes después de la compra', async () => {
    installModelMocks()
    const assignedAt = new Date('2026-01-15T12:00:00.000Z')
    await assignPlanToUser({
        userId: '64b000000000000000000001',
        planSlug: 'no_life',
        source: 'stripe',
        assignedAt,
    })

    const created = createdAssignments[0]
    assert.equal(created.grantedHours, 0)
    assert.equal(created.trackingMode, 'time')
    assert.deepEqual(created.expiresAt, new Date('2026-02-15T12:00:00.000Z'))
    assert.deepEqual(calculatePlanExpiresAt(assignedAt, 1, 'months'), new Date('2026-02-15T12:00:00.000Z'))
    assert.deepEqual(
        calculatePlanExpiresAt(new Date('2026-01-31T12:00:00.000Z'), 1, 'months'),
        new Date('2026-02-28T12:00:00.000Z')
    )
})

test('usa las horas por defecto si el plan no existe en la BD (fallback)', async () => {
    // Fallback por plan inexistente: DEFAULT_HOURS_BY_PLAN.challenger = 60
    installModelMocks()
    forcePlanMissing = true
    const assignment = await assignPlanToUser({
        userId: '64b000000000000000000001',
        planSlug: 'challenger',
        source: 'stripe',
    })

    assert.equal(createdAssignments[0].planSlug, 'challenger')
    assert.equal(createdAssignments[0].grantedHours, 60, 'sin plan en BD debe usar DEFAULT_HOURS_BY_PLAN (60)')
    assert.equal(assignment.planSlug, 'challenger')
})

test('acumula horas contratadas al cambiar de plan (carry-over)', async () => {
    installModelMocks()

    // Primera compra: silver (4h) y consume 1h
    previousActiveAssignment = { grantedHours: 4, usedHours: 1, status: 'active', save: async () => {} }
    await assignPlanToUser({ userId: '64b000000000000000000001', planSlug: 'gold', source: 'stripe' })

    // Segunda compra: gold (6h). Total = 4 (previas) + 6 (nuevas) = 10 concedidas, 1 usada → 9 restantes
    const created = createdAssignments[0]
    assert.equal(created.grantedHours, 10, 'grantedHours debe acumular 4 + 6 = 10')
    assert.equal(created.usedHours, 1, 'usedHours debe arrastrarse (1)')
    assert.equal(created.remainingHours, 9, 'remainingHours debe ser 10 - 1 = 9')
})

test('archiva la asignación activa anterior al comprar un nuevo paquete', async () => {
    installModelMocks()

    previousActiveAssignment = { grantedHours: 4, usedHours: 0, status: 'active', save: async () => {} }
    await assignPlanToUser({ userId: '64b000000000000000000001', planSlug: 'diamond', source: 'stripe' })

    assert.equal(savedArchived.length, 1, 'debe archivarse la asignación activa previa')
})

test('no duplica la asignación cuando Stripe reenvía el mismo invoiceId', async () => {
    installModelMocks()
    existingStripeAssignment = { _id: 'assignment_existing', planSlug: 'gold' } as CapturedAssignment & { _id: string }

    const assignment = await assignPlanToUser({
        userId: '64b000000000000000000001',
        planSlug: 'gold',
        source: 'stripe',
        invoiceId: 'cs_same_event',
    })

    assert.equal(assignment._id, 'assignment_existing')
    assert.equal(createdAssignments.length, 0, 'un reintento no debe crear otra asignación')
})
