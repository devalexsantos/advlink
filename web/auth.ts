import type { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendLoginEmail } from "@/lib/emails/sendLoginEmail"
import { EMAIL_FROM } from "@/lib/resend"
import { getRequestAttribution } from "@/lib/attribution-server"
import { trackEvent } from "@/lib/product-events"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" as const },
  providers: [
    EmailProvider({
      maxAge: 24 * 60 * 60,
      // No SMTP `server` needed: next-auth's default is unused because sendVerificationRequest is custom.
      // Delivery: Resend in production, Mailpit in dev (see lib/emails/sendLoginEmail.ts).
      from: EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        await sendLoginEmail({ to: identifier, url })
      },
    }),
    Credentials({
      name: "Email e Senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({ where: { email: credentials.email } })
        if (!user || !user.passwordHash) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, image: user.image ?? undefined }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  events: {
    async createUser({ user }) {
      const attribution = await getRequestAttribution()
      trackEvent("user_signed_up", { userId: user.id, meta: { email: user.email, ...(attribution ? { attribution } : {}) } }).catch(() => {})
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as any).userId = (user as any).id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token as any).userId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    // Expired magic links etc. land on our pt-BR login page instead of NextAuth's English one
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
}


