import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'

class GoogleProviderError extends CredentialsSignin {
    code = 'google_provider'
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                try {
                    const res = await fetch(
                        `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/auth/login`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: credentials.email,
                                password: credentials.password,
                            }),
                        }
                    )

                    if (!res.ok) {
                        const errData = await res.json() as { message?: string; code?: string }
                        if (errData.code === 'google_provider') throw new GoogleProviderError()
                        return null
                    }

                    const data = await res.json() as { user?: { id: string; email: string; name?: string; plan?: string; role?: string }; token?: string }
                    if (!data.user) return null

                    return {
                        id: data.user.id,
                        email: data.user.email,
                        name: data.user.name ?? data.user.email,
                        plan: data.user.plan,
                        role: data.user.role,
                        accessToken: data.token,
                    }
                } catch (err) {
                    if (err instanceof GoogleProviderError) throw err
                    return null
                }
            },
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                const url = `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/auth/register-google`
                try {
                    // Registrar o recuperar el usuario de Google (upsert, sin verificación de correo)
                    const res = await fetch(
                        url,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: user.email, name: user.name }),
                        }
                    )
                    if (!res.ok) {
                        const body = await res.text()
                        console.error(`[AUTH][GOOGLE] register-google respondió ${res.status}: ${body} (email=${user.email}, name=${user.name}, url=${url})`)
                        return false
                    }
                    const data = await res.json() as { user?: { id: string; plan?: string; role?: string }; token?: string }
                    if (data.user) {
                        ; (user as Record<string, unknown>).plan = data.user.plan
                            ; (user as Record<string, unknown>).role = data.user.role
                            ; (user as Record<string, unknown>).accessToken = data.token
                            ; (user as Record<string, unknown>).dbId = data.user.id
                    }
                    return true
                } catch (err) {
                    console.error(`[AUTH][GOOGLE] Error de red llamando a ${url}:`, err)
                    return false
                }
            }
            return true
        },
        async jwt({ token, user }) {
            if (user) {
                token.plan = (user as { plan?: string }).plan
                token.role = (user as { role?: string }).role
                token.accessToken = (user as { accessToken?: string }).accessToken
                if ((user as { dbId?: string }).dbId) {
                    token.sub = (user as { dbId?: string }).dbId
                }
            }
            return token
        },
        async session({ session, token }) {
            if (token) {
                if (token.sub) session.user.id = token.sub
                    ; (session.user as { plan?: unknown }).plan = token.plan
                    ; (session.user as { role?: unknown }).role = token.role
                    ; (session as { accessToken?: unknown }).accessToken = token.accessToken
            }
            return session
        },
    },
    pages: {
        signIn: '/login',
    },
    secret: process.env.NEXTAUTH_SECRET,
})
