/**
 * Cria equipes para a crcom com membros que casam com os
 * nomeColaborador importados do Operand (Celso, GLEISON, Usuario 2).
 * Execute: npm run db:seed-crcom-equipes
 */

import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("━━━ SEED CRCOM — EQUIPES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 1. Encontra crcom
  const crcom = await prisma.empresa.findFirst({ where: { slug: "crcom" } });
  if (!crcom) throw new Error("crcom não encontrada. Rode setup-usuarios.ts primeiro.");
  console.log(`✔ crcom encontrada: ${crcom.id}`);

  // 2. Celso já existe
  const celso = await prisma.usuario.findUnique({ where: { email: "celso@crcom.com" } });
  if (!celso) throw new Error("celso@crcom.com não encontrado. Rode setup-usuarios.ts primeiro.");
  console.log(`✔ Celso (${celso.id}) encontrado`);

  // 3. Cria (ou reutiliza) colaboradores cujos nomes coincidem com o
  //    nomeColaborador do Operand.  slugNome("GLEISON") = "gleison" e
  //    slugNome("GLEISON") = "gleison" — match garantido.
  const senhaHash = await bcrypt.hash("123456", 10);

  const gleison = await prisma.usuario.upsert({
    where: { email: "gleison@crcom.demo" },
    update: { nome: "GLEISON" },
    create: {
      nome: "GLEISON",
      email: "gleison@crcom.demo",
      senhaHash,
      papel: "AGENCY_MANAGER",
      status: "ativo",
      empresaId: crcom.id,
    },
  });
  console.log(`✔ Usuário GLEISON (${gleison.id})`);

  const usuario2 = await prisma.usuario.upsert({
    where: { email: "usuario2@crcom.demo" },
    update: { nome: "Usuario 2" },
    create: {
      nome: "Usuario 2",
      email: "usuario2@crcom.demo",
      senhaHash,
      papel: "COLLABORATOR",
      status: "ativo",
      empresaId: crcom.id,
    },
  });
  console.log(`✔ Usuário "Usuario 2" (${usuario2.id})`);

  // 4. Remove equipes antigas da crcom para evitar duplicatas
  await prisma.equipeMembro.deleteMany({ where: { equipe: { empresaId: crcom.id } } });
  await prisma.equipe.deleteMany({ where: { empresaId: crcom.id } });
  console.log("✔ Equipes anteriores removidas");

  // 5. Cria equipes
  const diretoria = await prisma.equipe.create({
    data: {
      empresaId: crcom.id,
      nome: "Diretoria e Atendimento",
      gestorId: celso.id,
      status: "ativa",
      membros: {
        create: [
          { usuarioId: celso.id,   funcao: "Diretor de Atendimento", capacidadeSemanal: 40 },
          { usuarioId: gleison.id, funcao: "Diretor Criativo",        capacidadeSemanal: 40 },
        ],
      },
    },
  });

  const criacao = await prisma.equipe.create({
    data: {
      empresaId: crcom.id,
      nome: "Criação e Performance",
      gestorId: gleison.id,
      status: "ativa",
      membros: {
        create: [
          { usuarioId: usuario2.id, funcao: "Produtor", capacidadeSemanal: 40 },
        ],
      },
    },
  });

  // 6. Resumo
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Equipes crcom configuradas!\n");
  console.log(`  ┌ ${diretoria.nome}`);
  console.log(`  │   Celso          (celso@crcom.com)     40h/sem`);
  console.log(`  │   GLEISON        (gleison@crcom.demo)  40h/sem`);
  console.log(`  ├ ${criacao.nome}`);
  console.log(`  │   Usuario 2      (usuario2@crcom.demo) 40h/sem`);
  console.log("\n  Horas por colaborador serão puxadas dos apontamentos");
  console.log("  importados do Operand (nomeColaborador match por slug).");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
