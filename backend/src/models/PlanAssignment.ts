import mongoose, { Schema, type Document } from 'mongoose'
import type { PlanSlug } from './Plan.js'

export type PlanAssignmentStatus = 'active' | 'archived' | 'expired'
export type PlanAssignmentSource = 'stripe' | 'admin' | 'manual' | 'legacy'

export interface IPlanAssignment extends Document {
    userId: mongoose.Types.ObjectId
    planId?: mongoose.Types.ObjectId | null
    planSlug: PlanSlug
    grantedHours: number
    usedHours: number
    remainingHours: number
    status: PlanAssignmentStatus
    source: PlanAssignmentSource
    notes?: string
    invoiceId?: string | null
    assignedAt: Date
    createdAt: Date
    updatedAt: Date
}

const PlanAssignmentSchema = new Schema<IPlanAssignment>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        planId: {
            type: Schema.Types.ObjectId,
            ref: 'Plan',
            default: null,
        },
        planSlug: {
            type: String,
            required: true,
            lowercase: true,
            enum: ['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger'],
        },
        grantedHours: { type: Number, default: 0 },
        usedHours: { type: Number, default: 0 },
        remainingHours: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['active', 'archived', 'expired'],
            default: 'active',
        },
        source: {
            type: String,
            enum: ['stripe', 'admin', 'manual', 'legacy'],
            default: 'manual',
        },
        notes: { type: String, default: '' },
        invoiceId: { type: String, default: null },
        assignedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
)

export const PlanAssignment = mongoose.model<IPlanAssignment>('PlanAssignment', PlanAssignmentSchema)
