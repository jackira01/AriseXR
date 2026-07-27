import mongoose, { Schema, type Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IPendingRegistration extends Document {
    name: string
    email: string
    password: string
    code: string
    expires: Date
    createdAt: Date
}

const PendingRegistrationSchema = new Schema<IPendingRegistration>(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: { type: String, required: true },
        code: { type: String, required: true },
        expires: { type: Date, required: true },
    },
    { timestamps: true }
)

// Auto-eliminar registros pendientes cuando el código expira
PendingRegistrationSchema.index({ expires: 1 }, { expireAfterSeconds: 0 })

// Hash password before save (mismo patrón que el modelo User)
PendingRegistrationSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next()
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
})

export const PendingRegistration = mongoose.model<IPendingRegistration>(
    'PendingRegistration',
    PendingRegistrationSchema
)
