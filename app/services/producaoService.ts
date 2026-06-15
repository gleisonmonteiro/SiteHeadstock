import { prisma } from "@/lib/prisma";

type EtapaInput = {
  nome: string;
  ordem: number;
  descricao?: string;
  externa?: boolean;
};

type CriarOPInput = {
  numero: string;
  referencia?: string;
  descricao: string;
  quantidade: number;
  programacaoId: string;
  dataEnvio: Date;
  dataRetornoPrevista?: Date | null;
  localInicial?: string;
};

type MovimentarOPInput = {
  etapaOrigemId: string;
  localOrigem?: string | null;
  etapaDestinoId?: string | null;
  localDestino?: string | null;
  quantidade: number;
  quantidadeDefeito?: number;
  dataPrevisaoRetorno?: Date | null;
  observacao?: string;
  concluir?: boolean;
};

const includeOP = {
  programacao: { include: { etapas: { orderBy: { ordem: "asc" as const } } } },
  itens: { orderBy: [{ cor: "asc" as const }, { tamanho: "asc" as const }] },
  movimentacoes: {
    include: {
      etapa: true,
      etapaOrigem: true,
      usuario: { select: { nome: true } },
      estornadaPor: { select: { nome: true } },
    },
    orderBy: [{ dataEntrada: "asc" as const }, { createdAt: "asc" as const }],
  },
};

function chaveSaldo(etapaId: string, local: string | null | undefined) {
  return `${etapaId}::${(local ?? "").trim().toLocaleLowerCase("pt-BR")}`;
}

function diasEntre(inicio: Date, fim = new Date()) {
  return Math.max(0, Math.floor((fim.getTime() - inicio.getTime()) / 86_400_000));
}

function calcularSaldos(op: Awaited<ReturnType<typeof buscarOPCompleta>>) {
  if (!op) return { saldos: [], quantidadeConcluida: 0, quantidadeDefeitos: 0 };

  const saldos = new Map<
    string,
    {
      etapaId: string;
      etapaNome: string;
      etapaOrdem: number;
      etapaExterna: boolean;
      local: string | null;
      quantidade: number;
      dataEntrada: Date;
      dataPrevisaoRetorno: Date | null;
      movimentoId: string;
    }
  >();
  let quantidadeConcluida = 0;
  let quantidadeDefeitos = 0;

  for (const movimento of op.movimentacoes) {
    if (movimento.estornadaEm) continue;
    const quantidade = movimento.quantidade > 0 ? movimento.quantidade : op.qtdTotal;
    quantidadeDefeitos += movimento.quantidadeDefeito;

    if (movimento.etapaOrigemId) {
      const origemKey = chaveSaldo(movimento.etapaOrigemId, movimento.localOrigem);
      const origem = saldos.get(origemKey);
      if (origem) origem.quantidade -= quantidade;
    }

    if (movimento.tipo === "CONCLUSAO") {
      quantidadeConcluida += quantidade;
      continue;
    }

    if (movimento.etapaId && movimento.etapa) {
      const destinoKey = chaveSaldo(movimento.etapaId, movimento.localDestino);
      const destino = saldos.get(destinoKey) ?? {
        etapaId: movimento.etapaId,
        etapaNome: movimento.etapa.nome,
        etapaOrdem: movimento.etapa.ordem,
        etapaExterna: movimento.etapa.externa,
        local: movimento.localDestino,
        quantidade: 0,
        dataEntrada: movimento.dataEntrada,
        dataPrevisaoRetorno: movimento.dataPrevisaoRetorno,
        movimentoId: movimento.id,
      };
      destino.quantidade += quantidade;
      destino.dataEntrada = movimento.dataEntrada;
      destino.dataPrevisaoRetorno =
        movimento.dataPrevisaoRetorno ?? op.dataRetornoPrevista;
      destino.movimentoId = movimento.id;
      saldos.set(destinoKey, destino);
    }
  }

  return {
    saldos: [...saldos.values()]
      .filter((saldo) => saldo.quantidade > 0)
      .map((saldo) => {
        const hoje = new Date();
        const atraso =
          saldo.dataPrevisaoRetorno && saldo.dataPrevisaoRetorno.getTime() < hoje.getTime()
            ? diasEntre(saldo.dataPrevisaoRetorno, hoje)
            : 0;
        return {
          ...saldo,
          diasNaEtapa: diasEntre(saldo.dataEntrada, hoje),
          diasAtraso: atraso,
          atrasada: atraso > 0,
        };
      })
      .sort((a, b) => a.etapaOrdem - b.etapaOrdem || b.quantidade - a.quantidade),
    quantidadeConcluida,
    quantidadeDefeitos,
  };
}

async function buscarOPCompleta(empresaId: string, opId: string) {
  return prisma.ordemProducao.findFirst({
    where: { id: opId, empresaId },
    include: includeOP,
  });
}

