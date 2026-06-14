/**
 * Alinha contas e relacionamentos usados na apresentacao do Headstock.
 * Execute: npm run db:prepare-apresentacao
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const [headstock, crcom, radiola, fcm, cholet] = await Promise.all([
    prisma.empresa.findFirst({
      where: { slug: { in: ["headstock", "agencia-piloto-headstock"] } },
    }),
    prisma.empresa.findFirst({ where: { slug: "crcom" } }),
    prisma.empresa.findFirst({ where: { slug: "radiolawifi" } }),
    prisma.empresa.findFirst({ where: { slug: "fcm" } }),
    prisma.empresa.findFirst({ where: { slug: "cholet" } }),
  ]);

  if (!headstock || !crcom || !radiola || !fcm || !cholet) {
    throw new Error("Empresas da apresentacao nao estao completas no banco.");
  }

  const senha123456 = await bcrypt.hash("123456", 10);
  const senha12346 = await bcrypt.hash("12346", 10);

  await prisma.empresa.update({
    where: { id: headstock.id },
    data: {
      nome: "Headstock",
      nomeFantasia: "Headstock",
      slug: "headstock",
      status: "ativo",
    },
  });

  await prisma.usuario.update({
    where: { email: "gleison@headstock.com" },
    data: {
      nome: "Gleison Monteiro",
      papel: "MASTER_PLATFORM",
      senhaHash: senha123456,
      status: "ativo",
      empresaId: headstock.id,
    },
  });

  await prisma.usuario.update({
    where: { email: "celso@crcom.com" },
    data: { papel: "AGENCY_CEO", senhaHash: senha123456, status: "ativo" },
  });
  await prisma.usuario.update({
    where: { email: "gleison@radiolawifi.com" },
    data: { papel: "AGENCY_CEO", senhaHash: senha123456, status: "ativo" },
  });
  await prisma.usuario.update({
    where: { email: "raphael@fcm.com" },
    data: { papel: "COMPANY_OWNER", senhaHash: senha123456, status: "ativo" },
  });

  const zacPrincipal = await prisma.usuario.upsert({
    where: { email: "zac@cholet.com" },
    update: {
      nome: "Zac",
      papel: "COMPANY_OWNER",
      senhaHash: senha123456,
      status: "ativo",
      empresaId: cholet.id,
    },
    create: {
      nome: "Zac",
      email: "zac@cholet.com",
      papel: "COMPANY_OWNER",
      senhaHash: senha123456,
      status: "ativo",
      empresaId: cholet.id,
    },
  });

  const zacDuplicado = await prisma.usuario.findUnique({
    where: { email: "zac@cholet.com.br" },
  });
  if (zacDuplicado) {
    await prisma.$transaction([
      prisma.ordemProducao.updateMany({
        where: { criadoPorId: zacDuplicado.id },
        data: { criadoPorId: zacPrincipal.id },
      }),
      prisma.movimentacaoOP.updateMany({
        where: { usuarioId: zacDuplicado.id },
        data: { usuarioId: zacPrincipal.id },
      }),
      prisma.usuario.delete({ where: { id: zacDuplicado.id } }),
    ]);
  }

  await prisma.usuario.upsert({
    where: { email: "funcionario@fcm.com" },
    update: {
      nome: "Operador FCM",
      papel: "DATA_OPERATOR",
      senhaHash: senha12346,
      status: "ativo",
      empresaId: fcm.id,
    },
    create: {
      nome: "Operador FCM",
      email: "funcionario@fcm.com",
      papel: "DATA_OPERATOR",
      senhaHash: senha12346,
      status: "ativo",
      empresaId: fcm.id,
    },
  });

  await prisma.relacionamentoGestao.deleteMany({
    where: { agenciaId: crcom.id, empresaClienteId: fcm.id },
  });
  await prisma.clienteAgencia.deleteMany({
    where: { agenciaId: crcom.id, empresaConectadaId: fcm.id },
  });

  const clienteCholet = await prisma.clienteAgencia.findFirst({
    where: {
      agenciaId: radiola.id,
      OR: [{ empresaConectadaId: cholet.id }, { nome: "Cholet Moda" }],
    },
  });

  if (clienteCholet) {
    await prisma.clienteAgencia.update({
      where: { id: clienteCholet.id },
      data: {
        nome: "Cholet Moda",
        empresaConectadaId: cholet.id,
        status: "ativo",
      },
    });
  } else {
    await prisma.clienteAgencia.create({
      data: {
        agenciaId: radiola.id,
        empresaConectadaId: cholet.id,
        nome: "Cholet Moda",
        status: "ativo",
      },
    });
  }

  await prisma.relacionamentoGestao.upsert({
    where: {
      agenciaId_empresaClienteId: {
        agenciaId: radiola.id,
        empresaClienteId: cholet.id,
      },
    },
    update: {
      status: "ATIVO",
      escopos: ["vendas", "produtos", "estoque"],
      autorizadoEm: new Date(),
      revogadoEm: null,
    },
    create: {
      agenciaId: radiola.id,
      empresaClienteId: cholet.id,
      status: "ATIVO",
      escopos: ["vendas", "produtos", "estoque"],
      inicioEm: new Date(),
      autorizadoEm: new Date(),
    },
  });

  console.log("Cenario de apresentacao atualizado:");
  console.log("- gleison@headstock.com: MASTER_PLATFORM / 123456");
  console.log("- celso@crcom.com: AGENCY_CEO / 123456");
  console.log("- gleison@radiolawifi.com: AGENCY_CEO / 123456");
  console.log("- raphael@fcm.com: COMPANY_OWNER / 123456");
  console.log("- funcionario@fcm.com: DATA_OPERATOR / 12346");
  console.log("- zac@cholet.com: COMPANY_OWNER / 123456");
  console.log("- FCM independente; Cholet conectada a Radiola WiFi");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
