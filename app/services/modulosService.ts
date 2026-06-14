import { prisma } from "@/lib/prisma";

const hoje = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const daqui = (dias: number) => {
  const d = hoje();
  d.setDate(d.getDate() + dias);
  return d;
};

function arred(v: number, casas = 2) {
  return Math.round(v * 10 ** casas) / 10 ** casas;
}
function pct(p: number, t: number) {
  return t > 0 ? arred((p / t) * 100) : 0;
}

// ── Produtos ──────────────────────────────────────────────────────────────────
export async function kpisProdutos(empresaId: string) {
  const [total, semClasse, comPreco, recentes] = await Promise.all([
    prisma.produtoCatalogo.count({ where: { empresaId } }),
    prisma.produtoCatalogo.count({
      where: { empresaId, OR: [{ marca: null }, { grupo: null }] },
    }),
    prisma.produtoCatalogo.findMany({
      where: { empresaId, vlVenda: { not: null }, vlCusto: { not: null } },
      select: { vlVenda: true, vlCusto: true },
    }),
    prisma.produtoCatalogo.count({
      where: { empresaId, createdAt: { gte: daqui(-30) } },
    }),
  ]);

  let markupTotal = 0;
  let margemPotencial = 0;
  for (const p of comPreco) {
    const markup = ((p.vlVenda! - p.vlCusto!) / p.vlCusto!) * 100;
    markupTotal += markup;
    margemPotencial += p.vlVenda! - p.vlCusto!;
  }
  const markupMedio = comPreco.length > 0 ? arred(markupTotal / comPreco.length) : 0;

  const comGrade = await prisma.produtoCatalogo.count({
    where: { empresaId, cor: { not: null }, tamanho: { not: null } },
  });

  return {
    skusAtivos: total,
    semClassificacao: semClasse,
    markupMedio,
    margemPotencial: arred(margemPotencial),
    coberturaGrade: pct(comGrade, total),
    cadastrosRecentes: recentes,
    temDados: total > 0,
  };
}

// ── Estoque ───────────────────────────────────────────────────────────────────
export async function kpisEstoque(empresaId: string) {
  // Posição mais recente
  const ultimaData = await prisma.itemEstoque.findFirst({
    where: { empresaId },
    orderBy: { dataRef: "desc" },
    select: { dataRef: true },
  });

  if (!ultimaData) {
    return { temDados: false, valorEstoque: 0, unidades: 0, rupturas: 0, estoqueParado: 0, excesso: 0, dataRef: null };
  }

  const itens = await prisma.itemEstoque.findMany({
    where: { empresaId, dataRef: ultimaData.dataRef },
    select: {
      cdProduto: true,
      loja: true,
      estoque: true,
      vlVenda: true,
      vlCusto: true,
      produto: {
        select: {
          referencia: true,
          descricao: true,
          marca: true,
          grupo: true,
        },
      },
    },
  });

  let valorEstoque = 0;
  let valorEstoqueVarejo = 0;
  let unidades = 0;
  let rupturas = 0;
  let excesso = 0;
  const dimensoes = {
    loja: new Map<string, { quantidade: number; custo: number; varejo: number; rupturas: number; posicoes: number }>(),
    marca: new Map<string, number>(),
    grupo: new Map<string, number>(),
    referencia: new Map<string, number>(),
  };

  for (const item of itens) {
    unidades += item.estoque;
    valorEstoque += item.estoque * (item.vlCusto ?? item.vlVenda ?? 0);
    valorEstoqueVarejo += item.estoque * (item.vlVenda ?? 0);
    if (item.estoque === 0) rupturas++;
    if (item.estoque > 30) excesso++;

    const loja = item.loja ?? "Sem filial";
    const atualLoja = dimensoes.loja.get(loja) ?? {
      quantidade: 0,
      custo: 0,
      varejo: 0,
      rupturas: 0,
      posicoes: 0,
    };
    atualLoja.quantidade += item.estoque;
    atualLoja.custo += item.estoque * (item.vlCusto ?? item.vlVenda ?? 0);
    atualLoja.varejo += item.estoque * (item.vlVenda ?? 0);
    atualLoja.rupturas += item.estoque === 0 ? 1 : 0;
    atualLoja.posicoes++;
    dimensoes.loja.set(loja, atualLoja);

    const marca = item.produto?.marca ?? "Sem marca";
    const grupo = item.produto?.grupo ?? "Sem grupo";
    const referencia =
      item.produto?.referencia ??
      item.produto?.descricao ??
      item.cdProduto;
    dimensoes.marca.set(marca, (dimensoes.marca.get(marca) ?? 0) + item.estoque);
    dimensoes.grupo.set(grupo, (dimensoes.grupo.get(grupo) ?? 0) + item.estoque);
    dimensoes.referencia.set(
      referencia,
      (dimensoes.referencia.get(referencia) ?? 0) + item.estoque,
    );
  }

  const totalPosicoes = itens.length;
  const ordenarMapa = (mapa: Map<string, number>) =>
    Array.from(mapa.entries())
      .map(([nome, valor]) => ({ nome, valor: arred(valor) }))
      .sort((a, b) => b.valor - a.valor);

  return {
    temDados: true,
    valorEstoque: arred(valorEstoque),
    valorEstoqueVarejo: arred(valorEstoqueVarejo),
    unidades: Math.round(unidades),
    rupturas,
    rupturasPct: pct(rupturas, totalPosicoes),
    excesso,
    dataRef: ultimaData.dataRef,
    totalPosicoes,
    precoMedioCusto: unidades > 0 ? arred(valorEstoque / unidades) : 0,
    precoMedioVarejo: unidades > 0 ? arred(valorEstoqueVarejo / unidades) : 0,
    porLoja: Array.from(dimensoes.loja.entries())
      .map(([nome, item]) => ({
        nome,
        quantidade: arred(item.quantidade),
        custo: arred(item.custo),
        varejo: arred(item.varejo),
        precoMedioCusto: item.quantidade > 0 ? arred(item.custo / item.quantidade) : 0,
        precoMedioVarejo: item.quantidade > 0 ? arred(item.varejo / item.quantidade) : 0,
        rupturas: item.rupturas,
        rupturasPct: pct(item.rupturas, item.posicoes),
      }))
      .sort((a, b) => b.quantidade - a.quantidade),
    porMarca: ordenarMapa(dimensoes.marca),
    porGrupo: ordenarMapa(dimensoes.grupo),
    porReferencia: ordenarMapa(dimensoes.referencia).slice(0, 20),
  };
}