function enriquecerOP(op: NonNullable<Awaited<ReturnType<typeof buscarOPCompleta>>>) {
  const resumo = calcularSaldos(op);
  const maiorAtraso = Math.max(0, ...resumo.saldos.map((saldo) => saldo.diasAtraso));
  return {
    ...op,
    ...resumo,
    atrasada: maiorAtraso > 0,
    diasAtraso: maiorAtraso,
    ultimaMovimentacao: [...op.movimentacoes]
      .reverse()
      .find((movimento) => !movimento.estornadaEm) ?? null,
  };
}

async function sincronizarEstadoOP(empresaId: string, opId: string) {
  const op = await buscarOPCompleta(empresaId, opId);
  if (!op) throw new Error("OP_NAO_ENCONTRADA");
  const { saldos, quantidadeConcluida } = calcularSaldos(op);
  const etapasAtivas = [...new Set(saldos.map((saldo) => saldo.etapaId))];
  const status =
    quantidadeConcluida >= op.qtdTotal
      ? "CONCLUIDA"
      : op.movimentacoes.some((movimento) => !movimento.estornadaEm)
        ? "EM_ANDAMENTO"
        : "AGUARDANDO";

  await prisma.ordemProducao.update({
    where: { id: opId },
    data: {
      status,
      etapaAtualId: etapasAtivas.length === 1 ? etapasAtivas[0] : null,
    },
  });
}

