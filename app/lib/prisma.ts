import { PrismaClient } from "../../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function criarClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

const prisma = global.prisma ?? criarClient();

if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export { prisma };
