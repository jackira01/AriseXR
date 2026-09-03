import { User } from '../models/User.js'
import { Plan, type PlanSlug } from '../models/Plan.js'
import { PlanAssignment, type PlanAssignmentSource, type PlanAssignmentStatus } from '../models/PlanAssignment.js'

const DEFAULT_HOURS_BY_PLAN: Record<PlanSlug, number> = {
    intro: 2,
    silver: 4,
    gold: 8,
    esmerald: 12,
    diamond: 20,
    no_life: 40,
    challenger: 60,
}

const TIME_BASED_PLAN_SLUGS: PlanSlug[] = ['no_life']

export function calculatePlanExpiresAt(
    assignedAt: Date,
    timeValue?: number | null,
    timeUnit?: 'hours' | 'days' | 'months' | null
): Date | null {
    if (!timeValue || !timeUnit || timeUnit === 'hours') return null

    const expiresAt = new Date(assignedAt)
    if (timeUnit === 'months') {
        // Evita que fechas como 31 de enero salten a marzo por overflow del calendario.
        const originalDay = expiresAt.getDate()
        expiresAt.setDate(1)
        expiresAt.setMonth(expiresAt.getMonth() + timeValue)
        const lastDayOfMonth = new Date(expiresAt.getFullYear(), expiresAt.getMonth() + 1, 0).getDate()
        expiresAt.setDate(Math.min(originalDay, lastDayOfMonth))
    }
    if (timeUnit === 'days') expiresAt.setDate(expiresAt.getDate() + timeValue)
    return expiresAt
}

export async function getCurrentActiveAssignment(userId: string) {
    const assignment = await PlanAssignment.findOne({ userId, status: 'active' }).sort({ assignedAt: -1 })
    if (!assignment) return null

    // Normaliza asignaciones antiguas de no_life creadas antes del seguimiento por calendario.
    if (assignment.planSlug === 'no_life' && (assignment.trackingMode !== 'time' || !assignment.expiresAt)) {
        assignment.trackingMode = 'time'
        assignment.grantedHours = 0
        assignment.usedHours = 0
        assignment.remainingHours = 0
        assignment.expiresAt = calculatePlanExpiresAt(assignment.assignedAt, 1, 'months')
        await assignment.save()
    }

    if (assignment.expiresAt && assignment.expiresAt <= new Date()) {
        assignment.status = 'expired'
        await assignment.save()
        await User.findByIdAndUpdate(userId, {
            plan: null,
            hasPlan: false,
            planActive: false,
            currentPlanSlug: null,
            currentPlanAssignmentId: null,
        })
        return null
    }

    return assignment
}

export async function assignPlanToUser({
    userId,
    planSlug,
    source = 'manual',
    grantedHours,
    notes,
    invoiceId,
    status = 'active',
    assignedAt,
}: {
    userId: string
    planSlug: PlanSlug
    source?: PlanAssignmentSource
    grantedHours?: number
    notes?: string
    invoiceId?: string
    status?: PlanAssignmentStatus
    assignedAt?: Date
}) {
    const normalizedPlanSlug = planSlug.toLowerCase() as PlanSlug
    const plan = await Plan.findOne({ slug: normalizedPlanSlug })
    const trackingMode = plan?.timeUnit && plan.timeUnit !== 'hours' || TIME_BASED_PLAN_SLUGS.includes(normalizedPlanSlug)
        ? 'time'
        : 'hours'
    const configuredHours = plan?.totalHours ?? 0
    const effectiveHours = trackingMode === 'time'
        ? 0
        : grantedHours ?? (configuredHours > 0 ? configuredHours : DEFAULT_HOURS_BY_PLAN[normalizedPlanSlug]) ?? 0

    const assignmentStart = assignedAt ?? new Date()
    const expiresAt = calculatePlanExpiresAt(assignmentStart, plan?.timeValue, plan?.timeUnit)

    if (invoiceId) {
        const existingStripeAssignment = await PlanAssignment.findOne({ userId, invoiceId, source: 'stripe' }).sort({ assignedAt: -1 })
        if (existingStripeAssignment) return existingStripeAssignment
    }

    const previousActiveAssignment = await PlanAssignment.findOne({ userId, status: 'active' }).sort({ assignedAt: -1 })
    let carriedOverGrantedHours = 0
    let carriedOverUsedHours = 0

    if (previousActiveAssignment) {
        // Se acumulan las horas contratadas (no solo las restantes) para que,
        // al restar las horas usadas que se arrastran, las restantes resulten
        // en: restantes_anteriores + horas_del_nuevo_plan
        if (trackingMode === 'hours' && previousActiveAssignment.trackingMode !== 'time') {
            carriedOverGrantedHours = Math.max(0, previousActiveAssignment.grantedHours)
            carriedOverUsedHours = previousActiveAssignment.usedHours
        }
        previousActiveAssignment.status = 'archived'
        await previousActiveAssignment.save()
    }

    const totalGrantedHours = effectiveHours + carriedOverGrantedHours

    const assignment = await PlanAssignment.create({
        userId,
        planId: plan?._id ?? null,
        planSlug: normalizedPlanSlug,
        grantedHours: totalGrantedHours,
        usedHours: carriedOverUsedHours,
        remainingHours: Math.max(0, totalGrantedHours - carriedOverUsedHours),
        status,
        source,
        trackingMode,
        notes: notes ?? '',
        invoiceId: invoiceId ?? null,
        assignedAt: assignmentStart,
        expiresAt,
    })

    await User.findByIdAndUpdate(userId, {
        plan: normalizedPlanSlug,
        hasPlan: true,
        planActive: status === 'active',
        currentPlanSlug: normalizedPlanSlug,
        currentPlanAssignmentId: assignment._id,
    })

    return assignment
}

export async function updateAssignment({
    assignmentId,
    userId,
    grantedHours,
    notes,
    status,
}: {
    assignmentId: string
    userId: string
    grantedHours?: number
    notes?: string
    status?: PlanAssignmentStatus
}) {
    const assignment = await PlanAssignment.findOne({ _id: assignmentId, userId })
    if (!assignment) throw new Error('Asignación no encontrada')

    if (grantedHours !== undefined) {
        assignment.grantedHours = grantedHours
        assignment.remainingHours = Math.max(0, grantedHours - assignment.usedHours)
    }
    if (notes !== undefined) assignment.notes = notes
    if (status !== undefined) assignment.status = status

    await assignment.save()
    return assignment
}

export async function adjustAssignmentHours({
    assignmentId,
    userId,
    grantedHoursDelta,
    usedHoursDelta,
}: {
    assignmentId: string
    userId: string
    grantedHoursDelta?: number
    usedHoursDelta?: number
}) {
    const assignment = await PlanAssignment.findOne({ _id: assignmentId, userId })
    if (!assignment) throw new Error('Asignación no encontrada')

    if (grantedHoursDelta !== undefined) {
        assignment.grantedHours = Math.max(0, assignment.grantedHours + grantedHoursDelta)
    }
    if (usedHoursDelta !== undefined) {
        assignment.usedHours = Math.max(0, assignment.usedHours + usedHoursDelta)
    }
    assignment.remainingHours = Math.max(0, assignment.grantedHours - assignment.usedHours)

    await assignment.save()
    return assignment
}