export async function listarProgramacoes(empresaId: string) {
  return prisma.programacaoOP.findMany({
    where: { empresaId },
    include: {
      etapas: { orderBy: { ordem: "asc" } },
      _count: { select: { ordens: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function criarProgramacao(
  empresaId: string,
  nome: string,
  etapas: EtapaInput[],
) {
  const total = await prisma.programacaoOP.count({ where: { empresaId } });
  if (total >= 5) throw new Error("LIMITE_PROGRAMACOES");

  const nomeLimpo = nome.trim();
  const etapasLimpas = etapas
    .map((etapa, index) => ({
      nome: etapa.nome.trim(),
      ordem: index + 1,
      descricao: etapa.descricao?.trim() || null,
      externa: Boolean(etapa.externa),
    }))
    .filter((etapa) => etapa.nome);

  if (!nomeLimpo || etapasLimpas.length < 2) throw new Error("PROGRAMACAO_INVALIDA");
  if (new Set(etapasLimpas.map((etapa) => etapa.nome.toLowerCase())).size !== etapasLimpas.length) {
    throw new Error("ETAPAS_DUPLICADAS");
  }

  return prisma.programacaoOP.create({
    data: {
      empresaId,
      nome: nomeLimpo,
      etapas: { create: etapasLimpas },
    },
    include: { etapas: { orderBy: { ordem: "asc" } } },
  });
}

export async function listarOPs(empresaId: string, status?: string) {
  const ops = await prisma.ordemProducao.findMany({
    where: {
      empresaId,
      ...(status
        ? {
            status: status as
              | "AGUARDANDO"
              | "EM_ANDAMENTO"
              | "CONCLUIDA"
              | "CANCELADA",
          }
        : {}),
    },
    include: includeOP,
    orderBy: { createdAt: "desc" },
  });
  return ops.map(enriquecerOP);
}

export async function obterOPDetalhe(empresaId: string, opId: string) {
  const op = await buscarOPCompleta(empresaId, opId);
  return op ? enriquecerOP(op) : null;
}

export async function criarOP(
  empresaId: string,
  usuarioId: string,
  dados: CriarOPInput,
) {
  const programacao = await prisma.programacaoOP.findFirst({
    where: { id: dados.programacaoId, empresaId, ativo: true },
    include: { etapas: { orderBy: { ordem: "asc" } } },
  });
  if (!programacao || programacao.etapas.length === 0) {
    throw new Error("PROGRAMACAO_INVALIDA");
  }
  if (!dados.numero.trim() || !dados.descricao.trim() || dados.quantidade <= 0) {
    throw new Error("OP_INVALIDA");
  }

  const primeiraEtapa = programacao.etapas[0];
  const op = await prisma.ordemProducao.create({
    data: {
      empresaId,
      programacaoId: programacao.id,
      numero: dados.numero.trim(),
      referencia: dados.referencia?.trim() || null,
      produto: dados.descricao.trim(),
      qtdTotal: Math.floor(dados.quantidade),
      status: "EM_ANDAMENTO",
      etapaAtualId: primeiraEtapa.id,
      dataEnvio: dados.dataEnvio,
      dataRetornoPrevista: dados.dataRetornoPrevista ?? null,
      criadoPorId: usuarioId,
      itens: {
        create: {
          quantidade: Math.floor(dados.quantidade),
        },
      },
      movimentacoes: {
        create: {
          etapaId: primeiraEtapa.id,
          tipo: "ENTRADA",
          quantidade: Math.floor(dados.quantidade),
          localDestino: dados.localInicial?.trim() || null,
          dataEntrada: dados.dataEnvio,
          dataPrevisaoRetorno: dados.dataRetornoPrevista ?? null,
          usuarioId,
          observacao: "Entrada da OP na programação",
        },
      },
    },
  });
  return obterOPDetalhe(empresaId, op.id);
}

export async function movimentarOP(
  empresaId: string,
  opId: string,
  usuarioId: string,
  dados: MovimentarOPInput,
) {
  const op = await buscarOPCompleta(empresaId, opId);
  if (!op) throw new Error("OP_NAO_ENCONTRADA");
  if (op.status === "CONCLUIDA" || op.status === "CANCELADA") {
    throw new Error("OP_FINALIZADA");
  }

  const { saldos } = calcularSaldos(op);
  const origem = saldos.find(
    (saldo) =>
      saldo.etapaId === dados.etapaOrigemId &&
      chaveSaldo(saldo.etapaId, saldo.local) ===
        chaveSaldo(dados.etapaOrigemId, dados.localOrigem),
  );
  const quantidade = Math.floor(dados.quantidade);
  const defeitos = Math.floor(dados.quantidadeDefeito ?? 0);
  if (!origem || quantidade <= 0 || quantidade > origem.quantidade) {
    throw new Error("QUANTIDADE_INVALIDA");
  }
  if (defeitos < 0 || defeitos > quantidade) throw new Error("DEFEITOS_INVALIDOS");

  const etapaOrigem = op.programacao.etapas.find(
    (etapa) => etapa.id === dados.etapaOrigemId,
  );
  if (!etapaOrigem) throw new Error("ETAPA_INVALIDA");

  let etapaDestinoId: string | null = null;
  let tipo = "MOVIMENTO";
  if (dados.concluir) {
    const ultimaEtapa = op.programacao.etapas.at(-1);
    if (ultimaEtapa?.id !== etapaOrigem.id) throw new Error("ETAPA_INVALIDA");
    tipo = "CONCLUSAO";
  } else {
    const proxima = op.programacao.etapas.find(
      (etapa) => etapa.ordem === etapaOrigem.ordem + 1,
    );
    if (!proxima || proxima.id !== dados.etapaDestinoId) {
      throw new Error("ETAPA_INVALIDA");
    }
    etapaDestinoId = proxima.id;
  }

  await prisma.movimentacaoOP.create({
    data: {
      opId,
      etapaOrigemId: etapaOrigem.id,
      etapaId: etapaDestinoId,
      tipo,
      quantidade,
      quantidadeDefeito: defeitos,
      localOrigem: dados.localOrigem?.trim() || null,
      localDestino: dados.localDestino?.trim() || null,
      dataEntrada: new Date(),
      dataPrevisaoRetorno: dados.dataPrevisaoRetorno ?? op.dataRetornoPrevista,
      usuarioId,
      observacao: dados.observacao?.trim() || null,
    },
  });

  await sincronizarEstadoOP(empresaId, opId);
  return obterOPDetalhe(empresaId, opId);
}

export async function estornarMovimentacao(
  empresaId: string,
  movimentoId: string,
  usuarioId: string,
  motivo: string,
) {
  const movimento = await prisma.movimentacaoOP.findFirst({
    where: { id: movimentoId, op: { empresaId } },
    include: { op: true },
  });
  if (!movimento) throw new Error("MOVIMENTACAO_NAO_ENCONTRADA");
  if (movimento.estornadaEm) throw new Error("MOVIMENTACAO_ESTORNADA");

  const ultima = await prisma.movimentacaoOP.findFirst({
    where: { opId: movimento.opId, estornadaEm: null },
    orderBy: [{ dataEntrada: "desc" }, { createdAt: "desc" }],
  });
  if (!ultima || ultima.id !== movimento.id) throw new Error("ESTORNO_FORA_DE_ORDEM");
  if (!motivo.trim()) throw new Error("MOTIVO_OBRIGATORIO");

  await prisma.movimentacaoOP.update({
    where: { id: movimento.id },
    data: {
      estornadaEm: new Date(),
      estornadaPorId: usuarioId,
      motivoEstorno: motivo.trim(),
    },
  });
  await sincronizarEstadoOP(empresaId, movimento.opId);
  return obterOPDetalhe(empresaId, movimento.opId);
}

export async function kpisProducao(empresaId: string) {
  const ops = await listarOPs(empresaId);
  const abertas = ops.filter((op) => !["CONCLUIDA", "CANCELADA"].includes(op.status));
  return {
    total: ops.length,
    emAndamento: abertas.length,
    atrasadas: abertas.filter((op) => op.atrasada).length,
    pecasPendentes: abertas.reduce(
      (total, op) => total + op.saldos.reduce((soma, saldo) => soma + saldo.quantidade, 0),
      0,
    ),
    defeitos: ops.reduce((total, op) => total + op.quantidadeDefeitos, 0),
  };
}
