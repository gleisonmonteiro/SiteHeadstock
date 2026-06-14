import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { exigirAcessoDecisao } from "@/lib/access";
import { prisma } from "@/lib/prisma";

type VendaAnalitica = {
  dataVenda: Date;
  valorVenda: number;
  quantidade: number;
  vendedor: string;
  cliente: string | null;
  produto: string;
  categoria: string | null;
  marca: string | null;
  loja: string | null;
  custo: number | null;
  desconto: number | null;
};

function arredondar(valor: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function percentual(parte: number, total: number) {
  return total > 0 ? arredondar((parte / total) * 100, 1) : 0;
}

function chaveMes(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function agregar(
  vendas: VendaAnalitica[],
  chave: (venda: VendaAnalitica) => string,
) {
  const mapa = new Map<
    string,
    { valor: number; quantidade: number; transacoes: number; custo: number; clientes: Set<string> }
  >();

  for (const venda of vendas) {
    const nome = chave(venda) || "Não informado";
    const atual = mapa.get(nome) ?? {
      valor: 0,
      quantidade: 0,
      transacoes: 0,
      custo: 0,
      clientes: new Set<string>(),
    };
    atual.valor += venda.valorVenda;
    atual.quantidade += venda.quantidade;
    atual.transacoes++;
    atual.custo += venda.custo ?? 0;
    if (venda.cliente) atual.clientes.add(venda.cliente);
    mapa.set(nome, atual);
  }

  return Array.from(mapa.entries())
    .map(([nome, item]) => ({
      nome,
      valor: arredondar(item.valor),
      quantidade: item.quantidade,
      transacoes: item.transacoes,
      ticketMedio: arredondar(item.valor / Math.max(item.transacoes, 1)),
      precoMedio: arredondar(item.valor / Math.max(item.quantidade, 1)),
      clientes: item.clientes.size,
      custo: arredondar(item.custo),
      custoPct: percentual(item.custo, item.valor),
    }))
    .sort((a, b) => b.valor - a.valor);
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);

    const agora = new Date();
    const periodo = request.nextUrl.searchParams.get("periodo") ?? "90";
    const dias = periodo === "365" ? 365 : periodo === "30" ? 30 : periodo === "all" ? null : 90;
    const inicio = dias ? new Date(agora.getTime() - dias * 86_400_000) : undefined;
    const inicioComparacao = inicio
      ? new Date(inicio.getFullYear() - 1, inicio.getMonth(), inicio.getDate())
      : undefined;
    const fimComparacao = new Date(
      agora.getFullYear() - 1,
      agora.getMonth(),
      agora.getDate(),
      23,
      59,
      59,
      999,
    );

    const [vendas, vendasAnoAnterior, metaMes, metasVendedor] = await Promise.all([
      prisma.venda.findMany({
        where: {
          empresaId: usuario.empresaId,
          ...(inicio ? { dataVenda: { gte: inicio } } : {}),
        },
        select: {
          dataVenda: true,
          valorVenda: true,
          quantidade: true,
          vendedor: true,
          cliente: true,
          produto: true,
          categoria: true,
          marca: true,
          loja: true,
          custo: true,
          desconto: true,
        },
        orderBy: { dataVenda: "asc" },
      }),
      inicioComparacao
        ? prisma.venda.findMany({
            where: {
              empresaId: usuario.empresaId,
              dataVenda: { gte: inicioComparacao, lte: fimComparacao },
            },
            select: { valorVenda: true, quantidade: true },
          })
        : Promise.resolve([]),
      prisma.meta.findFirst({
        where: {
          empresaId: usuario.empresaId,
          mes: agora.getMonth() + 1,
          ano: agora.getFullYear(),
        },
      }),
      prisma.metaVendedor.findMany({
        where: {
          empresaId: usuario.empresaId,
          mes: agora.getMonth() + 1,
          ano: agora.getFullYear(),
        },
      }),
    ]);

    const faturamento = vendas.reduce((soma, venda) => soma + venda.valorVenda, 0);
    const quantidade = vendas.reduce((soma, venda) => soma + venda.quantidade, 0);
    const custo = vendas.reduce((soma, venda) => soma + (venda.custo ?? 0), 0);
    const clientes = new Set(vendas.map((venda) => venda.cliente).filter(Boolean)).size;
    const faturamentoAnterior = vendasAnoAnterior.reduce(
      (soma, venda) => soma + venda.valorVenda,
      0,
    );
    const quantidadeAnterior = vendasAnoAnterior.reduce(
      (soma, venda) => soma + venda.quantidade,
      0,
    );

    const porLoja = agregar(vendas, (venda) => venda.loja ?? "Sem filial");
    const porMarca = agregar(vendas, (venda) => venda.marca ?? "Sem marca");
    const porCategoria = agregar(vendas, (venda) => venda.categoria ?? "Sem grupo");
    const porProduto = agregar(vendas, (venda) => venda.produto);
    const porCliente = agregar(vendas, (venda) => venda.cliente ?? "Sem identificação");

    let acumuladoABC = 0;
    const produtosABC = porProduto.map((produto) => {
      acumuladoABC += percentual(produto.valor, faturamento);
      const classe = acumuladoABC <= 80 ? "A" : acumuladoABC <= 95 ? "B" : "C";
      return { ...produto, participacao: percentual(produto.valor, faturamento), classe };
    });

    const mapaMes = new Map<string, { valor: number; quantidade: number; clientes: Set<string> }>();
    for (const venda of vendas) {
      const chave = chaveMes(venda.dataVenda);
      const atual = mapaMes.get(chave) ?? { valor: 0, quantidade: 0, clientes: new Set<string>() };
      atual.valor += venda.valorVenda;
      atual.quantidade += venda.quantidade;
      if (venda.cliente) atual.clientes.add(venda.cliente);
      mapaMes.set(chave, atual);
    }
    const historicoMensal = Array.from(mapaMes.entries()).map(([mes, item]) => ({
      mes,
      valor: arredondar(item.valor),
      quantidade: item.quantidade,
      clientes: item.clientes.size,
    }));

    const mapaDia = new Map<string, number>();
    for (const venda of vendas) {
      const chave = venda.dataVenda.toISOString().slice(0, 10);
      mapaDia.set(chave, (mapaDia.get(chave) ?? 0) + venda.valorVenda);
    }
    const historicoDiario = Array.from(mapaDia.entries()).map(([data, valor]) => ({
      data,
      valor: arredondar(valor),
    }));

    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
    const vendasMes = vendas.filter((venda) => venda.dataVenda >= inicioMes);
    const faturamentoMes = vendasMes.reduce((soma, venda) => soma + venda.valorVenda, 0);
    const desempenhoVendedores = agregar(vendasMes, (venda) => venda.vendedor).map((item) => {
      const meta = metasVendedor.find((registro) => registro.vendedor === item.nome)?.valorMeta ?? 0;
      return {
        ...item,
        meta: arredondar(meta),
        percentualMeta: meta > 0 ? percentual(item.valor, meta) : null,
      };
    });

    return NextResponse.json({
      periodo,
      atualizadoEm: agora,
      resumo: {
        faturamento: arredondar(faturamento),
        faturamentoAnterior: arredondar(faturamentoAnterior),
        variacaoFaturamento:
          faturamentoAnterior > 0
            ? percentual(faturamento - faturamentoAnterior, faturamentoAnterior)
            : null,
        quantidade,
        quantidadeAnterior,
        variacaoQuantidade:
          quantidadeAnterior > 0
            ? percentual(quantidade - quantidadeAnterior, quantidadeAnterior)
            : null,
        transacoes: vendas.length,
        clientes,
        ticketMedio: arredondar(faturamento / Math.max(vendas.length, 1)),
        precoMedio: arredondar(faturamento / Math.max(quantidade, 1)),
        custo: arredondar(custo),
        custoPct: percentual(custo, faturamento),
        metaMensal: arredondar(metaMes?.valorMeta ?? 0),
        faturamentoMes: arredondar(faturamentoMes),
        percentualMeta:
          metaMes?.valorMeta ? percentual(faturamentoMes, metaMes.valorMeta) : 0,
      },
      porLoja,
      porMarca,
      porCategoria,
      produtosABC,
      porVendedor: desempenhoVendedores,
      porCliente,
      historicoMensal,
      historicoDiario,
    });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter analytics de vendas");
  }
}
