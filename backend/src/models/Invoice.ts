import mongoose, { Schema, type Document } from 'mongoose'

export interface IInvoice extends Document {
    userId: mongoose.Types.ObjectId
    stripeSessionId: string
    plan: 'intro' | 'silver' | 'esmerald' | 'diamond' | 'challenger'
    planLabel: string
    description: string
    amount: number
    currency: string
    status: 'Pagado' | 'Pendiente' | 'Procesando'
    createdAt: Date
    updatedAt: Date
}

const InvoiceSchema = new Schema<IInvoice>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        stripeSessionId: { type: String, required: true, unique: true },
        plan: {
            type: String,
            enum: ['intro', 'silver', 'esmerald', 'diamond', 'challenger'],
            required: true,
        },
        planLabel: { type: String, required: true },
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        status: {
            type: String,
            enum: ['Pagado', 'Pendiente', 'Procesando'],
            default: 'Pagado',
        },
    },
    { timestamps: true }
)

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema)
