import { prisma } from "@/lib/prisma";

type TotaisCampanha = {
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  leads: number;
  conversoes: number;
  receitaAtribuida: number;
};

function somarMetricas(
  metricas: Array<{
    investimento: number;
    impressoes: number;
    alcance: number;
    cliques: number;
    leads: number;
    conversoes: number;
    receitaAtribuida: number;
  }>,
): TotaisCampanha {
  return metricas.reduce<TotaisCampanha>(
    (total, metrica) => ({
      investimento: total.investimento + metrica.investimento,
      impressoes: total.impressoes + metrica.impressoes,
      alcance: total.alcance + metrica.alcance,
      cliques: total.cliques + metrica.cliques,
      leads: total.leads + metrica.leads,
      conversoes: total.conversoes + metrica.conversoes,
      receitaAtribuida: total.receitaAtribuida + metrica.receitaAtribuida,
    }),
    {
      investimento: 0,
      impressoes: 0,
      alcance: 0,
      cliques: 0,
      leads: 0,
      conversoes: 0,
      receitaAtribuida: 0,
    },
  );
}

function percentual(numerador: number, denominador: number) {
  return denominador > 0 ? (numerador / denominador) * 100 : 0;
}

function dividir(numerador: number, denominador: number) {
  return denominador > 0 ? numerador / denominador : 0;
}

function decidirRota(totais: TotaisCampanha, orcamento: number) {
  const roas = dividir(totais.receitaAtribuida, totais.investimento);
  const ritmo = percentual(totais.investimento, orcamento);

  if (totais.investimento <= 0 || totais.cliques <= 0) {
    return {
      codigo: "COLETAR_DADOS",
      label: "Coletar dados",
      tom: "neutral",
      motivo: "Ainda nao ha volume suficiente para concluir o desempenho.",
    };
  }
  if (roas >= 4 && totais.conversoes >= 5) {
    return {
      codigo: "ESCALAR",
      label: "Escalar",
      tom: "success",
      motivo: "O retorno atribuido sustenta ampliar o investimento com controle.",
    };
  }
  if (roas >= 2) {
    return {
      codigo: "OTIMIZAR",
      label: "Manter e otimizar",
      tom: "accent",
      motivo: "A campanha gera retorno, mas ainda ha espaco para melhorar eficiencia.",
    };
  }
  if (ritmo < 25) {
    return {
      codigo: "TESTAR",
      label: "Continuar teste",
      tom: "warning",
      motivo: "O investimento consumido ainda e baixo para uma mudanca definitiva.",
    };
  }
  return {
    codigo: "MUDAR_ROTA",
    label: "Mudar de rota",
    tom: "danger",
    motivo: "O retorno atribuido esta abaixo do necessario para sustentar a estrategia.",
  };
}

function montarIndicadores(totais: TotaisCampanha, orcamento: number, custoOperacional: number) {
  const custoTotal = totais.investimento + custoOperacional;
  return {
    ...totais,
    roas: dividir(totais.receitaAtribuida, totais.investimento),
    roi: percentual(totais.receitaAtribuida - custoTotal, custoTotal),
    ctr: percentual(totais.cliques, totais.impressoes),
    taxaConversao: percentual(totais.conversoes, totais.cliques),
    cpl: dividir(totais.investimento, totais.leads),
    cpa: dividir(totais.investimento, totais.conversoes),
    ritmoOrcamento: percentual(totais.investimento, orcamento),
  };
}

async function exigirClienteDaAgencia(agenciaId: string, clienteId: string) {
  const cliente = await prisma.clienteAgencia.findFirst({
    where: { id: clienteId, agenciaId, status: "ativo" },
  });
  if (!cliente) throw new Error("CLIENTE_INVALIDO");
  return cliente;
}

async function exigirCampanhaDaAgencia(agenciaId: string, campanhaId: string) {
  const campanha = await prisma.campanhaMarketing.findFirst({
    where: { id: campanhaId, agenciaId },
    include: { cliente: true, metricas: { orderBy: { data: "asc" } } },
  });
  if (!campanha) throw new Error("CAMPANHA_INVALIDA");
  return campanha;
}

