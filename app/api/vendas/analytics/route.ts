import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const empresaId = usuario.empresaId;

    const agora = new Date();
    const mesAtual = agora.getMonth() + 1;
    const anoAtual = agora.getFullYear();

    const inicioMes = new Date(anoAtual, mesAtual - 1, 1);
    const inicioMesAnoAnt = new Date(anoAtual - 1, mesAtual - 1, 1);
    const fimMesAnoAnt = new Date(anoAtual - 1, mesAtual, 0, 23, 59, 59, 999);

    const hoje = new Date(anoAtual, agora.getMonth(), agora.getDate());
    const amanha = new Date(anoAtual, agora.getMonth(), agora.getDate() + 1);
    const ontem = new Date(anoAtual, agora.getMonth(), agora.getDate() - 1);

    const dow = agora.getDay();
    const diasParaSegunda = dow === 0 ? 6 : dow - 1;
    const inicioSemana = new Date(anoAtual, agora.getMonth(), agora.getDate() - diasParaSegunda);
    const inicioSemanaPassada = new Date(inicioSemana.getTime() - 7 * 86400000);
    const fimSemanaPassada = new Date(inicioSemana.getTime() - 1);

    const inicio90 = new Date(agora.getTime() - 90 * 86400000);
    const inicio90AnoAnt = new Date(inicio90.getTime() - 365 * 86400000);
    const fim90AnoAnt = new Date(agora.getTime() - 365 * 86400000);

    const [vendasRecentes, vendasMesAnoAnt, vendas90AnoAnt, metaMes, metasVend] = await Promise.all([
      prisma.venda.findMany({
        where: { empresaId, dataVenda: { gte: inicio90 } },
        select: { dataVenda: true, valorVenda: true, vendedor: true, cliente: true, quantidade: true },
        orderBy: { dataVenda: "asc" },
      }),
      prisma.venda.findMany({
        where: { empresaId, dataVenda: { gte: inicioMesAnoAnt, lte: fimMesAnoAnt } },
        select: { valorVenda: true },
      }),
      prisma.venda.findMany({
        where: { empresaId, dataVenda: { gte: inicio90AnoAnt, lte: fim90AnoAnt } },
        select: { dataVenda: true, valorVenda: true },
      }),
      prisma.meta.findFirst({ where: { empresaId, mes: mesAtual, ano: anoAtual } }),
      prisma.metaVendedor.findMany({ where: { empresaId, mes: mesAtual, ano: anoAtual } }),
    ]);

    // KPIs do mês atual (filtrado do range de 90 dias)
    const vendasMes = vendasRecentes.filter((v) => v.dataVenda >= inicioMes);
    const faturamentoMes = vendasMes.reduce((s, v) => s + v.valorVenda, 0);
    const qtdMes = vendasMes.length;
    const ticketMedio = qtdMes > 0 ? faturamentoMes / qtdMes : 0;

    const fatMesAnoAnt = vendasMesAnoAnt.reduce((s, v) => s + v.valorVenda, 0);
    const variacaoAnual =
      fatMesAnoAnt > 0
        ? Math.round(((faturamentoMes - fatMesAnoAnt) / fatMesAnoAnt) * 1000) / 10
        : null;

    // Comparações rápidas
    const vendasHoje = vendasRecentes
      .filter((v) => v.dataVenda >= hoje && v.dataVenda < amanha)
      .reduce((s, v) => s + v.valorVenda, 0);
    const qtdHoje = vendasRecentes.filter(
      (v) => v.dataVenda >= hoje && v.dataVenda < amanha
    ).length;
    const vendasOntem = vendasRecentes
      .filter((v) => v.dataVenda >= ontem && v.dataVenda < hoje)
      .reduce((s, v) => s + v.valorVenda, 0);
    const variacaoHoje =
      vendasOntem > 0
        ? Math.round(((vendasHoje - vendasOntem) / vendasOntem) * 1000) / 10
        : null;

    const vendasSemana = vendasRecentes
      .filter((v) => v.dataVenda >= inicioSemana)
      .reduce((s, v) => s + v.valorVenda, 0);
    const vendasSemanaPassada = vendasRecentes
      .filter((v) => v.dataVenda >= inicioSemanaPassada && v.dataVenda <= fimSemanaPassada)
      .reduce((s, v) => s + v.valorVenda, 0);
    const variacaoSemana =
      vendasSemanaPassada > 0
        ? Math.round(((vendasSemana - vendasSemanaPassada) / vendasSemanaPassada) * 1000) / 10
        : null;

    // Meta mensal
    const metaMensal = metaMes?.valorMeta ?? 0;
    const pctMeta = metaMensal > 0 ? Math.round((faturamentoMes / metaMensal) * 100) : 0;

    // Tendência 90 dias: série diária com comparação ao ano anterior
    const por90Dia = new Map<string, number>();
    for (let i = 0; i < 90; i++) {
      const d = new Date(inicio90.getTime() + i * 86400000);
      por90Dia.set(d.toISOString().slice(0, 10), 0);
    }
    vendasRecentes.forEach((v) => {
      const k = v.dataVenda.toISOString().slice(0, 10);
      if (por90Dia.has(k)) por90Dia.set(k, (por90Dia.get(k)!) + v.valorVenda);
    });
    const porAnoAnt = new Map<string, number>();
    vendas90AnoAnt.forEach((v) => {
      const shifted = new Date(v.dataVenda.getTime() + 365 * 86400000);
      const k = shifted.toISOString().slice(0, 10);
      porAnoAnt.set(k, (porAnoAnt.get(k) ?? 0) + v.valorVenda);
    });
    const tendencia90Dias = Array.from(por90Dia.entries()).map(([data, valor]) => ({
      data: data.slice(5),
      atual: Math.round(valor),
      anterior: Math.round(porAnoAnt.get(data) ?? 0),
    }));

    // Faturamento por dia da semana (últimos 90 dias)
    const nomesDia = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const somaDia = [0, 0, 0, 0, 0, 0, 0];
    const contDia = [0, 0, 0, 0, 0, 0, 0];
    vendasRecentes.forEach((v) => {
      const d = v.dataVenda.getDay();
      somaDia[d] += v.valorVenda;
      contDia[d]++;
    });
    // Reordenar: Seg a Dom
    const faturamentoDiaSemana = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
      dia: nomesDia[d],
      valor: Math.round(somaDia[d]),
      qtd: contDia[d],
    }));

    // Ranking de clientes (top 10, últimos 90 dias)
    const porCliente = new Map<string, { valor: number; qtd: number; ultima: Date }>();
    vendasRecentes.forEach((v) => {
      const key = v.cliente ?? "Sem identificação";
      const cur = porCliente.get(key);
      if (!cur) {
        porCliente.set(key, { valor: v.valorVenda, qtd: 1, ultima: v.dataVenda });
      } else {
        cur.valor += v.valorVenda;
        cur.qtd++;
        if (v.dataVenda > cur.ultima) cur.ultima = v.dataVenda;
      }
    });
    const rankingClientes = Array.from(porCliente.entries())
      .map(([cliente, { valor, qtd, ultima }]) => ({
        cliente,
        valor: Math.round(valor),
        qtd,
        diasSemVenda: Math.floor((agora.getTime() - ultima.getTime()) / 86400000),
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    // Desempenho vendedores vs meta (mês atual)
    const porVendedor = new Map<string, { valor: number; qtd: number }>();
    vendasMes.forEach((v) => {
      const cur = porVendedor.get(v.vendedor);
      if (!cur) porVendedor.set(v.vendedor, { valor: v.valorVenda, qtd: 1 });
      else { cur.valor += v.valorVenda; cur.qtd++; }
    });
    const desempenhoVendedores = Array.from(porVendedor.entries())
      .map(([vendedor, { valor, qtd }]) => {
        const meta = metasVend.find((m) => m.vendedor === vendedor)?.valorMeta ?? 0;
        return {
          vendedor,
          realizado: Math.round(valor),
          meta: Math.round(meta),
          pct: meta > 0 ? Math.round((valor / meta) * 100) : null,
          qtd,
        };
      })
      .sort((a, b) => b.realizado - a.realizado);

    return NextResponse.json({
      faturamentoMes: Math.round(faturamentoMes),
      faturamentoMesAnoAnterior: Math.round(fatMesAnoAnt),
      variacaoAnual,
      ticketMedio: Math.round(ticketMedio),
      qtdVendas: qtdMes,
      qtdHoje,
      vendasHoje: Math.round(vendasHoje),
      vendasOntem: Math.round(vendasOntem),
      variacaoHoje,
      vendasSemana: Math.round(vendasSemana),
      vendasSemanaPassada: Math.round(vendasSemanaPassada),
      variacaoSemana,
      metaMensal: Math.round(metaMensal),
      pctMeta,
      tendencia90Dias,
      faturamentoDiaSemana,
      rankingClientes,
      desempenhoVendedores,
    });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter analytics de vendas");
  }
}
