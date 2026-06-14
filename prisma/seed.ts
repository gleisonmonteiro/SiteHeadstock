/**
 * Seed de dados de TESTE para o Headstock.
 * Roda com: npx tsx prisma/seed.ts   (ou npx prisma db seed)
 *
 * Cria: 1 empresa, 1 usuário ativo, 3 vendedores, 6 produtos,
 * ~80 vendas (maio + junho), metas da empresa e metas por vendedor.
 * É idempotente: se a empresa "Headstock Demo" já existir, apaga e recria tudo.
 */
import "dotenv/config";
import { Prisma, PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const EMPRESA_NOME = "Headstock Demo";
const USUARIO_EMAIL = "gleison@headstock.com";
const USUARIO_SENHA = "123456";

const VENDEDORES = ["Ana Souza", "Bruno Lima", "Carla Mendes"];

const PRODUTOS = [
  { nome: "Guitarra Elétrica HS-1", categoria: "Instrumentos", marca: "Headstock", preco: 2500 },
  { nome: "Violão Folk HS Acoustic", categoria: "Instrumentos", marca: "Headstock", preco: 1200 },
  { nome: "Amplificador HS 30W", categoria: "Amplificação", marca: "Headstock", preco: 900 },
  { nome: "Pedal Overdrive HS-OD", categoria: "Pedais", marca: "Headstock", preco: 450 },
  { nome: "Jogo de Cordas .010", categoria: "Acessórios", marca: "D'Art", preco: 45 },
  { nome: "Capotraste RB", categoria: "Acessórios", marca: "D'Art", preco: 60 },
];

const CLIENTES = [
  "João Pereira", "Maria Oliveira", "Pedro Santos", "Lucas Costa",
  "Fernanda Alves", "Rafael Gomes", "Juliana Rocha", "Marcos Dias",
];

const FORMAS_PAGAMENTO = ["Pix", "Cartão Crédito", "Cartão Débito", "Dinheiro"];
const LOJAS = ["Loja Centro", "Loja Online"];

// Pseudo-aleatório determinístico (mesmos dados a cada execução)
let semente = 42;
function rand(): number {
  semente = (semente * 1103515245 + 12345) % 2147483648;
  return semente / 2147483648;
}
function escolher<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

async function main() {
  // Idempotência: remove a empresa de teste anterior (cascade apaga o resto)
  const existente = await prisma.empresa.findFirst({
    where: { nome: EMPRESA_NOME },
  });
  if (existente) {
    await prisma.empresa.delete({ where: { id: existente.id } });
    console.log("Empresa de teste anterior removida (e dados em cascata).");
  }

  // 1. Empresa
  const empresa = await prisma.empresa.create({
    data: {
      nome: EMPRESA_NOME,
      slug: "headstock-demo",
      tipo: "VAREJO",
    },
  });

  // 2. Usuário ativo com senha conhecida
  const senhaHash = await bcrypt.hash(USUARIO_SENHA, 10);
  await prisma.usuario.create({
    data: {
      nome: "Gleison Monteiro",
      email: USUARIO_EMAIL,
      senhaHash,
      status: "ativo",
      papel: "COMPANY_OWNER",
      empresaId: empresa.id,
    },
  });

  // 3. Upload "de origem" das vendas de teste
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mesAtual = hoje.getMonth(); // 0-based (junho = 5)
  const mesAnterior = mesAtual - 1;

  const vendas: Array<
    Omit<Prisma.VendaCreateManyInput, "empresaId" | "uploadId">
  > = [];
  for (let i = 0; i < 80; i++) {
    const produto = escolher(PRODUTOS);
    // ~55% das vendas no mês atual, o resto no mês anterior
    const usarMesAtual = rand() < 0.55;
    const mes = usarMesAtual ? mesAtual : mesAnterior;
    const ultimoDia = usarMesAtual
      ? hoje.getDate() // até hoje
      : new Date(ano, mesAnterior + 1, 0).getDate();
    const dia = 1 + Math.floor(rand() * ultimoDia);
    const hora = 9 + Math.floor(rand() * 10);
    const quantidade = produto.preco > 500 ? 1 : 1 + Math.floor(rand() * 3);
    const desconto = rand() < 0.3 ? Math.round(produto.preco * 0.05) : 0;
    const valorVenda = produto.preco * quantidade - desconto;
    const loja = escolher(LOJAS);

    vendas.push({
      dataVenda: new Date(ano, mes, dia, hora, Math.floor(rand() * 60)),
      valorVenda,
      produto: produto.nome,
      quantidade,
      vendedor: escolher(VENDEDORES),
      cliente: escolher(CLIENTES),
      formaPagamento: escolher(FORMAS_PAGAMENTO),
      categoria: produto.categoria,
      marca: produto.marca,
      custo: Math.round(produto.preco * 0.6) * quantidade,
      loja,
      canalVenda: loja === "Loja Online" ? "online" : "loja_fisica",
      desconto,
    });
  }

  const upload = await prisma.upload.create({
    data: {
      empresaId: empresa.id,
      nomeArquivo: "seed-dados-iniciais.xlsx",
      tipo: "vendas",
      status: "sucesso",
      totalLinhas: vendas.length,
      linhasImportadas: vendas.length,
      linhasErro: 0,
    },
  });

  await prisma.venda.createMany({
    data: vendas.map((v) => ({
      ...v,
      empresaId: empresa.id,
      uploadId: upload.id,
    })),
  });

  // 4. Metas da empresa (mês anterior e mês atual)
  await prisma.meta.createMany({
    data: [
      { empresaId: empresa.id, mes: mesAnterior + 1, ano, valorMeta: 85000 },
      { empresaId: empresa.id, mes: mesAtual + 1, ano, valorMeta: 95000 },
    ],
  });

  // 5. Metas por vendedor
  const metasVendedor: Prisma.MetaVendedorCreateManyInput[] = [];
  for (const vendedor of VENDEDORES) {
    metasVendedor.push(
      { empresaId: empresa.id, vendedor, mes: mesAnterior + 1, ano, valorMeta: 28000 },
      { empresaId: empresa.id, vendedor, mes: mesAtual + 1, ano, valorMeta: 31000 }
    );
  }
  await prisma.metaVendedor.createMany({ data: metasVendedor });

  const totalVendas = await prisma.venda.count({
    where: { empresaId: empresa.id },
  });

  console.log("✅ Seed concluído!");
  console.log(`   Empresa:   ${EMPRESA_NOME} (id: ${empresa.id})`);
  console.log(`   Usuário:   ${USUARIO_EMAIL}`);
  console.log(`   Senha:     ${USUARIO_SENHA}`);
  console.log(`   Vendas:    ${totalVendas}`);
  console.log(`   Vendedores: ${VENDEDORES.join(", ")}`);
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
