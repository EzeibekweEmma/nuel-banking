import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcrypt";

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password)
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required to seed an administrator.",
    );
  if (password.length < 12)
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  const prisma = new PrismaClient();
  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: UserRole.ADMIN, emailVerifiedAt: new Date() },
    create: {
      email: email.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 12),
      firstName: "System",
      lastName: "Administrator",
      role: UserRole.ADMIN,
      emailVerifiedAt: new Date(),
    },
  });
  await prisma.$disconnect();
}

void main();
