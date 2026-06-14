import { prisma } from "@/lib/prisma";

export interface DashboardKPIs {
  faturamentoMes: number;
  vendasDia: number;
  quantidadeVendasMes: number;
  ticketMedioMes: number;
  metaMensal: number;
  percentualMetaBatida: number;
  faltaVender: number;
  vendaDiariaAteFinsMes: number;
  melhorVendedorMes: { vendedor: string; valor: number } | null;
  vendedoresAbaixoMeta: Array<{ vendedor: string; meta: number; realizado: number; percentual: number }>;
}

export async function obterKPIsDashboard(
  empresaId: string
): Promise<DashboardKPIs> {
  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const ultimoDiaMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0);

  // Vendas do mês
  const vendasMes = await prisma.venda.findMany({
    where: {
      empresaId,
      dataVenda: {
        gte: primeiroDiaMes,
        lte: ultimoDiaMes,
      },
    },
  });

  // Vendas do dia
  const primeiroDiaDia = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate()
  );
  const ultimoDiaDia = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    agora.getDate() + 1
  );

  const vendasDia = await prisma.venda.findMany({
    where: {
      empresaId,
      dataVenda: {
        gte: primeiroDiaDia,
        lte: ultimoDiaDia,
      },
    },
  });

  const faturamentoMes = vendasMes.reduce((sum, v) => sum + v.valorVenda, 0);
  const faturamentoDia = vendasDia.reduce((sum, v) => sum + v.valorVenda, 0);
  const quantidadeVendasMes = vendasMes.length;
  const ticketMedioMes = quantidadeVendasMes > 0 ? faturamentoMes / quantidadeVendasMes : 0;

  // Meta mensal
  const meta = await prisma.meta.findFirst({
    where: {
      empresaId,
      mes: agora.getMonth() + 1,
      ano: agora.getFullYear(),
    },
  });

  const metaMensal = meta?.valorMeta || 0;
  const percentualMetaBatida = metaMensal > 0 ? (faturamentoMes / metaMensal) * 100 : 0;
  const faltaVender = Math.max(0, metaMensal - faturamentoMes);

  // Dias úteis restantes
  const diasResto = ultimoDiaMes.getDate() - agora.getDate();
  const vendaDiariaAteFinsMes = diasResto > 0 ? faltaVender / diasResto : 0;

  // Melhor vendedor
  const vendedoresMes = new Map<string, number>();
  vendasMes.forEach((venda) => {
    const atual = vendedoresMes.get(venda.vendedor) || 0;
    vendedoresMes.set(venda.vendedor, atual + venda.valorVenda);
  });

  let melhorVendedorMes: { vendedor: string; valor: number } | null = null;
  if (vendedoresMes.size > 0) {
    const [vendedor, valor] = Array.from(vendedoresMes.entries()).reduce((prev, curr) =>
      curr[1] > prev[1] ? curr : prev
    );
    melhorVendedorMes = { vendedor, valor };
  }

  // Vendedores abaixo da meta
  const metasVendedor = await prisma.metaVendedor.findMany({
    where: {
      empresaId,
      mes: agora.getMonth() + 1,
      ano: agora.getFullYear(),
    },
  });

  const vendedoresAbaixoMeta = metasVendedor
    .map((mv) => {
      const realizado = vendedoresMes.get(mv.vendedor) || 0;
      return {
        vendedor: mv.vendedor,
        meta: mv.valorMeta,
        realizado,
        percentual: (realizado / mv.valorMeta) * 100,
      };
    })
    .filter((v) => v.percentual < 100);

  return {
    faturamentoMes,
    vendasDia: faturamentoDia,
    quantidadeVendasMes,
    ticketMedioMes,
    metaMensal,
    percentualMetaBatida,
    faltaVender,
    vendaDiariaAteFinsMes,
    melhorVendedorMes,
    vendedoresAbaixoMeta,
  };
}

export async function obterVendasPorDia(empresaId: string) {
  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const vendas = await prisma.venda.findMany({
    where: {
      empresaId,
      dataVenda: {
        gte: primeiroDiaMes,
        lte: agora,
      },
    },
    orderBy: { dataVenda: "asc" },
  });

  const vendaspPorDia = new Map<string, number>();
  vendas.forEach((venda) => {
    const data = venda.dataVenda.toISOString().split("T")[0];
    const atual = vendaspPorDia.get(data) || 0;
    vendaspPorDia.set(data, atual + venda.valorVenda);
  });

  return Array.from(vendaspPorDia.entries()).map(([data, valor]) => ({
    data,
    valor,
  }));
}

export async function obterTop10Produtos(empresaId: string) {
  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const vendas = await prisma.venda.findMany({
    where: {
      empresaId,
      dataVenda: {
        gte: primeiroDiaMes,
        lte: agora,
      },
    },
  });

  const produtosMap = new Map<string, number>();
  vendas.forEach((venda) => {
    const atual = produtosMap.get(venda.produto) || 0;
    produtosMap.set(venda.produto, atual + venda.valorVenda);
  });

  return Array.from(produtosMap.entries())
    .map(([produto, valor]) => ({ produto, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);
}

export async function obterVendasPorVendedor(empresaId: string) {
  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const vendas = await prisma.venda.findMany({
    where: {
      empresaId,
      dataVenda: {
        gte: primeiroDiaMes,
        lte: agora,
      },
    },
  });

  const vendedoresMap = new Map<string, number>();
  vendas.forEach((venda) => {
    const atual = vendedoresMap.get(venda.vendedor) || 0;
    vendedoresMap.set(venda.vendedor, atual + venda.valorVenda);
  });

  return Array.from(vendedoresMap.entries())
    .map(([vendedor, valor]) => ({ vendedor, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export async function obterVendasPorFormaPagamento(empresaId: string) {
  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const vendas = await prisma.venda.findMany({
    where: {
      empresaId,
      dataVenda: {
        gte: primeiroDiaMes,
        lte: agora,
      },
      formaPagamento: { not: null },
    },
  });

  const formasMap = new Map<string, number>();
  vendas.forEach((venda) => {
    if (venda.formaPagamento) {
      const atual = formasMap.get(venda.formaPagamento) || 0;
      formasMap.set(venda.formaPagamento, atual + venda.valorVenda);
    }
  });

  return Array.from(formasMap.entries()).map(([forma, valor]) => ({
    forma,
    valor,
  }));
}

export async function obterVendasPorCategoria(empresaId: string) {
  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const vendas = await prisma.venda.findMany({
    where: {
      empresaId,
      dataVenda: {
        gte: primeiroDiaMes,
        lte: agora,
      },
      categoria: { not: null },
    },
  });

  const categoriasMap = new Map<string, number>();
  vendas.forEach((venda) => {
    if (venda.categoria) {
      const atual = categoriasMap.get(venda.categoria) || 0;
      categoriasMap.set(venda.categoria, atual + venda.valorVenda);
    }
  });

  return Array.from(categoriasMap.entries()).map(([categoria, valor]) => ({
    categoria,
    valor,
  }));
}
