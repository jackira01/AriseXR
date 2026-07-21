import mongoose, { Schema, type Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUserSession {
    date: string
    hours: number
    topic: string
    notes?: string
    addedAt: Date
}

export interface IInvoice {
    invoiceId: string
    date: string
    description: string
    amount: number
    currency: string
    status: 'Pagado' | 'Pendiente' | 'Procesando'
}

export interface ITarea {
    _id?: string
    titulo: string
    texto: string
    fechaCreacion: Date
    estado: 'pendiente' | 'completada'
}

export interface ITool {
    name: string
    topicId: string
    active: boolean
    addedAt: Date
}

export interface IUser extends Document {
    name: string
    email: string
    password?: string
    provider: 'credentials' | 'google'
    emailVerified: boolean
    verificationCode?: string | null
    verificationCodeExpires?: Date | null
    role: 'user' | 'admin'
    plan: 'intro' | 'silver' | 'gold' | 'esmerald' | 'diamond' | 'no_life' | 'challenger' | null
    hasPlan: boolean
    planActive: boolean
    additionalHours: number
    sessions: IUserSession[]
    topics: {
        name: string
        categoryName?: string
        status: 'pendiente' | 'en-progreso' | 'completado'
    }[]
    tools: ITool[]
    invoices: IInvoice[]
    tareas: ITarea[]
    createdAt: Date
    comparePassword(candidate: string): Promise<boolean>
}

const SessionSchema = new Schema({
    date: { type: String, required: true },
    hours: { type: Number, required: true, min: 0.5 },
    topic: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    addedAt: { type: Date, default: Date.now },
})

const TopicSchema = new Schema({
    name: { type: String, required: true },
    categoryName: { type: String },
    status: {
        type: String,
        enum: ['pendiente', 'en-progreso', 'completado'],
        default: 'pendiente',
    },
})

const InvoiceSchema = new Schema({
    invoiceId: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    status: {
        type: String,
        enum: ['Pagado', 'Pendiente', 'Procesando'],
        default: 'Pendiente',
    },
})

const TareaSchema = new Schema({
    titulo: { type: String, required: true, trim: true, maxlength: 300 },
    texto: { type: String, default: '', trim: true, maxlength: 300 },
    fechaCreacion: { type: Date, default: Date.now },
    estado: {
        type: String,
        enum: ['pendiente', 'completada'],
        default: 'pendiente',
    },
})

const ToolSchema = new Schema({
    name: { type: String, required: true, trim: true },
    topicId: { type: String, required: true },
    active: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now },
})

const UserSchema = new Schema<IUser>(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: { type: String, minlength: 6 },
        provider: {
            type: String,
            enum: ['credentials', 'google'],
            default: 'credentials',
        },
        emailVerified: { type: Boolean, default: false },
        verificationCode: { type: String, default: null },
        verificationCodeExpires: { type: Date, default: null },
        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },
        plan: {
            type: String,
            enum: ['intro', 'silver', 'gold', 'esmerald', 'diamond', 'no_life', 'challenger', null],
            default: null,
        },
        hasPlan: { type: Boolean, default: false },
        planActive: { type: Boolean, default: false },
        topics: { type: [TopicSchema], default: [] },
        additionalHours: { type: Number, default: 0 },
        sessions: { type: [SessionSchema], default: [] },
        invoices: { type: [InvoiceSchema], default: [] },
        tareas: { type: [TareaSchema], default: [] },
        tools: { type: [ToolSchema], default: [] },
    },
    { timestamps: true }
)

// Hash password before save
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next()
    const salt = await bcrypt.genSalt(12)
    this.password = await bcrypt.hash(this.password, salt)
    next()
})

UserSchema.methods.comparePassword = async function (
    candidate: string
): Promise<boolean> {
    if (!this.password) return false
    return bcrypt.compare(candidate, this.password as string)
}

export const User = mongoose.model<IUser>('User', UserSchema)
