import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@example.com"
  const passwordHash = await bcrypt.hash("admin", 10)

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      passwordHash,
      role: "super_admin",
      isActive: true,
    },
  })

  console.log(`Admin criado: ${admin.email} (${admin.role})`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
