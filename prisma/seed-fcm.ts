import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function dias(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const LOJAS = ["Loja 01 - Centro", "Loja 02 - Shopping", "Loja 03 - Norte"];

const PRODUTOS = [
  { cd: "PRD-001", ref: "CAM-M-AZL", desc: "Camisa Social Manga Longa", sku: "Camisa Social Azul M", cor: "Azul", tam: "M", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Reserva", grupo: "Camisas", sub: "Social", vl: 189.9, custo: 75.0 },
  { cd: "PRD-002", ref: "CAL-42-PRT", desc: "Calça Jeans Slim", sku: "Calça Jeans Preta 42", cor: "Preta", tam: "42", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Hering", grupo: "Calças", sub: "Jeans", vl: 249.9, custo: 95.0 },
  { cd: "PRD-003", ref: "BLU-P-RSA", desc: "Blusa Feminina Decote V", sku: "Blusa Rosa P", cor: "Rosa", tam: "P", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Animale", grupo: "Blusas", sub: "Casual", vl: 159.9, custo: 62.0 },
  { cd: "PRD-004", ref: "VES-M-VRD", desc: "Vestido Midi Floral", sku: "Vestido Verde M", cor: "Verde", tam: "M", setor: "Vestuário", dept: "Feminino", genero: "Feminino", marca: "Animale", grupo: "Vestidos", sub: "Midi", vl: 329.9, custo: 130.0 },
  { cd: "PRD-005", ref: "TEN-39-BRN", desc: "Tênis Casual Urban", sku: "Tênis Branco 39", cor: "Branco", tam: "39", setor: "Calçados", dept: "Unissex", genero: "Unissex", marca: "Nike", grupo: "Tênis", sub: "Casual", vl: 399.9, custo: 160.0 },
  { cd: "PRD-006", ref: "BOL-UN-BEG", desc: "Bolsa Tiracolo Feminina", sku: "Bolsa Bege UN", cor: "Bege", tam: "UN", setor: "Acessórios", dept: "Feminino", genero: "Feminino", marca: "Arezzo", grupo: "Bolsas", sub: "Tiracolo", vl: 289.9, custo: 105.0 },
  { cd: "PRD-007", ref: "CIN-UN-MRR", desc: "Cinto de Couro", sku: "Cinto Marrom UN", cor: "Marrom", tam: "UN", setor: "Acessórios", dept: "Masculino", genero: "Masculino", marca: "Reserva", grupo: "Cintos", sub: "Couro", vl: 129.9, custo: 48.0 },
  { cd: "PRD-008", ref: "POL-G-CZA", desc: "Polo Piquet Masculina", sku: "Polo Cinza G", cor: "Cinza", tam: "G", setor: "Vestuário", dept: "Masculino", genero: "Masculino", marca: "Lacoste", grupo: "Polos", sub: "Piquet", vl: 219.9, custo: 88.0 },
  { cd: "PRD-009", ref: "SAP-38-PTX", desc: "Scarpin Feminino", sku: "Scarpin Preto 38", cor: "Preto", tam: "38", setor: "Calçados", dept: "Feminino", genero: "Feminino", marca: "Arezzo", grupo: "Sapatos", sub: "Scarpin", vl: 359.9, custo: 140.0 },
  { cd: "PRD-010", ref: "JKT-M-PRT", desc: "Jaqueta Jeans Unissex", sku: "Jaqueta Preta M", cor: "Preta", tam: "M", setor: "Vestuário", dept: "Unissex", genero: "Unissex", marca: "Levi's", grupo: "Jaquetas", sub: "Jeans", vl: 449.9, custo: 178.0 },
];

const VENDEDORES = ["Ana Lima", "Bruno Ferraz", "Carla Mendes", "Diego Santos"];
const CLIENTES = ["João Pedro", "Maria Clara", "Fernando Alves", "Patrícia Nunes", "Carlos Eduardo", "Lúcia Rocha", null, null];
const PAGAMENTOS = ["Cartão Crédito", "Cartão Débito", "PIX", "Dinheiro", "Boleto"];
const FORNECEDORES_PAGAR = ["Reserva Têxtil Ltda", "Hering S.A.", "Nike Brasil", "Arezzo & Co", "Lacoste Brasil", "Levi Strauss Brasil"];
const CLIENTES_RECEBER = ["Ana Lima ME", "Bruno & Cia", "Distribuidora Central", "Grupo Moda Norte", "Varejista Sul Ltda"];

async function main() {
  const empresa = await prisma.empresa.findFirst({ where: { slug: "fcm" } });
  if (!empresa) throw new Error("Empresa FCM não encontrada. Rode setup-usuarios primeiro.");

  // Limpar dados anteriores da FCM
  await prisma.contaReceber.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.contaPagar.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.itemEstoque.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.produtoCatalogo.deleteMany({ where: { empresaId: empresa.id } });

  console.log("Limpeza concluída. Criando catálogo de produtos...");

  // ── 1. CATÁLOGO DE PRODUTOS ─────────────────────────────────────────────────
  const produtosCriados = await Promise.all(
    PRODUTOS.map((p) =>
      prisma.produtoCatalogo.create({
        data: {
          empresaId: empresa.id,
          cdProduto: p.cd,
          referencia: p.ref,
          descricao: p.desc,
          descricaoSku: p.sku,
          cor: p.cor,
          tamanho: p.tam,
          setor: p.setor,
          departamento: p.dept,
          genero: p.genero,
          marca: p.marca,
          grupo: p.grupo,
          subgrupo: p.sub,
          vlVenda: p.vl,
          vlCusto: p.custo,
        },
      })
    )
  );

  console.log(`${produtosCriados.length} produtos criados. Criando estoque...`);

  // ── 2. ESTOQUE (posição de hoje por loja) ──────────────────────────────────
  const hoje = dias(0);
  for (const produto of produtosCriados) {
    for (const loja of LOJAS) {
      const pBase = PRODUTOS.find((p) => p.cd === produto.cdProduto)!;
      await prisma.itemEstoque.create({
        data: {
          empresaId: empresa.id,
          produtoId: produto.id,
          cdProduto: produto.cdProduto,
          loja,
          dataRef: hoje,
          estoque: rand(0, 40),
          vlVenda: pBase.vl,
          vlCusto: pBase.custo,
        },
      });
    }
  }

  console.log("Estoque criado. Criando vendas...");

  // ── 3. VENDAS (últimos 60 dias) ────────────────────────────────────────────
  // Garante que existe pelo menos um Upload para linkar as vendas
  let upload = await prisma.upload.findFirst({ where: { empresaId: empresa.id } });
  if (!upload) {
    upload = await prisma.upload.create({
      data: {
        empresaId: empresa.id,
        nomeArquivo: "seed-inicial.xlsx",
        tipo: "vendas",
        status: "sucesso",
        totalLinhas: 0,
        linhasImportadas: 0,
        linhasErro: 0,
      },
    });
  }

  const vendasExistentes = await prisma.venda.count({ where: { empresaId: empresa.id } });
  if (vendasExistentes === 0) {
    const vendasParaCriar = [];
    for (let d = -60; d <= 0; d++) {
      const qtdVendasDia = Math.floor(rand(3, 12));
      for (let i = 0; i < qtdVendasDia; i++) {
        const produto = pick(PRODUTOS);
        const qtd = Math.floor(rand(1, 4));
        const desconto = Math.random() > 0.7 ? rand(5, 30) : 0;
        const valorLiquido = Math.round((produto.vl * qtd - desconto) * 100) / 100;
        vendasParaCriar.push({
          empresaId: empresa.id,
          uploadId: upload.id,
          dataVenda: dias(d),
          valorVenda: valorLiquido,
          vlBruto: produto.vl * qtd,
          produto: produto.desc,
          cdProduto: produto.cd,
          quantidade: qtd,
          vendedor: pick(VENDEDORES),
          cliente: pick(CLIENTES) ?? undefined,
          formaPagamento: pick(PAGAMENTOS),
          categoria: produto.grupo,
          marca: produto.marca,
          custo: produto.custo * qtd,
          loja: pick(LOJAS),
          desconto: desconto || undefined,
        });
      }
    }
    await prisma.venda.createMany({ data: vendasParaCriar });
    console.log(`${vendasParaCriar.length} vendas criadas. Criando contas a pagar...`);
  } else {
    console.log(`Vendas já existem (${vendasExistentes}). Pulando. Criando contas a pagar...`);
  }

  // ── 4. CONTAS A PAGAR ──────────────────────────────────────────────────────
  const contasPagar = [];
  // Vencidas (30 dias atrás a 1 dia atrás) — situação N = não pago
  for (let i = 0; i < 8; i++) {
    const vencimento = dias(-Math.floor(rand(1, 30)));
    contasPagar.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      fornecedor: pick(FORNECEDORES_PAGAR),
      nrDuplicata: `NF-${Math.floor(rand(1000, 9999))}`,
      nrParcela: `${Math.floor(rand(1, 3))}/3`,
      dtEmissao: new Date(vencimento.getTime() - 30 * 86400000),
      dtVencimento: vencimento,
      tpSituacao: "N",
      tpDocumento: "NF",
      vlDuplicata: rand(500, 8000),
      vlOriginal: rand(500, 8000),
    });
  }
  // A vencer (próximos 45 dias)
  for (let i = 0; i < 12; i++) {
    const vencimento = dias(Math.floor(rand(1, 45)));
    contasPagar.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      fornecedor: pick(FORNECEDORES_PAGAR),
      nrDuplicata: `NF-${Math.floor(rand(1000, 9999))}`,
      nrParcela: `${Math.floor(rand(1, 3))}/3`,
      dtEmissao: new Date(vencimento.getTime() - 30 * 86400000),
      dtVencimento: vencimento,
      tpSituacao: "N",
      tpDocumento: "NF",
      vlDuplicata: rand(800, 12000),
      vlOriginal: rand(800, 12000),
    });
  }
  // Pagas (baixadas)
  for (let i = 0; i < 10; i++) {
    const vencimento = dias(-Math.floor(rand(5, 60)));
    const vlDup = rand(400, 7000);
    contasPagar.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      fornecedor: pick(FORNECEDORES_PAGAR),
      nrDuplicata: `NF-${Math.floor(rand(1000, 9999))}`,
      nrParcela: "1/1",
      dtEmissao: new Date(vencimento.getTime() - 30 * 86400000),
      dtVencimento: vencimento,
      dtBaixa: new Date(vencimento.getTime() + Math.floor(rand(-2, 5)) * 86400000),
      tpSituacao: "B",
      tpDocumento: "NF",
      tpBaixa: "N",
      vlDuplicata: vlDup,
      vlOriginal: vlDup,
      vlPago: vlDup,
    });
  }
  await prisma.contaPagar.createMany({ data: contasPagar });

  console.log(`${contasPagar.length} contas a pagar criadas. Criando contas a receber...`);

  // ── 5. CONTAS A RECEBER ────────────────────────────────────────────────────
  const contasReceber = [];
  // Vencidas
  for (let i = 0; i < 6; i++) {
    const vencimento = dias(-Math.floor(rand(1, 25)));
    contasReceber.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      nmCliente: pick(CLIENTES_RECEBER),
      nrFat: `FAT-${Math.floor(rand(1000, 9999))}`,
      nrParcela: `${Math.floor(rand(1, 3))}/3`,
      dtEmissao: new Date(vencimento.getTime() - 30 * 86400000),
      dtVencimento: vencimento,
      tpSituacao: "1",
      tpDocumento: "DUP",
      vlFatura: rand(300, 5000),
      vlOriginal: rand(300, 5000),
    });
  }
  // A vencer
  for (let i = 0; i < 15; i++) {
    const vencimento = dias(Math.floor(rand(1, 60)));
    contasReceber.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      nmCliente: pick(CLIENTES_RECEBER),
      nrFat: `FAT-${Math.floor(rand(1000, 9999))}`,
      nrParcela: `${Math.floor(rand(1, 3))}/3`,
      dtEmissao: new Date(vencimento.getTime() - 30 * 86400000),
      dtVencimento: vencimento,
      tpSituacao: "1",
      tpDocumento: "DUP",
      vlFatura: rand(500, 8000),
      vlOriginal: rand(500, 8000),
    });
  }
  // Recebidas
  for (let i = 0; i < 12; i++) {
    const vencimento = dias(-Math.floor(rand(5, 60)));
    const vlFat = rand(300, 6000);
    contasReceber.push({
      empresaId: empresa.id,
      loja: pick(LOJAS),
      nmCliente: pick(CLIENTES_RECEBER),
      nrFat: `FAT-${Math.floor(rand(1000, 9999))}`,
      nrParcela: "1/1",
      dtEmissao: new Date(vencimento.getTime() - 30 * 86400000),
      dtVencimento: vencimento,
      dtBaixa: new Date(vencimento.getTime() + Math.floor(rand(-1, 3)) * 86400000),
      tpSituacao: "2",
      tpDocumento: "DUP",
      tpBaixa: "N",
      vlFatura: vlFat,
      vlOriginal: vlFat,
      vlPago: vlFat,
    });
  }
  await prisma.contaReceber.createMany({ data: contasReceber });

  console.log(`${contasReceber.length} contas a receber criadas.`);
  console.log("\nFCM populada com sucesso!");
  console.log("  10 produtos no catálogo");
  console.log(`  ${10 * LOJAS.length} posições de estoque (${LOJAS.length} lojas)`);
  console.log("  Vendas dos últimos 60 dias (se não existiam)");
  console.log(`  ${contasPagar.length} contas a pagar`);
  console.log(`  ${contasReceber.length} contas a receber`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
