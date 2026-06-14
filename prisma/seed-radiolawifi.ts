import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existente = await prisma.empresa.findFirst({ where: { slug: "radiolawifi" } });
  if (existente) {
    console.log("Agência radiolawifi já existe. Pulando.");
    return;
  }

  const empresa = await prisma.empresa.create({
    data: {
      nome: "radiolawifi",
      nomeFantasia: "Rádio La Wifi",
      slug: "radiolawifi",
      tipo: "AGENCIA",
      status: "ativo",
    },
  });
  console.log("Empresa criada:", empresa.id);

  const senhaHash = await bcrypt.hash("123456", 10);
  const usuario = await prisma.usuario.create({
    data: {
      nome: "Gleison Radiola",
      email: "gleison@radiolawifi.com",
      senhaHash,
      status: "ativo",
      papel: "AGENCY_CEO",
      empresaId: empresa.id,
    },
  });
  console.log("Usuário criado:", usuario.email, "| papel:", usuario.papel);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
