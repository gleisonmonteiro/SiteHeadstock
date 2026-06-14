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

function mesAno(m: number, a: number) {
  return new Date(a, m - 1, 1, 0, 0, 0, 0);
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

// ── Dados mestre ───────────────────────────────────────────────────────────────

const LOJAS = [
  "Loja 01 - Centro",
  "Loja 02 - Shopping Iguatemi",
  "Loja 03 - Shopping RioMar",
];

const PRODUTOS = [
  // FEMININO — Blusas
  { cd: "BLU001-P-BRC", ref: "BLU-001", desc: "Blusa Feminina Listrada", sku: "Blusa Listrada Branca P", cdCor: "BRC", cor: "Branca", cdTam: "P", tam: "P", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Blusas", sub: "Casual", linha: "Primavera 2026", vl: 129.9, custo: 46.0 },
  { cd: "BLU001-M-RSA", ref: "BLU-001", desc: "Blusa Feminina Listrada", sku: "Blusa Listrada Rosa M",   cdCor: "RSA", cor: "Rosa",   cdTam: "M", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Blusas", sub: "Casual", linha: "Primavera 2026", vl: 129.9, custo: 46.0 },
  { cd: "BLU001-G-AZL", ref: "BLU-001", desc: "Blusa Feminina Listrada", sku: "Blusa Listrada Azul G",  cdCor: "AZL", cor: "Azul",   cdTam: "G", tam: "G", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Blusas", sub: "Casual", linha: "Primavera 2026", vl: 129.9, custo: 46.0 },

  // FEMININO — Calças
  { cd: "CAL002-P-PRT", ref: "CAL-002", desc: "Calça Feminina Alfaiataria", sku: "Calça Alfaiataria Preta P", cdCor: "PRT", cor: "Preta", cdTam: "P", tam: "P", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Calças", sub: "Alfaiataria", linha: "Essentials", vl: 249.9, custo: 95.0 },
  { cd: "CAL002-M-BEG", ref: "CAL-002", desc: "Calça Feminina Alfaiataria", sku: "Calça Alfaiataria Bege M",  cdCor: "BEG", cor: "Bege",  cdTam: "M", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Calças", sub: "Alfaiataria", linha: "Essentials", vl: 249.9, custo: 95.0 },
  { cd: "CAL002-G-CZA", ref: "CAL-002", desc: "Calça Feminina Alfaiataria", sku: "Calça Alfaiataria Cinza G", cdCor: "CZA", cor: "Cinza", cdTam: "G", tam: "G", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Calças", sub: "Alfaiataria", linha: "Essentials", vl: 249.9, custo: 95.0 },

  // FEMININO — Vestidos
  { cd: "VES003-P-FLO", ref: "VES-003", desc: "Vestido Midi Floral",   sku: "Vestido Floral P",   cdCor: "FLO", cor: "Floral",   cdTam: "P", tam: "P", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Vestidos", sub: "Midi", linha: "Primavera 2026", vl: 389.9, custo: 148.0 },
  { cd: "VES003-M-FLO", ref: "VES-003", desc: "Vestido Midi Floral",   sku: "Vestido Floral M",   cdCor: "FLO", cor: "Floral",   cdTam: "M", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Vestidos", sub: "Midi", linha: "Primavera 2026", vl: 389.9, custo: 148.0 },
  { cd: "VES003-G-FLO", ref: "VES-003", desc: "Vestido Midi Floral",   sku: "Vestido Floral G",   cdCor: "FLO", cor: "Floral",   cdTam: "G", tam: "G", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Vestidos", sub: "Midi", linha: "Primavera 2026", vl: 389.9, custo: 148.0 },
  { cd: "VES004-P-PRT", ref: "VES-004", desc: "Vestido Casual Crepe",  sku: "Vestido Crepe Preto P",    cdCor: "PRT", cor: "Preto",    cdTam: "P", tam: "P", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Vestidos", sub: "Casual", linha: "Essentials", vl: 299.9, custo: 112.0 },
  { cd: "VES004-M-VRM", ref: "VES-004", desc: "Vestido Casual Crepe",  sku: "Vestido Crepe Vermelho M", cdCor: "VRM", cor: "Vermelho", cdTam: "M", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Vestidos", sub: "Casual", linha: "Essentials", vl: 299.9, custo: 112.0 },

  // FEMININO — Saias
  { cd: "SAI005-M-FLO", ref: "SAI-005", desc: "Saia Midi Plissada", sku: "Saia Plissada Floral M", cdCor: "FLO", cor: "Floral", cdTam: "M", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Saias", sub: "Midi", linha: "Primavera 2026", vl: 219.9, custo: 82.0 },
  { cd: "SAI005-G-VRD", ref: "SAI-005", desc: "Saia Midi Plissada", sku: "Saia Plissada Verde G",  cdCor: "VRD", cor: "Verde",  cdTam: "G", tam: "G", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Saias", sub: "Midi", linha: "Primavera 2026", vl: 219.9, custo: 82.0 },

  // FEMININO — Conjuntos
  { cd: "CON006-M-PRT", ref: "CON-006", desc: "Conjunto Cropped + Calça", sku: "Conjunto Preto M",  cdCor: "PRT", cor: "Preto",  cdTam: "M", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Conjuntos", sub: "Coordenados", linha: "Premium", vl: 459.9, custo: 178.0 },
  { cd: "CON006-G-BRC", ref: "CON-006", desc: "Conjunto Cropped + Calça", sku: "Conjunto Branco G", cdCor: "BRC", cor: "Branco", cdTam: "G", tam: "G", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Conjuntos", sub: "Coordenados", linha: "Premium", vl: 459.9, custo: 178.0 },

  // FEMININO — Jaquetas
  { cd: "JAQ007-M-JNS", ref: "JAQ-007", desc: "Jaqueta Jeans Feminina", sku: "Jaqueta Jeans M", cdCor: "JNS", cor: "Jeans", cdTam: "M", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Jaquetas", sub: "Jeans", linha: "Essentials", vl: 349.9, custo: 135.0 },
  { cd: "JAQ007-GG-JNS", ref: "JAQ-007", desc: "Jaqueta Jeans Feminina", sku: "Jaqueta Jeans GG", cdCor: "JNS", cor: "Jeans", cdTam: "GG", tam: "GG", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Jaquetas", sub: "Jeans", linha: "Essentials", vl: 349.9, custo: 135.0 },

  // MASCULINO — Camisas
  { cd: "CAM008-M-AZL", ref: "CAM-008", desc: "Camisa Social Masculina", sku: "Camisa Social Azul M",   cdCor: "AZL", cor: "Azul",   cdTam: "M", tam: "M", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Camisas", sub: "Social", linha: "Essentials", vl: 179.9, custo: 68.0 },
  { cd: "CAM008-G-BRC", ref: "CAM-008", desc: "Camisa Social Masculina", sku: "Camisa Social Branca G", cdCor: "BRC", cor: "Branca", cdTam: "G", tam: "G", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Camisas", sub: "Social", linha: "Essentials", vl: 179.9, custo: 68.0 },

  // MASCULINO — Calças
  { cd: "CAL009-42-PRT", ref: "CAL-009", desc: "Calça Masculina Slim", sku: "Calça Slim Preta 42", cdCor: "PRT", cor: "Preta", cdTam: "42", tam: "42", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Calças", sub: "Slim", linha: "Essentials", vl: 229.9, custo: 88.0 },
  { cd: "CAL009-44-CZA", ref: "CAL-009", desc: "Calça Masculina Slim", sku: "Calça Slim Cinza 44", cdCor: "CZA", cor: "Cinza", cdTam: "44", tam: "44", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Calças", sub: "Slim", linha: "Essentials", vl: 229.9, custo: 88.0 },

  // MASCULINO — Polos e Camisetas
  { cd: "POL010-M-PRT", ref: "POL-010", desc: "Polo Premium Masculina",     sku: "Polo Preta M",      cdCor: "PRT", cor: "Preta",  cdTam: "M", tam: "M", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Polos",     sub: "Premium", linha: "Premium",   vl: 149.9, custo: 55.0 },
  { cd: "POL010-G-AZL", ref: "POL-010", desc: "Polo Premium Masculina",     sku: "Polo Azul G",       cdCor: "AZL", cor: "Azul",   cdTam: "G", tam: "G", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Polos",     sub: "Premium", linha: "Premium",   vl: 149.9, custo: 55.0 },
  { cd: "CMT011-M-PRT", ref: "CMT-011", desc: "Camiseta Masculina Premium", sku: "Camiseta Preta M",  cdCor: "PRT", cor: "Preta",  cdTam: "M", tam: "M", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Camisetas", sub: "Premium", linha: "Essentials", vl: 89.9,  custo: 32.0 },
  { cd: "CMT011-G-BRC", ref: "CMT-011", desc: "Camiseta Masculina Premium", sku: "Camiseta Branca G", cdCor: "BRC", cor: "Branca", cdTam: "G", tam: "G", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Camisetas", sub: "Premium", linha: "Essentials", vl: 89.9,  custo: 32.0 },

  // MASCULINO — Bermudas
  { cd: "BER012-42-KHA", ref: "BER-012", desc: "Bermuda Masculina Casual", sku: "Bermuda Khaki 42", cdCor: "KHA", cor: "Khaki", cdTam: "42", tam: "42", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Bermudas", sub: "Casual", linha: "Essentials", vl: 129.9, custo: 48.0 },
  { cd: "BER012-44-AZL", ref: "BER-012", desc: "Bermuda Masculina Casual", sku: "Bermuda Azul 44",   cdCor: "AZL", cor: "Azul",   cdTam: "44", tam: "44", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Bermudas", sub: "Casual", linha: "Essentials", vl: 129.9, custo: 48.0 },
];

const VENDEDORES = ["Marina Costa", "Rafael Andrade", "Juliana Mendes", "Pedro Cavalcante", "Beatriz Fontes"];
const CLIENTES   = ["Maria José Santos", "Francisco Oliveira", "Ana Paula Ferreira", "Antônio Carlos", "Francisca Lima", "Roberto Mendes", "Tereza Alves", null, null, null];
const PAGAMENTOS = ["Cartão Crédito", "Cartão Débito", "PIX", "Dinheiro", "Crediário"];

const FORNECEDORES_PAGAR = [
  "Têxtil Nordeste Ltda",
  "Confecções Rio Ltda",
  "Moda Import Brasil S.A.",
  "JBS Têxtil S.A.",
  "Fornecedor Malhas SA",
  "Aluguel Shopping Iguatemi",
  "Aluguel Shopping RioMar",
  "Energia Fortaleza",
  "Internet e Telecom",
];

const CLIENTES_RECEBER = [
  "Maria José Santos ME",
  "Francisco Oliveira EPP",
  "Distribuidora Moda Norte Ltda",
  "Grupo Fashion CE Ltda",
  "Varejista Cearense Ltda",
  "Ana Paula & Cia",
];

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("━━━ SEED CHOLET ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── 1. Empresa + Usuário ────────────────────────────────────────────────────
  let empresa = await prisma.empresa.findFirst({ where: { slug: "cholet" } });

  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nome: "Cholet Moda Ltda",
        nomeFantasia: "Cholet",
        slug: "cholet",
        tipo: "VAREJO",
        status: "ativo",
      },
    });
    console.log(`✔ Empresa criada: ${empresa.nomeFantasia} (${empresa.id})`);
  } else {
    console.log(`ℹ Empresa já existe: ${empresa.nomeFantasia} (${empresa.id})`);
  }

  const emailZac = "zac@cholet.com.br";
  let zac = await prisma.usuario.findUnique({ where: { email: emailZac } });

  if (!zac) {
    const senhaHash = await bcrypt.hash("Cholet@2026", 10);
    zac = await prisma.usuario.create({
      data: {
        nome: "Zac Oliveira",
        email: emailZac,
        senhaHash,
        papel: "COMPANY_OWNER",
        empresaId: empresa.id,
      },
    });
    console.log(`✔ Usuário criado: ${zac.nome} / ${zac.email} / senha: Cholet@2026`);
  } else {
    console.log(`ℹ Usuário já existe: ${zac.nome}`);
  }

  // ── 2. Limpeza ──────────────────────────────────────────────────────────────
  console.log("\nLimpando dados anteriores...");
  await prisma.contaReceber.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.contaPagar.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.venda.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.upload.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.itemEstoque.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.produtoCatalogo.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.metaVendedor.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.meta.deleteMany({ where: { empresaId: empresa.id } });
  console.log("✔ Limpeza concluída.\n");

  // ── 3. Catálogo de Produtos ─────────────────────────────────────────────────
  console.log("Criando catálogo de produtos...");
  const produtosCriados = await Promise.all(
    PRODUTOS.map((p) =>
      prisma.produtoCatalogo.create({
        data: {
          empresaId: empresa!.id,
          cdProduto: p.cd,
          referencia: p.ref,
          descricao: p.desc,
          descricaoSku: p.sku,
          cdCor: p.cdCor,
          cor: p.cor,
          cdTam: p.cdTam,
          tamanho: p.tam,
          setor: p.setor,
          departamento: p.dept,
          genero: p.genero,
          marca: p.marca,
          grupo: p.grupo,
          subgrupo: p.sub,
          linha: p.linha,
          vlVenda: p.vl,
          vlCusto: p.custo,
        },
      })
    )
  );
  console.log(`✔ ${produtosCriados.length} SKUs no catálogo.\n`);

  // ── 4. Estoque (posição de hoje por loja) ───────────────────────────────────
  console.log("Criando estoque por loja...");
  const hoje = dias(0);
  const estoqueData = [];
  for (const produto of produtosCriados) {
    const base = PRODUTOS.find((p) => p.cd === produto.cdProduto)!;
    for (const loja of LOJAS) {
      // Lojas de shopping têm estoque menor
      const maxEstoque = loja.includes("Centro") ? 35 : 22;
      estoqueData.push({
        empresaId: empresa.id,
        produtoId: produto.id,
        cdProduto: produto.cdProduto,
        loja,
        dataRef: hoje,
        estoque: rand(0, maxEstoque),
        vlVenda: base.vl,
        vlCusto: base.custo,
      });
    }
  }
  await prisma.itemEstoque.createMany({ data: estoqueData });
  console.log(`✔ ${estoqueData.length} posições de estoque (${LOJAS.length} lojas × ${produtosCriados.length} SKUs).\n`);

  // ── 5. Upload âncora para vendas ────────────────────────────────────────────
  const upload = await prisma.upload.create({
    data: {
      empresaId: empresa.id,
      nomeArquivo: "seed-cholet-inicial.xlsx",
      tipo: "vendas",
      status: "sucesso",
      totalLinhas: 0,
      linhasImportadas: 0,
      linhasErro: 0,
    },
  });

  // ── 6. Vendas (180 dias) ────────────────────────────────────────────────────
  console.log("Criando vendas dos últimos 6 meses...");
  const vendasData = [];

  for (let d = -180; d <= 0; d++) {
    const data = dias(d);
    const diaSemana = data.getDay(); // 0=Dom, 6=Sáb
    // Finais de semana vendem mais (20-30 peças/dia), dias úteis menos (8-16)
    const isWeekend = diaSemana === 0 || diaSemana === 6;
    const qtdVendasDia = isWeekend ? randInt(18, 30) : randInt(8, 16);

    for (let i = 0; i < qtdVendasDia; i++) {
      const produto = pick(PRODUTOS);
      const qtd = randInt(1, 3);
      const temDesconto = Math.random() > 0.75;
      const desconto = temDesconto ? rand(10, produto.vl * 0.15) : 0;
      const vlBruto = produto.vl * qtd;
      const vlLiquido = Math.round((vlBruto - desconto) * 100) / 100;

      vendasData.push({
        empresaId: empresa.id,
        uploadId: upload.id,
        dataVenda: data,
        valorVenda: vlLiquido,
        vlBruto,
        produto: produto.desc,
        cdProduto: produto.cd,
        quantidade: qtd,
        vendedor: pick(VENDEDORES),
        cliente: pick(CLIENTES) as string | undefined,
        formaPagamento: pick(PAGAMENTOS),
        categoria: produto.grupo,
        marca: produto.marca,
        custo: produto.custo * qtd,
        loja: pick(LOJAS),
        desconto: desconto || undefined,
      });
    }
  }
  await prisma.venda.createMany({ data: vendasData });
  console.log(`✔ ${vendasData.length} vendas criadas.\n`);

  // Atualiza o upload com totais reais
  await prisma.upload.update({
    where: { id: upload.id },
    data: { totalLinhas: vendasData.length, linhasImportadas: vendasData.length },
  });

  // ── 7. Metas mensais ────────────────────────────────────────────────────────
  console.log("Criando metas mensais e por vendedor...");
  const metasData: { empresaId: string; mes: number; ano: number; valorMeta: number }[] = [];
  const metasVendedorData: { empresaId: string; vendedor: string; mes: number; ano: number; valorMeta: number }[] = [];
  const anoAtual = new Date().getFullYear();

  // Metas dos últimos 6 meses + próximos 3 meses
  for (let m = -6; m <= 3; m++) {
    const data = mesAno(
      ((new Date().getMonth() + m + 12) % 12) + 1,
      anoAtual + Math.floor((new Date().getMonth() + m) / 12)
    );
    const mes = data.getMonth() + 1;
    const ano = data.getFullYear();
    // Meta global cresce ~3% ao mês a partir de 85k
    const metaGlobal = Math.round(85000 + (m + 6) * 2600);

    metasData.push({ empresaId: empresa.id, mes, ano, valorMeta: metaGlobal });

    // Meta por vendedor (soma ≈ metaGlobal)
    const metasPorVendedor = [22000, 19000, 17500, 15000, 12000]; // Marina, Rafael, Juliana, Pedro, Beatriz
    VENDEDORES.forEach((v, idx) => {
      metasVendedorData.push({
        empresaId: empresa.id,
        vendedor: v,
        mes,
        ano,
        valorMeta: metasPorVendedor[idx] + randInt(-500, 500),
      });
    });
  }

  await prisma.meta.createMany({ data: metasData });
  await prisma.metaVendedor.createMany({ data: metasVendedorData });
  console.log(`✔ ${metasData.length} metas mensais e ${metasVendedorData.length} metas por vendedor.\n`);

  // ── 8. Contas a Pagar ───────────────────────────────────────────────────────
  console.log("Criando contas a pagar...");
  const contasPagar = [];
  let nrSeq = 4500;

  // Vencidas (em aberto) — 10 títulos
  for (let i = 0; i < 10; i++) {
    const dtVcto = dias(-randInt(1, 35));
    const vl = rand(800, 9500);
    contasPagar.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      fornecedor: pick(FORNECEDORES_PAGAR),
      nrDuplicata: `NF-${++nrSeq}`,
      nrParcela: `${randInt(1, 3)}/3`,
      dtEmissao: new Date(dtVcto.getTime() - 30 * 86400000),
      dtVencimento: dtVcto,
      tpSituacao: "N",
      tpDocumento: "NF",
      vlDuplicata: vl,
      vlOriginal: vl,
    });
  }

  // A vencer (próximos 60 dias) — 16 títulos
  for (let i = 0; i < 16; i++) {
    const dtVcto = dias(randInt(1, 60));
    const vl = rand(1200, 14000);
    contasPagar.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      fornecedor: pick(FORNECEDORES_PAGAR),
      nrDuplicata: `NF-${++nrSeq}`,
      nrParcela: `${randInt(1, 3)}/3`,
      dtEmissao: new Date(dtVcto.getTime() - 30 * 86400000),
      dtVencimento: dtVcto,
      tpSituacao: "N",
      tpDocumento: "NF",
      vlDuplicata: vl,
      vlOriginal: vl,
    });
  }

  // Pagas — 12 títulos
  for (let i = 0; i < 12; i++) {
    const dtVcto = dias(-randInt(5, 90));
    const vl = rand(500, 8000);
    contasPagar.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      fornecedor: pick(FORNECEDORES_PAGAR),
      nrDuplicata: `NF-${++nrSeq}`,
      nrParcela: "1/1",
      dtEmissao: new Date(dtVcto.getTime() - 30 * 86400000),
      dtVencimento: dtVcto,
      dtBaixa: new Date(dtVcto.getTime() + randInt(-2, 5) * 86400000),
      tpSituacao: "B",
      tpDocumento: "NF",
      tpBaixa: "N",
      vlDuplicata: vl,
      vlOriginal: vl,
      vlPago: vl,
    });
  }

  await prisma.contaPagar.createMany({ data: contasPagar });
  console.log(`✔ ${contasPagar.length} contas a pagar (10 vencidas, 16 a vencer, 12 pagas).\n`);

  // ── 9. Contas a Receber ─────────────────────────────────────────────────────
  console.log("Criando contas a receber...");
  const contasReceber = [];
  let fatSeq = 8800;

  // Vencidas — 8 títulos
  for (let i = 0; i < 8; i++) {
    const dtVcto = dias(-randInt(1, 30));
    const vl = rand(400, 6000);
    contasReceber.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      nmCliente: pick(CLIENTES_RECEBER),
      nrFat: `FAT-${++fatSeq}`,
      nrParcela: `${randInt(1, 3)}/3`,
      dtEmissao: new Date(dtVcto.getTime() - 30 * 86400000),
      dtVencimento: dtVcto,
      tpSituacao: "1",
      tpDocumento: "DUP",
      vlFatura: vl,
      vlOriginal: vl,
    });
  }

  // A receber — 18 títulos
  for (let i = 0; i < 18; i++) {
    const dtVcto = dias(randInt(1, 60));
    const vl = rand(600, 9000);
    contasReceber.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      nmCliente: pick(CLIENTES_RECEBER),
      nrFat: `FAT-${++fatSeq}`,
      nrParcela: `${randInt(1, 3)}/3`,
      dtEmissao: new Date(dtVcto.getTime() - 30 * 86400000),
      dtVencimento: dtVcto,
      tpSituacao: "1",
      tpDocumento: "DUP",
      vlFatura: vl,
      vlOriginal: vl,
    });
  }

  // Recebidas — 14 títulos
  for (let i = 0; i < 14; i++) {
    const dtVcto = dias(-randInt(5, 90));
    const vl = rand(350, 7500);
    contasReceber.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      nmCliente: pick(CLIENTES_RECEBER),
      nrFat: `FAT-${++fatSeq}`,
      nrParcela: "1/1",
      dtEmissao: new Date(dtVcto.getTime() - 30 * 86400000),
      dtVencimento: dtVcto,
      dtBaixa: new Date(dtVcto.getTime() + randInt(-1, 3) * 86400000),
      tpSituacao: "2",
      tpDocumento: "DUP",
      tpBaixa: "N",
      vlFatura: vl,
      vlOriginal: vl,
      vlPago: vl,
    });
  }

  await prisma.contaReceber.createMany({ data: contasReceber });
  console.log(`✔ ${contasReceber.length} contas a receber (8 vencidas, 18 a receber, 14 recebidas).\n`);

  // ── 10. Produção (OPs) ──────────────────────────────────────────────────────
  // Nota: usa (prisma as any) pois o cliente gerado predateia os modelos de produção.
  // Os modelos existem no schema e no banco — apenas os tipos não foram regenerados ainda.
  console.log("Criando programação de produção e OPs...");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma as any;

  // Limpeza de produção (cascata cuida de movimentações e itens)
  await db.ordemProducao.deleteMany({ where: { empresaId: empresa.id } });
  await db.programacaoOP.deleteMany({ where: { empresaId: empresa.id } });

  const ETAPAS_PROD = [
    { nome: "CORTE",      ordem: 1 },
    { nome: "COST. EXT.", ordem: 2 },
    { nome: "COST. INT.", ordem: 3 },
    { nome: "LIMPEZA",    ordem: 4 },
    { nome: "ACABAMENTO", ordem: 5 },
    { nome: "DPA",        ordem: 6 },
  ];

  const programacao = await db.programacaoOP.create({
    data: {
      empresaId: empresa.id,
      nome: "Padrão Cholet",
      ativo: true,
      etapas: {
        create: ETAPAS_PROD.map((e: { nome: string; ordem: number }) => ({ nome: e.nome, ordem: e.ordem })),
      },
    },
    include: { etapas: { orderBy: { ordem: "asc" } } },
  });

  const etapasMap = new Map<string, { id: string; nome: string; ordem: number }>(
    programacao.etapas.map((e: { id: string; nome: string; ordem: number }) => [e.nome, e])
  );

  // Definição das OPs: [produto, ref, oficina, qtd, custo, etapa, diasNaEtapa, status]
  type OPDef = {
    produto: string; ref: string; oficina: string;
    qtd: number; custo: number; etapa: string;
    diasNaEtapa: number; status: "EM_ANDAMENTO" | "CONCLUIDA";
  };

  const OP_DEFS: OPDef[] = [
    // CORTE — 1 normal, 1 atenção, 1 crítico
    { produto: "Blusa Feminina Listrada",    ref: "BLU-001", oficina: "Atelier Norte",   qtd: 120, custo: 5520,  etapa: "CORTE",      diasNaEtapa: 2,  status: "EM_ANDAMENTO" },
    { produto: "Calça Feminina Alfaiataria", ref: "CAL-002", oficina: "Oficina Central", qtd: 80,  custo: 7600,  etapa: "CORTE",      diasNaEtapa: 7,  status: "EM_ANDAMENTO" },
    { produto: "Vestido Midi Floral",        ref: "VES-003", oficina: "Atelier Sul",     qtd: 60,  custo: 8880,  etapa: "CORTE",      diasNaEtapa: 14, status: "EM_ANDAMENTO" },
    // COST. EXT. — 1 normal, 1 atenção, 1 crítico
    { produto: "Conjunto Cropped + Calça",   ref: "CON-006", oficina: "Atelier Norte",   qtd: 45,  custo: 8010,  etapa: "COST. EXT.", diasNaEtapa: 3,  status: "EM_ANDAMENTO" },
    { produto: "Vestido Casual Crepe",       ref: "VES-004", oficina: "Oficina Central", qtd: 70,  custo: 7840,  etapa: "COST. EXT.", diasNaEtapa: 8,  status: "EM_ANDAMENTO" },
    { produto: "Jaqueta Jeans Feminina",     ref: "JAQ-007", oficina: "Atelier Sul",     qtd: 50,  custo: 6750,  etapa: "COST. EXT.", diasNaEtapa: 12, status: "EM_ANDAMENTO" },
    // COST. INT. — 2 normal
    { produto: "Saia Midi Plissada",         ref: "SAI-005", oficina: "Atelier Norte",   qtd: 90,  custo: 7380,  etapa: "COST. INT.", diasNaEtapa: 4,  status: "EM_ANDAMENTO" },
    { produto: "Camisa Social Masculina",    ref: "CAM-008", oficina: "Oficina Central", qtd: 100, custo: 6800,  etapa: "COST. INT.", diasNaEtapa: 2,  status: "EM_ANDAMENTO" },
    // LIMPEZA — 1 normal, 1 atenção
    { produto: "Calça Masculina Slim",       ref: "CAL-009", oficina: "Atelier Sul",     qtd: 110, custo: 9680,  etapa: "LIMPEZA",    diasNaEtapa: 1,  status: "EM_ANDAMENTO" },
    { produto: "Polo Premium Masculina",     ref: "POL-010", oficina: "Atelier Norte",   qtd: 150, custo: 8250,  etapa: "LIMPEZA",    diasNaEtapa: 6,  status: "EM_ANDAMENTO" },
    // ACABAMENTO — 2 normal
    { produto: "Camiseta Masculina Premium", ref: "CMT-011", oficina: "Oficina Central", qtd: 200, custo: 6400,  etapa: "ACABAMENTO", diasNaEtapa: 2,  status: "EM_ANDAMENTO" },
    { produto: "Bermuda Masculina Casual",   ref: "BER-012", oficina: "Atelier Sul",     qtd: 130, custo: 6240,  etapa: "ACABAMENTO", diasNaEtapa: 3,  status: "EM_ANDAMENTO" },
    // DPA — 1 normal
    { produto: "Blusa Feminina Listrada",    ref: "BLU-001", oficina: "Atelier Norte",   qtd: 95,  custo: 4370,  etapa: "DPA",        diasNaEtapa: 1,  status: "EM_ANDAMENTO" },
    // CONCLUÍDAS — 2
    { produto: "Vestido Midi Floral",        ref: "VES-003", oficina: "Atelier Norte",   qtd: 80,  custo: 11840, etapa: "DPA",        diasNaEtapa: 0,  status: "CONCLUIDA"    },
    { produto: "Calça Feminina Alfaiataria", ref: "CAL-002", oficina: "Oficina Central", qtd: 120, custo: 11400, etapa: "DPA",        diasNaEtapa: 0,  status: "CONCLUIDA"    },
  ];

  let opSeq = 2601;
  for (const def of OP_DEFS) {
    const etapaAlvo = etapasMap.get(def.etapa)!;
    const entrada = new Date(Date.now() - def.diasNaEtapa * 86_400_000);

    const op = await db.ordemProducao.create({
      data: {
        empresaId: empresa.id,
        programacaoId: programacao.id,
        numero: String(++opSeq),
        produto: def.produto,
        referencia: def.ref,
        oficina: def.oficina,
        qtdTotal: def.qtd,
        custoTotal: def.custo,
        status: def.status,
        etapaAtualId: etapaAlvo.id,
      },
    });

    // Gera histórico de movimentações até a etapa atual
    const etapasAte = (programacao.etapas as { id: string; nome: string; ordem: number }[]).filter(
      (e) => e.ordem <= etapaAlvo.ordem
    );
    for (let i = 0; i < etapasAte.length; i++) {
      const e = etapasAte[i];
      const isAtual = i === etapasAte.length - 1;
      const daysBack = def.diasNaEtapa + (etapasAte.length - 1 - i) * 3;
      const entradaEtapa = new Date(Date.now() - daysBack * 86_400_000);
      const saidaEtapa = isAtual && def.status === "EM_ANDAMENTO"
        ? null
        : new Date(entradaEtapa.getTime() + 2 * 86_400_000);

      await db.movimentacaoOP.create({
        data: {
          opId: op.id,
          etapaId: e.id,
          dataEntrada: isAtual && def.status === "EM_ANDAMENTO" ? entrada : entradaEtapa,
          dataSaida: saidaEtapa,
        },
      });
    }
  }

  console.log(`✔ ${OP_DEFS.length} OPs criadas (${OP_DEFS.filter((o) => o.status === "EM_ANDAMENTO").length} em andamento, ${OP_DEFS.filter((o) => o.status === "CONCLUIDA").length} concluídas).\n`);

  // ── Resumo ──────────────────────────────────────────────────────────────────
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  CHOLET populada com sucesso!\n");
  console.log(`  Login:   ${emailZac}`);
  console.log(`  Senha:   Cholet@2026\n`);
  console.log(`  Produtos:         ${produtosCriados.length} SKUs`);
  console.log(`  Estoque:          ${estoqueData.length} posições (${LOJAS.length} lojas)`);
  console.log(`  Vendas:           ${vendasData.length} transações (últimos 180 dias)`);
  console.log(`  Metas mensais:    ${metasData.length} meses`);
  console.log(`  Contas a Pagar:   ${contasPagar.length} títulos`);
  console.log(`  Contas a Receber: ${contasReceber.length} títulos`);
  console.log(`  OPs:              ${OP_DEFS.length} ordens de produção`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
