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

export async function assignPlanToUser({
    userId,
    planSlug,
    source = 'manual',
    grantedHours,
    notes,
    invoiceId,
    status = 'active',
}: {
    userId: string
    planSlug: PlanSlug
    source?: PlanAssignmentSource
    grantedHours?: number
    notes?: string
    invoiceId?: string
    status?: PlanAssignmentStatus
}) {
    const normalizedPlanSlug = planSlug.toLowerCase() as PlanSlug
    const plan = await Plan.findOne({ slug: normalizedPlanSlug })
    const effectiveHours = grantedHours ?? plan?.totalHours ?? DEFAULT_HOURS_BY_PLAN[normalizedPlanSlug] ?? 0

    const previousActiveAssignment = await PlanAssignment.findOne({ userId, status: 'active' }).sort({ assignedAt: -1 })
    if (previousActiveAssignment) {
        previousActiveAssignment.status = 'archived'
        await previousActiveAssignment.save()
    }

    const assignment = await PlanAssignment.create({
        userId,
        planId: plan?._id ?? null,
        planSlug: normalizedPlanSlug,
        grantedHours: effectiveHours,
        usedHours: 0,
        remainingHours: effectiveHours,
        status,
        source,
        notes: notes ?? '',
        invoiceId: invoiceId ?? null,
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
