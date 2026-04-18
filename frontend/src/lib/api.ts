// Admin API functions for interacting with the backend

export interface AdminUserSummary {
    _id: string
    name: string
    email: string
    plan?: string | null
    role?: string
    additionalHours?: number
    sessions?: UserSession[]
}

export interface UserSession {
    _id?: string
    date: string
    hours: number
    topic: string
    notes?: string
    addedAt?: string
}

export interface ITarea {
    _id?: string
    titulo: string
    texto: string
    fechaCreacion: string
    estado: 'pendiente' | 'completada'
}

export interface UserProfile extends AdminUserSummary {
    role?: 'user' | 'admin'
    plan?: 'silver' | 'esmerald' | 'diamond' | 'challenger' | null
    additionalHours?: number
    sessions?: UserSession[]
    topics?: Array<{
        _id?: string
        name: string
        categoryName?: string
        status: 'pendiente' | 'en-progreso' | 'completado'
    }>
    createdAt?: string
    updatedAt?: string
    tareas?: ITarea[]
}

const API_BASE = '/api'

/**
 * Search admin users by name or email
 */
export async function adminSearchUsers(
    token: string,
    query: string
): Promise<AdminUserSummary[]> {
    try {
        const params = new URLSearchParams()
        if (query) params.append('q', query)

        const response = await fetch(`${API_BASE}/admin/users?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to search users: ${response.statusText}`)
        }

        const data = await response.json()
        return Array.isArray(data) ? data : []
    } catch (error) {
        console.error('Error searching users:', error)
        throw error
    }
}

/**
 * Get a user's full profile
 */
export async function adminGetUserProfile(
    token: string,
    userId: string
): Promise<UserProfile> {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to get user profile: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error getting user profile:', error)
        throw error
    }
}

/**
 * Get current user profile
 */
export async function getUserProfile(token: string): Promise<UserProfile & { hasPlan?: boolean, planActive?: boolean, invoices?: any[] }> {
    try {
        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to get current user profile: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error getting current user profile:', error)
        throw error
    }
}

/**
 * Get user sessions
 */
export async function adminGetUserSessions(
    token: string,
    userId: string
): Promise<any[]> {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/sessions`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to get user sessions: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error getting user sessions:', error)
        throw error
    }
}

/**
 * Get user invoices
 */
export async function adminGetUserInvoices(
    token: string,
    userId: string
): Promise<any[]> {
    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}/invoices`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })

        if (!response.ok) {
            throw new Error(`Failed to get user invoices: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error getting user invoices:', error)
        throw error
    }
}

/**
 * Update user topic status
 */
export async function adminUpdateUserTopic(
    token: string,
    userId: string,
    topicName: string,
    status: 'pendiente' | 'en-progreso' | 'completado'
): Promise<any> {
    try {
        const response = await fetch(
            `${API_BASE}/admin/users/${userId}/topics/${topicName}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status }),
            }
        )

        if (!response.ok) {
            throw new Error(`Failed to update topic: ${response.statusText}`)
        }

        return await response.json()
    } catch (error) {
        console.error('Error updating user topic:', error)
        throw error
    }
}

/**
 * Admin: agregar sesión (completar horas) a un usuario
 */
export async function adminAddSession(
    token: string,
    userId: string,
    payload: { hours: number; topic: string; notes?: string; date?: string }
): Promise<{ sessions: UserSession[]; completedHours: number }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

/**
 * Admin: incrementar horas base de un usuario
 */
export async function adminAddBaseHours(
    token: string,
    userId: string,
    additionalHours: number
): Promise<{ additionalHours: number }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ additionalHours }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

/**
 * Admin: editar una sesión existente
 */
export async function adminUpdateSession(
    token: string,
    userId: string,
    sessionId: string,
    payload: { hours?: number; topic?: string; notes?: string; date?: string }
): Promise<{ sessions: UserSession[]; completedHours: number }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

/**
 * Admin: eliminar una sesión
 */
export async function adminDeleteSession(
    token: string,
    userId: string,
    sessionId: string
): Promise<{ sessions: UserSession[]; completedHours: number }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

// ── Topics catalog ────────────────────────────────────────────────────────────

export interface CatalogTopic {
    _id: string
    name: string
    categoryId: string
}