// ── Contas a Pagar ────────────────────────────────────────────────────────────
export async function kpisContasPagar(empresaId: string) {
  const agora = hoje();
  const em30 = daqui(30);

  const [abertas, vencidas, a30, pagas] = await Promise.all([
    prisma.contaPagar.aggregate({
      where: { empresaId, tpSituacao: "N" },
      _sum: { vlDuplicata: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, tpSituacao: "N", dtVencimento: { lt: agora } },
      _sum: { vlDuplicata: true },
      _count: true,
    }),
    prisma.contaPagar.aggregate({
      where: {
        empresaId, tpSituacao: "N",
        dtVencimento: { gte: agora, lte: em30 },
      },
      _sum: { vlDuplicata: true },
    }),
    prisma.contaPagar.aggregate({
      where: { empresaId, tpSituacao: "B" },
      _sum: { vlPago: true },
      _count: true,
    }),
  ]);

  // Fornecedor com maior exposição
  const porFornecedor = await prisma.contaPagar.groupBy({
    by: ["fornecedor"],
    where: { empresaId, tpSituacao: "N" },
    _sum: { vlDuplicata: true },
    orderBy: { _sum: { vlDuplicata: "desc" } },
    take: 1,
  });

  const saldoPagar = abertas._sum.vlDuplicata ?? 0;
  const vencidoValor = vencidas._sum.vlDuplicata ?? 0;

  return {
    temDados: abertas._count > 0 || pagas._count > 0,
    saldoPagar: arred(saldoPagar),
    vencido: arred(vencidoValor),
    vencidoPct: pct(vencidoValor, saldoPagar),
    aVencer30: arred(a30._sum.vlDuplicata ?? 0),
    totalTitulos: abertas._count,
    titulosVencidos: vencidas._count,
    maiorFornecedor: porFornecedor[0]
      ? { nome: porFornecedor[0].fornecedor, valor: arred(porFornecedor[0]._sum.vlDuplicata ?? 0) }
      : null,
    totalPago: arred(pagas._sum.vlPago ?? 0),
  };
}

// ── Contas a Receber ──────────────────────────────────────────────────────────
export async function kpisContasReceber(empresaId: string) {
  const agora = hoje();
  const em30 = daqui(30);

  const [abertas, vencidas, a30, recebidas] = await Promise.all([
    prisma.contaReceber.aggregate({
      where: { empresaId, tpSituacao: "1" },
      _sum: { vlFatura: true },
      _count: true,
    }),
    prisma.contaReceber.aggregate({
      where: { empresaId, tpSituacao: "1", dtVencimento: { lt: agora } },
      _sum: { vlFatura: true },
      _count: true,
    }),
    prisma.contaReceber.aggregate({
      where: {
        empresaId, tpSituacao: "1",
        dtVencimento: { gte: agora, lte: em30 },
      },
      _sum: { vlFatura: true },
    }),
    prisma.contaReceber.aggregate({
      where: { empresaId, tpSituacao: "2" },
      _sum: { vlPago: true },
      _count: true,
    }),
  ]);

  const porCliente = await prisma.contaReceber.groupBy({
    by: ["nmCliente"],
    where: { empresaId, tpSituacao: "1" },
    _sum: { vlFatura: true },
    orderBy: { _sum: { vlFatura: "desc" } },
    take: 1,
  });

  const saldoReceber = abertas._sum.vlFatura ?? 0;
  const vencidoValor = vencidas._sum.vlFatura ?? 0;

  return {
    temDados: abertas._count > 0 || recebidas._count > 0,
    saldoReceber: arred(saldoReceber),
    vencido: arred(vencidoValor),
    inadimplenciaPct: pct(vencidoValor, saldoReceber),
    aVencer30: arred(a30._sum.vlFatura ?? 0),
    totalTitulos: abertas._count,
    titulosVencidos: vencidas._count,
    maiorCliente: porCliente[0]
      ? { nome: porCliente[0].nmCliente, valor: arred(porCliente[0]._sum.vlFatura ?? 0) }
      : null,
    totalRecebido: arred(recebidas._sum.vlPago ?? 0),
  };
}
