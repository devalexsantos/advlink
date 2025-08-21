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
      server:
        process.env.NODE_ENV === "production"
          ? {
              host: process.env.EMAIL_SERVER_HOST!,
              port: Number(process.env.EMAIL_SERVER_PORT || 587),
              auth: {
                user: process.env.EMAIL_SERVER_USER!,
                pass: process.env.EMAIL_SERVER_PASSWORD!,
              },
              // TLS on 465, STARTTLS on 587/others
              secure: Number(process.env.EMAIL_SERVER_PORT || 587) === 465,
            }
          : {
              host: process.env.EMAIL_SERVER_HOST || "127.0.0.1",
              port: Number(process.env.EMAIL_SERVER_PORT || 1025),
              secure: false,
              ignoreTLS: true,
            },
      from: process.env.EMAIL_FROM || "AdvLink <no-reply@advlink.local>",
      async sendVerificationRequest({ identifier, url, provider }) {
        const transport =
          process.env.NODE_ENV === "production"
            ? nodemailer.createTransport(provider.server as any)
            : nodemailer.createTransport({
                host: (provider.server as any).host || process.env.EMAIL_SERVER_HOST || "127.0.0.1",
                port: (provider.server as any).port || Number(process.env.EMAIL_SERVER_PORT || 1025),
                secure: false,
                ignoreTLS: true,
              })
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


