import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function garantirEmpresaUsuario(params: {
  email: string;
  nome: string;
  papel: string;
  nomeEmpresa: string;
  slugEmpresa: string;
  tipoEmpresa: string;
  senhaHash: string;
}) {
  const { email, nome, papel, nomeEmpresa, slugEmpresa, tipoEmpresa, senhaHash } = params;

  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });

  if (usuarioExistente) {
    await prisma.empresa.update({
      where: { id: usuarioExistente.empresaId },
      data: { nome: nomeEmpresa, nomeFantasia: nomeEmpresa, tipo: tipoEmpresa as never },
    });
    const usuario = await prisma.usuario.update({
      where: { id: usuarioExistente.id },
      data: { nome, papel: papel as never, senhaHash, status: "ativo" },
    });
    const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: usuario.empresaId } });
    return { usuario, empresa };
  }

  let empresa = await prisma.empresa.findFirst({ where: { slug: slugEmpresa } });
  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nome: nomeEmpresa,
        nomeFantasia: nomeEmpresa,
        slug: slugEmpresa,
        tipo: tipoEmpresa as never,
        status: "ativo",
      },
    });
  } else {
    empresa = await prisma.empresa.update({
      where: { id: empresa.id },
      data: { nome: nomeEmpresa, nomeFantasia: nomeEmpresa, tipo: tipoEmpresa as never },
    });
  }

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      papel: papel as never,
      senhaHash,
      status: "ativo",
      empresaId: empresa.id,
    },
  });

  return { usuario, empresa };
}

async function main() {
  const senhaHash = await bcrypt.hash("123456", 10);

  // 1. Gleison — MASTER_PLATFORM na Headstock (vê tudo)
  await garantirEmpresaUsuario({
    email: "gleison@headstock.com",
    nome: "Gleison Monteiro",
    papel: "MASTER_PLATFORM",
    nomeEmpresa: "Headstock",
    slugEmpresa: "headstock",
    tipoEmpresa: "AGENCIA",
    senhaHash,
  });

  // 2. Celso — AGENCY_CEO na crcom (vê FCM, não vê Cholet)
  const { empresa: crcom } = await garantirEmpresaUsuario({
    email: "celso@crcom.com",
    nome: "Celso",
    papel: "AGENCY_CEO",
    nomeEmpresa: "crcom",
    slugEmpresa: "crcom",
    tipoEmpresa: "AGENCIA",
    senhaHash,
  });

  // 3. Raphael — COMPANY_OWNER na FCM (visão varejo)
  const { empresa: fcm } = await garantirEmpresaUsuario({
    email: "raphael@fcm.com",
    nome: "Raphael",
    papel: "COMPANY_OWNER",
    nomeEmpresa: "FCM",
    slugEmpresa: "fcm",
    tipoEmpresa: "VAREJO",
    senhaHash,
  });

  // 4. Zac — COMPANY_OWNER na Cholet (visão varejo, não é cliente da crcom)
  await garantirEmpresaUsuario({
    email: "zac@cholet.com",
    nome: "Zac",
    papel: "COMPANY_OWNER",
    nomeEmpresa: "Cholet",
    slugEmpresa: "cholet",
    tipoEmpresa: "VAREJO",
    senhaHash,
  });

  // 5. FCM como cliente da crcom (Celso gerencia FCM, não tem acesso à Cholet)
  await prisma.relacionamentoGestao.deleteMany({
    where: { agenciaId: crcom.id, empresaClienteId: fcm.id },
  });
  await prisma.clienteAgencia.deleteMany({
    where: { agenciaId: crcom.id, empresaConectadaId: fcm.id },
  });

  const senhaOperador = await bcrypt.hash("12346", 10);
  await prisma.usuario.upsert({
    where: { email: "funcionario@fcm.com" },
    update: {
      nome: "Operador FCM",
      papel: "DATA_OPERATOR",
      senhaHash: senhaOperador,
      status: "ativo",
      empresaId: fcm.id,
    },
    create: {
      nome: "Operador FCM",
      email: "funcionario@fcm.com",
      papel: "DATA_OPERATOR",
      senhaHash: senhaOperador,
      status: "ativo",
      empresaId: fcm.id,
    },
  });

  console.log("\nUsuários configurados:");
  console.log("  gleison@headstock.com | MASTER_PLATFORM | Headstock (agência/plataforma) | senha: 123456");
  console.log("  celso@crcom.com       | AGENCY_CEO      | crcom (agência)               | senha: 123456");
  console.log("  raphael@fcm.com       | COMPANY_OWNER   | FCM (varejo, cliente da crcom) | senha: 123456");
  console.log("  zac@cholet.com        | COMPANY_OWNER   | Cholet (varejo)               | senha: 123456");
  console.log("\nRelacionamentos:");
  console.log("  FCM → cliente da crcom ✓");
  console.log("  Gleison (MASTER_PLATFORM) vê todas as agências e clientes ✓");
  console.log("  Celso (AGENCY_CEO) vê apenas os clientes da crcom ✓");
  console.log("  Raphael e Zac veem apenas o dashboard da própria empresa ✓");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
