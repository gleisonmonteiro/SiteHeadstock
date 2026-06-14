import { prisma } from "@/lib/prisma";
import { obterKPIsDashboard } from "./dashboardService";

export async function gerarCardAbertura(empresaId: string) {
  const agora = new Date();
  const kpis = await obterKPIsDashboard(empresaId);

  const mensagem = `📊 *CARD DE ABERTURA - ${agora.toLocaleDateString("pt-BR")}*

💰 *Faturamento do Mês*: R$ ${kpis.faturamentoMes.toFixed(2)}
🎯 *Meta Mensal*: R$ ${kpis.metaMensal.toFixed(2)}
📈 *Percentual da Meta*: ${kpis.percentualMetaBatida.toFixed(1)}%
❌ *Falta Vender*: R$ ${kpis.faltaVender.toFixed(2)}

💼 *Venda Diária até fim do mês*: R$ ${kpis.vendaDiariaAteFinsMes.toFixed(2)}
🏆 *Melhor Vendedor*: ${kpis.melhorVendedorMes?.vendedor || "N/A"} (R$ ${(kpis.melhorVendedorMes?.valor || 0).toFixed(2)})
⭐ *Ticket Médio*: R$ ${kpis.ticketMedioMes.toFixed(2)}

Headstock — inteligência gerencial para decisões melhores.`;

  return prisma.cardExecutivo.create({
    data: {
      empresaId,
      tipo: "abertura",
      dataReferencia: agora,
      mensagem,
    },
  });
}

export async function gerarCardFechamento(empresaId: string) {
  const agora = new Date();
  
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

  const faturamentoDia = vendasDia.reduce((sum: number, v: any) => sum + v.valorVenda, 0);
  const quantidadeDia = vendasDia.length;
  const ticketMedioDia = quantidadeDia > 0 ? faturamentoDia / quantidadeDia : 0;

  // Meta diária (simplificada)
  const metaMensal = await prisma.meta.findFirst({
    where: {
      empresaId,
      mes: agora.getMonth() + 1,
      ano: agora.getFullYear(),
    },
  });

  const diasMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate();
  const metaDiaria = metaMensal ? metaMensal.valorMeta / diasMes : 0;
  const diferenca = faturamentoDia - metaDiaria;

  // Vendedor destaque do dia
  const vendedoresDia = new Map<string, number>();
  vendasDia.forEach((v: any) => {
    const atual = vendedoresDia.get(v.vendedor) || 0;
    vendedoresDia.set(v.vendedor, atual + v.valorVenda);
  });

  let vendedorDestaque = "N/A";
  if (vendedoresDia.size > 0) {
    const [vendedor] = Array.from(vendedoresDia.entries()).reduce(
      (prev: [string, number], curr: [string, number]) => (curr[1] > prev[1] ? curr : prev)
    );
    vendedorDestaque = vendedor;
  }

  // Produto destaque
  const produtosDia = new Map<string, number>();
  vendasDia.forEach((v: any) => {
    const atual = produtosDia.get(v.produto) || 0;
    produtosDia.set(v.produto, atual + v.valorVenda);
  });

  let produtoDestaque = "N/A";
  if (produtosDia.size > 0) {
    const [produto] = Array.from(produtosDia.entries()).reduce(
      (prev: [string, number], curr: [string, number]) => (curr[1] > prev[1] ? curr : prev)
    );
    produtoDestaque = produto;
  }

  const mensagem = `📊 *CARD DE FECHAMENTO - ${agora.toLocaleDateString("pt-BR")}*

💰 *Faturamento do Dia*: R$ ${faturamentoDia.toFixed(2)}
🛍️ *Quantidade de Vendas*: ${quantidadeDia}
💳 *Ticket Médio do Dia*: R$ ${ticketMedioDia.toFixed(2)}

🎯 *Meta Diária*: R$ ${metaDiaria.toFixed(2)}
📈 *Diferença*: ${diferenca >= 0 ? "✅" : "⚠️"} R$ ${Math.abs(diferenca).toFixed(2)}

🏆 *Vendedor Destaque*: ${vendedorDestaque}
⭐ *Produto Destaque*: ${produtoDestaque}

Headstock — inteligência gerencial para decisões melhores.`;

  return prisma.cardExecutivo.create({
    data: {
      empresaId,
      tipo: "fechamento",
      dataReferencia: agora,
      mensagem,
    },
  });
}

export async function obterCardsExecutivos(empresaId: string, tipo?: string) {
  return prisma.cardExecutivo.findMany({
    where: {
      empresaId,
      ...(tipo && { tipo }),
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
}
