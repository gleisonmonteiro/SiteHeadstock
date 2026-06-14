/**
 * Conecta clientes varejo à agência radiolawifi.
 * Cria Tólas e Madu Kids com dados de demo; liga Cholet (já existente).
 * Execute: npm run db:seed-radiolawifi-clientes
 */

import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────────────────────

function dias(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Cria empresa + usuário + dados de vendas básicos ───────────────────────────

async function criarClienteVarejo(cfg: {
  nome: string;
  nomeFantasia: string;
  slug: string;
  emailOwner: string;
  senhaOwner: string;
  nomeOwner: string;
  produtos: { cd: string; desc: string; grupo: string; vl: number; custo: number }[];
  vendedores: string[];
  clientes: (string | null)[];
  pagamentos: string[];
  lojas: string[];
  metaMensal: number;
}) {
  let empresa = await prisma.empresa.findFirst({ where: { slug: cfg.slug } });

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nome: cfg.nome,
        nomeFantasia: cfg.nomeFantasia,
        slug: cfg.slug,
        tipo: "VAREJO",
        status: "ativo",
      },
    });
    console.log(`  ✔ Empresa criada: ${cfg.nomeFantasia}`);
  } else {
    console.log(`  ℹ Empresa já existe: ${cfg.nomeFantasia}`);
  }

  const usuarioExiste = await prisma.usuario.findUnique({ where: { email: cfg.emailOwner } });
  if (!usuarioExiste) {
    const senhaHash = await bcrypt.hash(cfg.senhaOwner, 10);
    await prisma.usuario.create({
      data: {
        nome: cfg.nomeOwner,
        email: cfg.emailOwner,
        senhaHash,
        papel: "COMPANY_OWNER",
        empresaId: empresa.id,
      },
    });
    console.log(`  ✔ Usuário: ${cfg.emailOwner} / ${cfg.senhaOwner}`);
  }

  // Limpa dados anteriores
  await prisma.venda.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.upload.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.meta.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.metaVendedor.deleteMany({ where: { empresaId: empresa.id } });

  // Upload âncora
  const upload = await prisma.upload.create({
    data: {
      empresaId: empresa.id,
      nomeArquivo: `seed-${cfg.slug}.xlsx`,
      tipo: "vendas",
      status: "sucesso",
      totalLinhas: 0,
      linhasImportadas: 0,
      linhasErro: 0,
    },
  });

  // Vendas — últimos 90 dias (volume menor que Cholet)
  const vendasData = [];
  for (let d = -90; d <= 0; d++) {
    const data = dias(d);
    const dow = data.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const qtdDia = isWeekend ? randInt(8, 14) : randInt(4, 9);

    for (let i = 0; i < qtdDia; i++) {
      const p = pick(cfg.produtos);
      const qtd = randInt(1, 2);
      const vlLiquido = Math.round((p.vl * qtd - rand(0, p.vl * 0.1)) * 100) / 100;
      vendasData.push({
        empresaId: empresa.id,
        uploadId: upload.id,
        dataVenda: data,
        valorVenda: vlLiquido,
        produto: p.desc,
        cdProduto: p.cd,
        quantidade: qtd,
        vendedor: pick(cfg.vendedores),
        cliente: pick(cfg.clientes) as string | undefined,
        formaPagamento: pick(cfg.pagamentos),
        categoria: p.grupo,
        custo: p.custo * qtd,
        loja: pick(cfg.lojas),
      });
    }
  }
  await prisma.venda.createMany({ data: vendasData });
  await prisma.upload.update({
    where: { id: upload.id },
    data: { totalLinhas: vendasData.length, linhasImportadas: vendasData.length },
  });

  // Metas (últimos 6 + próximos 3 meses)
  const agora = new Date();
  const metasData: { empresaId: string; mes: number; ano: number; valorMeta: number }[] = [];
  const metasVendedorData: { empresaId: string; vendedor: string; mes: number; ano: number; valorMeta: number }[] = [];

  for (let m = -6; m <= 3; m++) {
    const ref = new Date(agora.getFullYear(), agora.getMonth() + m, 1);
    const mes = ref.getMonth() + 1;
    const ano = ref.getFullYear();
    const metaGlobal = Math.round(cfg.metaMensal * (1 + m * 0.02));

    metasData.push({ empresaId: empresa.id, mes, ano, valorMeta: metaGlobal });

    const fatiaBase = Math.round(metaGlobal / cfg.vendedores.length);
    cfg.vendedores.forEach((v) => {
      metasVendedorData.push({
        empresaId: empresa.id,
        vendedor: v,
        mes,
        ano,
        valorMeta: fatiaBase + randInt(-800, 800),
      });
    });
  }
  await prisma.meta.createMany({ data: metasData });
  await prisma.metaVendedor.createMany({ data: metasVendedorData });

  console.log(`  ✔ ${vendasData.length} vendas · ${metasData.length} metas`);

  return empresa;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━ SEED RADIOLAWIFI — CLIENTES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 1. Agência
  const agencia = await prisma.empresa.findFirst({ where: { slug: "radiolawifi" } });
  if (!agencia) throw new Error("Agência radiolawifi não encontrada. Rode seed-radiolawifi.ts primeiro.");
  console.log(`✔ Agência: ${agencia.nomeFantasia} (${agencia.id})\n`);

  // 2. Cholet (já existe)
  const cholet = await prisma.empresa.findFirst({ where: { slug: "cholet" } });
  if (!cholet) throw new Error("Cholet não encontrada. Rode seed-cholet.ts primeiro.");
  console.log(`✔ Cholet já existe: ${cholet.id}`);

  // 3. Criar Tólas Moda Masculina
  console.log("\n── Tólas Moda Masculina ──────────────────────────────────────────");
  const tolas = await criarClienteVarejo({
    nome: "Tólas Moda Masculina Ltda",
    nomeFantasia: "Tólas",
    slug: "tolas",
    emailOwner: "sergio@tolas.com.br",
    senhaOwner: "Tolas@2026",
    nomeOwner: "Sérgio Menezes",
    lojas: ["Loja Iguatemi CE", "Loja North Shopping"],
    vendedores: ["Lucas Tavares", "Renata Sousa", "Thiago Braga"],
    clientes: [
      "Daniel Rodrigues", "Marcelo Vieira", "Felipe Cardoso",
      "Paulo Henrique", "Rodrigo Maia", null, null,
    ],
    pagamentos: ["Cartão Crédito", "PIX", "Cartão Débito", "Crediário"],
    metaMensal: 55000,
    produtos: [
      { cd: "TOL-CAM-01", desc: "Camisa Social Premium",     grupo: "Camisas",   vl: 219.9, custo: 85.0 },
      { cd: "TOL-CAM-02", desc: "Camisa Casual Oxford",      grupo: "Camisas",   vl: 179.9, custo: 68.0 },
      { cd: "TOL-CAL-01", desc: "Calça Chino Masculina",     grupo: "Calças",    vl: 259.9, custo: 98.0 },
      { cd: "TOL-CAL-02", desc: "Calça Alfaiataria Slim",    grupo: "Calças",    vl: 299.9, custo: 115.0 },
      { cd: "TOL-POL-01", desc: "Polo Piquet Premium",       grupo: "Polos",     vl: 169.9, custo: 64.0 },
      { cd: "TOL-JKT-01", desc: "Jaqueta Couro Sintético",   grupo: "Jaquetas",  vl: 489.9, custo: 195.0 },
      { cd: "TOL-BER-01", desc: "Bermuda Premium Linho",     grupo: "Bermudas",  vl: 149.9, custo: 55.0 },
      { cd: "TOL-CMT-01", desc: "Camiseta Básica Supima",    grupo: "Camisetas", vl: 99.9,  custo: 36.0 },
      { cd: "TOL-SAP-01", desc: "Sapato Social Oxford",      grupo: "Calçados",  vl: 429.9, custo: 168.0 },
      { cd: "TOL-CIN-01", desc: "Cinto Couro Genuíno",       grupo: "Acessórios",vl: 139.9, custo: 52.0 },
    ],
  });

  // 4. Criar Madu Kids
  console.log("\n── Madu Kids ─────────────────────────────────────────────────────");
  const madu = await criarClienteVarejo({
    nome: "Madu Kids Comércio de Moda Infantil Ltda",
    nomeFantasia: "Madu Kids",
    slug: "madu-kids",
    emailOwner: "amanda@madukids.com.br",
    senhaOwner: "Madu@2026",
    nomeOwner: "Amanda Figueiredo",
    lojas: ["Loja Aldeota", "Loja Messejana", "Loja Maracanaú"],
    vendedores: ["Camila Torres", "Jéssica Araújo", "Natália Peixoto", "Vitor Nunes"],
    clientes: [
      "Fernanda Queiroz", "Isabela Cunha", "Mariana Teixeira",
      "Sabrina Lopes", "Viviane Castro", null, null, null,
    ],
    pagamentos: ["Cartão Crédito", "PIX", "Cartão Débito", "Dinheiro"],
    metaMensal: 38000,
    produtos: [
      { cd: "MKD-VES-01", desc: "Vestido Infantil Floral",    grupo: "Vestidos",   vl: 89.9,  custo: 32.0 },
      { cd: "MKD-VES-02", desc: "Vestido Festa Infantil",     grupo: "Vestidos",   vl: 149.9, custo: 56.0 },
      { cd: "MKD-CON-01", desc: "Conjunto Infantil Moletom",  grupo: "Conjuntos",  vl: 119.9, custo: 44.0 },
      { cd: "MKD-CON-02", desc: "Conjunto Curto Estampado",   grupo: "Conjuntos",  vl: 79.9,  custo: 28.0 },
      { cd: "MKD-BLU-01", desc: "Blusa Infantil Bordada",     grupo: "Blusas",     vl: 59.9,  custo: 21.0 },
      { cd: "MKD-CAL-01", desc: "Calça Moletom Infantil",     grupo: "Calças",     vl: 69.9,  custo: 25.0 },
      { cd: "MKD-CAL-02", desc: "Calça Jeans Kids",           grupo: "Calças",     vl: 89.9,  custo: 33.0 },
      { cd: "MKD-PAJ-01", desc: "Pijama Infantil Personagem", grupo: "Pijamas",    vl: 99.9,  custo: 38.0 },
      { cd: "MKD-TEN-01", desc: "Tênis Kids Sport",           grupo: "Calçados",   vl: 119.9, custo: 45.0 },
      { cd: "MKD-BON-01", desc: "Bone Infantil Estampado",    grupo: "Acessórios", vl: 39.9,  custo: 14.0 },
    ],
  });

  // 5. Criar / atualizar ClienteAgencia para cada empresa
  console.log("\n── Vinculando à agência radiolawifi ──────────────────────────────");

  const clientes = [
    { empresa: cholet,  nome: "Cholet Moda" },
    { empresa: tolas,   nome: "Tólas Moda Masculina" },
    { empresa: madu,    nome: "Madu Kids" },
  ];

  for (const { empresa, nome } of clientes) {
    // Verifica se ClienteAgencia já existe
    const existente = await prisma.clienteAgencia.findFirst({
      where: { agenciaId: agencia.id, empresaConectadaId: empresa.id },
    });

    if (!existente) {
      await prisma.clienteAgencia.create({
        data: {
          agenciaId: agencia.id,
          empresaConectadaId: empresa.id,
          nome,
          status: "ativo",
        },
      });
      console.log(`  ✔ ${nome} vinculada`);
    } else {
      // Garante que está ativo e com o nome certo
      await prisma.clienteAgencia.update({
        where: { id: existente.id },
        data: { nome, status: "ativo" },
      });
      console.log(`  ✔ ${nome} já vinculada (atualizada)`);
    }
  }

  // 6. Resumo
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Clientes da radiolawifi configurados!\n");
  console.log("  AGÊNCIA");
  console.log(`  Login: gleison@radiolawifi.com / 123456\n`);
  console.log("  CLIENTES:");
  console.log(`  ┌ Cholet      → zac@cholet.com.br       / Cholet@2026`);
  console.log(`  ├ Tólas       → sergio@tolas.com.br     / Tolas@2026`);
  console.log(`  └ Madu Kids   → amanda@madukids.com.br  / Madu@2026`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
