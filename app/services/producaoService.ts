import { prisma } from "@/lib/prisma";

export async function listarProgramacoes(empresaId: string) {
  return prisma.programacaoOP.findMany({
    where: { empresaId },
    include: { etapas: { orderBy: { ordem: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function criarProgramacao(empresaId: string, nome: string, etapas: { nome: string; ordem: number; descricao?: string }[]) {
  return prisma.programacaoOP.create({
    data: {
      empresaId,
      nome,
      etapas: { create: etapas },
    },
    include: { etapas: { orderBy: { ordem: "asc" } } },
  });
}

export async function listarOPs(empresaId: string, status?: string) {
  return prisma.ordemProducao.findMany({
    where: {
      empresaId,
      ...(status ? { status: status as "AGUARDANDO" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA" } : {}),
    },
    include: {
      programacao: { include: { etapas: { orderBy: { ordem: "asc" } } } },
      itens: { orderBy: [{ cor: "asc" }, { tamanho: "asc" }] },
      movimentacoes: {
        include: { etapa: true },
        orderBy: { dataEntrada: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function obterOPDetalhe(empresaId: string, opId: string) {
  return prisma.ordemProducao.findFirst({
    where: { id: opId, empresaId },
    include: {
      programacao: { include: { etapas: { orderBy: { ordem: "asc" } } } },
      itens: { orderBy: { cor: "asc" } },
      movimentacoes: {
        include: { etapa: true, usuario: { select: { nome: true } } },
        orderBy: { dataEntrada: "asc" },
      },
    },
  });
}

export async function movimentarOP(
  empresaId: string,
  opId: string,
  proximaEtapaId: string,
  usuarioId: string,
  observacao?: string
) {
  const op = await prisma.ordemProducao.findFirst({
    where: { id: opId, empresaId },
    include: {
      programacao: { include: { etapas: { orderBy: { ordem: "asc" } } } },
      movimentacoes: { orderBy: { dataEntrada: "desc" }, take: 1 },
    },
  });

  if (!op) throw new Error("OP não encontrada");
  if (op.status === "CONCLUIDA" || op.status === "CANCELADA") throw new Error("OP já finalizada");

  const agora = new Date();

  // Encerrar movimentação atual
  const movAtual = op.movimentacoes[0];
  if (movAtual && !movAtual.dataSaida) {
    await prisma.movimentacaoOP.update({
      where: { id: movAtual.id },
      data: { dataSaida: agora },
    });
  }

  // Verificar se é a última etapa
  const ultimaEtapa = op.programacao.etapas[op.programacao.etapas.length - 1];
  const concluida = ultimaEtapa.id === op.etapaAtualId;

  // Criar nova movimentação
  await prisma.movimentacaoOP.create({
    data: {
      opId,
      etapaId: proximaEtapaId,
      dataEntrada: agora,
      usuarioId,
      observacao: observacao ?? null,
    },
  });

  // Atualizar etapa atual e status
  return prisma.ordemProducao.update({
    where: { id: opId },
    data: {
      etapaAtualId: proximaEtapaId,
      status: concluida ? "CONCLUIDA" : "EM_ANDAMENTO",
    },
  });
}

export async function concluirOP(empresaId: string, opId: string) {
  const op = await prisma.ordemProducao.findFirst({
    where: { id: opId, empresaId },
    include: { movimentacoes: { orderBy: { dataEntrada: "desc" }, take: 1 } },
  });

  if (!op) throw new Error("OP não encontrada");

  const agora = new Date();
  const movAtual = op.movimentacoes[0];
  if (movAtual && !movAtual.dataSaida) {
    await prisma.movimentacaoOP.update({
      where: { id: movAtual.id },
      data: { dataSaida: agora },
    });
  }

  return prisma.ordemProducao.update({
    where: { id: opId },
    data: { status: "CONCLUIDA" },
  });
}

export async function kpisProducao(empresaId: string) {
  const [total, porStatus, movimentacoes] = await Promise.all([
    prisma.ordemProducao.count({ where: { empresaId } }),
    prisma.ordemProducao.groupBy({
      by: ["status"],
      where: { empresaId },
      _count: { id: true },
    }),
    prisma.movimentacaoOP.findMany({
      where: { op: { empresaId }, dataSaida: { not: null } },
      include: { etapa: true },
      orderBy: { dataEntrada: "asc" },
    }),
  ]);

  // Tempo médio por etapa (em horas)
  const temposPorEtapa: Record<string, number[]> = {};
  for (const mov of movimentacoes) {
    if (!mov.dataSaida) continue;
    const horas = (mov.dataSaida.getTime() - mov.dataEntrada.getTime()) / 3_600_000;
    const nome = mov.etapa.nome;
    if (!temposPorEtapa[nome]) temposPorEtapa[nome] = [];
    temposPorEtapa[nome].push(horas);
  }

  const tempoMedioPorEtapa = Object.entries(temposPorEtapa).map(([etapa, tempos]) => ({
    etapa,
    mediaHoras: Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length),
  }));

  return {
    total,
    porStatus: Object.fromEntries(porStatus.map((s) => [s.status, s._count.id])),
    tempoMedioPorEtapa,
  };
}
