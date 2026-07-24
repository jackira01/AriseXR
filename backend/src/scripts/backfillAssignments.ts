import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { PlanAssignment } from '../models/PlanAssignment.js'
import { assignPlanToUser } from '../lib/planLifecycle.js'
import type { PlanSlug } from '../models/Plan.js'

const VALID_SLUGS: PlanSlug[] = ['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger']

async function backfillAssignments() {
    const uri = process.env.MONGODB_URI
    if (!uri) {
        console.error('MONGODB_URI no definida en .env')
        process.exit(1)
    }

    await mongoose.connect(uri)
    console.log('Conectado a MongoDB')

    const usersWithPlan = await User.find({
        plan: { $in: VALID_SLUGS },
        $or: [
            { currentPlanAssignmentId: { $exists: false } },
            { currentPlanAssignmentId: null },
        ],
    }).lean()

    console.log(`\nUsuarios con plan pero sin asignacion: ${usersWithPlan.length}`)

    let created = 0
    let skipped = 0

    for (const user of usersWithPlan) {
        const slug = user.plan as PlanSlug

        const existingAssignment = await PlanAssignment.findOne({
            userId: user._id,
            planSlug: slug,
            status: 'active',
        })

        if (existingAssignment) {
            await User.findByIdAndUpdate(user._id, {
                currentPlanSlug: slug,
                currentPlanAssignmentId: existingAssignment._id,
            })
            skipped++
            continue
        }

        const completedHours = (user.sessions ?? []).reduce((acc: number, s: any) => acc + (s.hours ?? 0), 0)

        const assignment = await assignPlanToUser({
            userId: user._id.toString(),
            planSlug: slug,
            source: 'legacy',
            notes: `Backfill automatico. Horas completadas previas: ${completedHours}`,
        })

        if (completedHours > 0) {
            assignment.usedHours = completedHours
            assignment.remainingHours = Math.max(0, assignment.grantedHours - completedHours)
            await assignment.save()
        }

        created++
        console.log(`  [${created}] ${user.name} (${user.email}) -> ${slug} (${assignment.grantedHours}h, ${completedHours}h usadas)`)
    }

    console.log(`\nBackfill completado: ${created} asignaciones creadas, ${skipped} ya existian`)

    await mongoose.disconnect()
    console.log('Desconectado de MongoDB')
}

backfillAssignments().catch((err) => {
    console.error('Error en backfill:', err)
    process.exit(1)
})
