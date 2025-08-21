import type { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import EmailProvider from "next-auth/providers/email"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { createSignInEmailHtml, createSignInEmailText } from "@/lib/emails/authEmail"
import nodemailer from "nodemailer"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" as const },
  providers: [
    EmailProvider({
      maxAge: 24 * 60 * 60,
      server: (() => {
        const isProd = process.env.NODE_ENV === "production"
        const hasSmtpEnv = Boolean(process.env.EMAIL_SERVER_HOST)
        // If running locally without SMTP envs, default to local mail server (e.g., MailHog/Mailpit)
        if (!isProd && !hasSmtpEnv) {
          return {
            host: "127.0.0.1",
            port: 1025,
            secure: false,
            ignoreTLS: true,
          }
        }

        const port = Number(process.env.EMAIL_SERVER_PORT || 587)
        const useSecure = port === 465

        return {
          host: process.env.EMAIL_SERVER_HOST!,
          port,
          auth: (process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD)
            ? {
                user: process.env.EMAIL_SERVER_USER!,
                pass: process.env.EMAIL_SERVER_PASSWORD!,
              }
            : undefined,
          // 465 -> implicit TLS; 587/others -> STARTTLS
          secure: useSecure,
          requireTLS: !useSecure,
          ignoreTLS: false,
        }
      })(),
      from: process.env.EMAIL_FROM || "AdvLink <no-reply@advlink.local>",
      async sendVerificationRequest({ identifier, url, provider }) {
        // Use the same server config above to avoid divergence between envs
        const transport = nodemailer.createTransport(provider.server as any)
        const subject = "Seu link de acesso à AdvLink"
        const html = createSignInEmailHtml({ url })
        const text = createSignInEmailText({ url })
        await transport.sendMail({
          to: identifier,
          from: provider.from as string,
          subject,
          text,
          html,
        })
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
    }),
  ],
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
  },
  secret: process.env.NEXTAUTH_SECRET,
}


