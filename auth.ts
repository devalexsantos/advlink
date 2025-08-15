import type { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" as const },
  providers: [
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


