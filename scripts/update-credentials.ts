import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Update Qaiz: email Qaiz@01 -> Qaiz@04, password d1@qaiz -> d4@qaiz
  const qaizHash = await bcrypt.hash("d4@qaiz", 10);
  const qaiz = await prisma.user.updateMany({
    where: { email: "Qaiz@01" },
    data: { email: "Qaiz@04", passwordHash: qaizHash },
  });
  console.log(`Qaiz updated: ${qaiz.count} row(s)`);

  // Update Divya: email Divya@04 -> Divya@01, password d4@divya -> d1@divya
  const divyaHash = await bcrypt.hash("d1@divya", 10);
  const divya = await prisma.user.updateMany({
    where: { email: "Divya@04" },
    data: { email: "Divya@01", passwordHash: divyaHash },
  });
  console.log(`Divya updated: ${divya.count} row(s)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