export async function obterPerformanceCampanhas(agenciaId: string, clienteId?: string) {
  const [clientes, campanhas, cards] = await Promise.all([
    prisma.clienteAgencia.findMany({
      where: { agenciaId, status: "ativo" },
      select: { id: true, nome: true, empresaConectadaId: true },
      orderBy: { nome: "asc" },
    }),
    prisma.campanhaMarketing.findMany({
      where: { agenciaId, ...(clienteId ? { clienteId } : {}) },
      include: {
        cliente: {
          select: { id: true, nome: true, empresaConectadaId: true },
        },
        metricas: { orderBy: { data: "asc" } },
      },
      orderBy: [{ status: "asc" }, { dataInicio: "desc" }],
    }),
    prisma.cardCampanha.findMany({
      where: { agenciaId, ...(clienteId ? { clienteId } : {}) },
      include: {
        cliente: { select: { nome: true } },
        campanha: { select: { nome: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const campanhaDtos = await Promise.all(
    campanhas.map(async (campanha) => {
      const totais = somarMetricas(campanha.metricas);
      const indicadores = montarIndicadores(
        totais,
        campanha.orcamento,
        campanha.custoOperacional,
      );
      const decisao = decidirRota(totais, campanha.orcamento);
      const vendasEmpresaPeriodo = campanha.cliente.empresaConectadaId
        ? await prisma.venda.aggregate({
            where: {
              empresaId: campanha.cliente.empresaConectadaId,
              dataVenda: {
                gte: campanha.dataInicio,
                ...(campanha.dataFim ? { lte: campanha.dataFim } : {}),
              },
            },
            _sum: { valorVenda: true },
          })
        : null;

      return {
        id: campanha.id,
        nome: campanha.nome,
        objetivo: campanha.objetivo,
        canal: campanha.canal,
        status: campanha.status,
        dataInicio: campanha.dataInicio,
        dataFim: campanha.dataFim,
        orcamento: campanha.orcamento,
        custoOperacional: campanha.custoOperacional,
        modeloAtribuicao: campanha.modeloAtribuicao,
        fonteDados: campanha.fonteDados,
        diagnostico: campanha.diagnostico,
        recomendacao: campanha.recomendacao,
        proximaAcao: campanha.proximaAcao,
        cliente: campanha.cliente,
        indicadores,
        decisao,
        vendasEmpresaPeriodo: vendasEmpresaPeriodo?._sum.valorVenda ?? null,
        metricas: campanha.metricas,
      };
    }),
  );

  const totaisGerais = campanhaDtos.reduce<TotaisCampanha>(
    (total, campanha) => ({
      investimento: total.investimento + campanha.indicadores.investimento,
      impressoes: total.impressoes + campanha.indicadores.impressoes,
      alcance: total.alcance + campanha.indicadores.alcance,
      cliques: total.cliques + campanha.indicadores.cliques,
      leads: total.leads + campanha.indicadores.leads,
      conversoes: total.conversoes + campanha.indicadores.conversoes,
      receitaAtribuida: total.receitaAtribuida + campanha.indicadores.receitaAtribuida,
    }),
    {
      investimento: 0,
      impressoes: 0,
      alcance: 0,
      cliques: 0,
      leads: 0,
      conversoes: 0,
      receitaAtribuida: 0,
    },
  );
  const custosOperacionais = campanhaDtos.reduce(
    (total, campanha) => total + campanha.custoOperacional,
    0,
  );
  const orcamentoTotal = campanhaDtos.reduce(
    (total, campanha) => total + campanha.orcamento,
    0,
  );

  const evolucao = new Map<
    string,
    { data: string; investimento: number; receitaAtribuida: number; conversoes: number }
  >();
  for (const campanha of campanhaDtos) {
    for (const metrica of campanha.metricas) {
      const chave = metrica.data.toISOString().slice(0, 10);
      const atual = evolucao.get(chave) ?? {
        data: chave,
        investimento: 0,
        receitaAtribuida: 0,
        conversoes: 0,
      };
      atual.investimento += metrica.investimento;
      atual.receitaAtribuida += metrica.receitaAtribuida;
      atual.conversoes += metrica.conversoes;
      evolucao.set(chave, atual);
    }
  }

  return {
    resumo: {
      campanhas: campanhaDtos.length,
      campanhasAtivas: campanhaDtos.filter((campanha) => campanha.status === "ATIVA").length,
      emAtencao: campanhaDtos.filter(
        (campanha) => campanha.decisao.codigo === "MUDAR_ROTA",
      ).length,
      ...montarIndicadores(totaisGerais, orcamentoTotal, custosOperacionais),
      orcamento: orcamentoTotal,
    },
    clientes,
    campanhas: campanhaDtos,
    evolucao: Array.from(evolucao.values()).sort((a, b) => a.data.localeCompare(b.data)),
    cards,
    avisoAtribuicao:
      "Receita atribuida segue a fonte e o modelo informados em cada campanha. Vendas totais da empresa, quando conectada, aparecem apenas como contexto e nao provam causalidade.",
  };
}

export async function criarCampanha(
  agenciaId: string,
  dados: {
    clienteId: string;
    nome: string;
    objetivo: string;
    canal: string;
    dataInicio: string;
    dataFim?: string;
    orcamento?: number;
    custoOperacional?: number;
    modeloAtribuicao?: string;
    fonteDados?: string;
  },
) {
  await exigirClienteDaAgencia(agenciaId, dados.clienteId);
  if (!dados.nome || !dados.objetivo || !dados.canal || !dados.dataInicio) {
    throw new Error("DADOS_OBRIGATORIOS");
  }
  return prisma.campanhaMarketing.create({
    data: {
      agenciaId,
      clienteId: dados.clienteId,
      nome: dados.nome,
      objetivo: dados.objetivo,
      canal: dados.canal,
      status: "ATIVA",
      dataInicio: new Date(`${dados.dataInicio}T12:00:00`),
      dataFim: dados.dataFim ? new Date(`${dados.dataFim}T12:00:00`) : null,
      orcamento: Math.max(0, Number(dados.orcamento) || 0),
      custoOperacional: Math.max(0, Number(dados.custoOperacional) || 0),
      modeloAtribuicao: dados.modeloAtribuicao || "Nao informado",
      fonteDados: dados.fonteDados || "Preenchimento manual",
    },
  });
}

export async function registrarMetricaCampanha(
  agenciaId: string,
  dados: {
    campanhaId: string;
    data: string;
    investimento?: number;
    impressoes?: number;
    alcance?: number;
    cliques?: number;
    leads?: number;
    conversoes?: number;
    receitaAtribuida?: number;
    observacao?: string;
  },
) {
  await exigirCampanhaDaAgencia(agenciaId, dados.campanhaId);
  if (!dados.data) throw new Error("DADOS_OBRIGATORIOS");
  const metrica = {
    investimento: Math.max(0, Number(dados.investimento) || 0),
    impressoes: Math.max(0, Math.round(Number(dados.impressoes) || 0)),
    alcance: Math.max(0, Math.round(Number(dados.alcance) || 0)),
    cliques: Math.max(0, Math.round(Number(dados.cliques) || 0)),
    leads: Math.max(0, Math.round(Number(dados.leads) || 0)),
    conversoes: Math.max(0, Math.round(Number(dados.conversoes) || 0)),
    receitaAtribuida: Math.max(0, Number(dados.receitaAtribuida) || 0),
    observacao: dados.observacao || null,
  };
  return prisma.metricaCampanha.upsert({
    where: {
      campanhaId_data: {
        campanhaId: dados.campanhaId,
        data: new Date(`${dados.data}T12:00:00`),
      },
    },
    update: metrica,
    create: {
      campanhaId: dados.campanhaId,
      data: new Date(`${dados.data}T12:00:00`),
      ...metrica,
    },
  });
}

export async function atualizarEstrategiaCampanha(
  agenciaId: string,
  dados: {
    campanhaId: string;
    status?: "PLANEJAMENTO" | "ATIVA" | "PAUSADA" | "ENCERRADA";
    diagnostico?: string;
    recomendacao?: string;
    proximaAcao?: string;
  },
) {
  await exigirCampanhaDaAgencia(agenciaId, dados.campanhaId);
  return prisma.campanhaMarketing.update({
    where: { id: dados.campanhaId },
    data: {
      status: dados.status,
      diagnostico: dados.diagnostico || null,
      recomendacao: dados.recomendacao || null,
      proximaAcao: dados.proximaAcao || null,
    },
  });
}

export async function gerarCardCampanha(agenciaId: string, campanhaId: string) {
  const campanha = await exigirCampanhaDaAgencia(agenciaId, campanhaId);
  const totais = somarMetricas(campanha.metricas);
  const indicadores = montarIndicadores(
    totais,
    campanha.orcamento,
    campanha.custoOperacional,
  );
  const decisao = decidirRota(totais, campanha.orcamento);
  const recomendacao = campanha.recomendacao || decisao.motivo;
  const mensagem = [
    `${campanha.cliente.nome} | ${campanha.nome}`,
    `Investimento: ${indicadores.investimento.toFixed(2)}`,
    `Receita atribuida: ${indicadores.receitaAtribuida.toFixed(2)}`,
    `ROAS: ${indicadores.roas.toFixed(2)}x`,
    `Conversoes: ${indicadores.conversoes}`,
    `Direcao recomendada: ${decisao.label}. ${recomendacao}`,
    `Atribuicao: ${campanha.modeloAtribuicao} | Fonte: ${campanha.fonteDados}`,
  ].join("\n");
  const dados = {
    cliente: campanha.cliente.nome,
    campanha: campanha.nome,
    objetivo: campanha.objetivo,
    canal: campanha.canal,
    periodo: {
      inicio: campanha.dataInicio.toISOString(),
      fim: campanha.dataFim?.toISOString() ?? null,
    },
    indicadores,
    decisao,
    diagnostico: campanha.diagnostico,
    recomendacao,
    proximaAcao: campanha.proximaAcao,
    modeloAtribuicao: campanha.modeloAtribuicao,
    fonteDados: campanha.fonteDados,
  };

  return prisma.cardCampanha.create({
    data: {
      agenciaId,
      clienteId: campanha.clienteId,
      campanhaId: campanha.id,
      titulo: `Performance | ${campanha.nome}`,
      mensagem,
      dados,
    },
    include: {
      cliente: { select: { nome: true } },
      campanha: { select: { nome: true } },
    },
  });
}