export interface CatalogCategory {
    _id: string
    name: string
    topics: CatalogTopic[]
}

export async function getTopicsCatalog(token: string): Promise<CatalogCategory[]> {
    const response = await fetch(`${API_BASE}/topics/categories`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    return response.json()
}

export async function adminCreateCategory(token: string, name: string): Promise<CatalogCategory> {
    const response = await fetch(`${API_BASE}/topics/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminUpdateCategory(token: string, id: string, name: string): Promise<CatalogCategory> {
    const response = await fetch(`${API_BASE}/topics/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminDeleteCategory(token: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/topics/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
}

export async function adminCreateTopic(token: string, name: string, categoryId: string): Promise<CatalogTopic> {
    const response = await fetch(`${API_BASE}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, categoryId }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminUpdateTopic(token: string, id: string, payload: { name?: string; categoryId?: string }): Promise<CatalogTopic> {
    const response = await fetch(`${API_BASE}/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminDeleteTopic(token: string, id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/topics/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
}

export async function adminUpdateUserTopicStatus(
    token: string,
    userId: string,
    topicId: string,
    status: 'pendiente' | 'en-progreso' | 'completado'
): Promise<{ topics: UserProfile['topics'] }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/topic-status/${topicId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminUpsertTopicStatus(
    token: string,
    userId: string,
    name: string,
    categoryName: string,
    status: 'pendiente' | 'en-progreso' | 'completado'
): Promise<{ topics: UserProfile['topics'] }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/topic-status/by-name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, categoryName, status }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminAddTopicToUser(
    token: string,
    userId: string,
    topicId: string
): Promise<{ topics: UserProfile['topics'] }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topicId }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

// ── Tareas ────────────────────────────────────────────────────────────────────

export async function adminCreateTarea(
    token: string,
    userId: string,
    payload: { titulo: string; texto?: string }
): Promise<{ tareas: ITarea[] }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminUpdateTarea(
    token: string,
    userId: string,
    tareaId: string,
    payload: { titulo?: string; texto?: string; estado?: 'pendiente' | 'completada' }
): Promise<{ tareas: ITarea[] }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/tareas/${tareaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function adminDeleteTarea(
    token: string,
    userId: string,
    tareaId: string
): Promise<{ tareas: ITarea[] }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/tareas/${tareaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function updateMiTarea(
    token: string,
    tareaId: string,
    estado: 'pendiente' | 'completada'
): Promise<{ tareas: ITarea[] }> {
    const response = await fetch(`${API_BASE}/users/me/tareas/${tareaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export interface ChatMessage {
    _id: string
    roomUserId: string
    senderRole: 'user' | 'admin'
    text: string
    createdAt: string
}

export interface ChatHistoryPage {
    messages: ChatMessage[]
    page: number
    hasNextPage: boolean
    nextPage: number | null
}

export async function fetchChatHistory(
    token: string,
    userId: string,
    page: number
): Promise<ChatHistoryPage> {
    const response = await fetch(`${API_BASE}/chat/${userId}/messages?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

export async function createCheckoutSession(
    token: string,
    userId: string,
    email: string,
    priceId: string
): Promise<string> {
    const response = await fetch(`${API_BASE}/payments/create-checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, email, priceId }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Error ${response.status}`)
    }
    const data = await response.json() as { url: string }
    return data.url
}

export interface InvoiceRecord {
    _id: string
    stripeSessionId: string
    plan: string
    planLabel: string
    description: string
    amount: number
    currency: string
    status: 'Pagado' | 'Pendiente' | 'Procesando'
    createdAt: string
}

export async function getUserInvoices(token: string): Promise<InvoiceRecord[]> {
    const response = await fetch(`${API_BASE}/payments/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) throw new Error(`Error ${response.status}`)
    return response.json()
}

export type PlanSlug = 'silver' | 'esmerald' | 'diamond' | 'challenger' | null

export async function adminAssignPlan(
    token: string,
    userId: string,
    plan: PlanSlug
): Promise<{ plan: PlanSlug; hasPlan: boolean; planActive: boolean }> {
    const response = await fetch(`${API_BASE}/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
    })
    if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { message?: string }
        throw new Error(err.message ?? `Error ${response.status}`)
    }
    return response.json()
}

