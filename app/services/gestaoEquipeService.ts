import { randomBytes } from "crypto";
import { hashSenha } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_ATIVOS = ["PLANEJAMENTO", "EM_ANDAMENTO", "PAUSADO"] as const;

function inicioSemana(data = new Date()) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  const dia = inicio.getDay();
  inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1));
  return inicio;
}

function arredondar(valor: number, casas = 1) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

function percentual(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

async function exigirUsuarioAgencia(agenciaId: string, usuarioId: string) {
  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioId, empresaId: agenciaId },
  });
  if (!usuario) throw new Error("COLABORADOR_INVALIDO");
  return usuario;
}

async function exigirEquipeAgencia(agenciaId: string, equipeId: string) {
  const equipe = await prisma.equipe.findFirst({
    where: { id: equipeId, empresaId: agenciaId },
  });
  if (!equipe) throw new Error("EQUIPE_INVALIDA");
  return equipe;
}

async function exigirClienteAgencia(agenciaId: string, clienteId: string) {
  const cliente = await prisma.clienteAgencia.findFirst({
    where: { id: clienteId, agenciaId },
  });
  if (!cliente) throw new Error("CLIENTE_INVALIDO");
  return cliente;
}

async function exigirProjetoAgencia(agenciaId: string, projetoId: string) {
  const projeto = await prisma.projeto.findFirst({
    where: { id: projetoId, agenciaId },
  });
  if (!projeto) throw new Error("PROJETO_INVALIDO");
  return projeto;
}

export async function obterGestaoEquipes(agenciaId: string) {
  const agora = new Date();
  const inicioDaSemana = inicioSemana(agora);
  const inicioDoMes = new Date(agora.getFullYear(), agora.getMonth(), 1);

  const [usuarios, equipes, clientes, projetos, apontamentosSemana, apontamentosMes] =
    await Promise.all([
      prisma.usuario.findMany({
        where: {
          empresaId: agenciaId,
          status: { in: ["ativo", "sem_acesso"] },
          papel: { notIn: ["MASTER_PLATFORM", "MASTER_CONSULTANT"] },
        },
        select: { id: true, nome: true, email: true, papel: true, status: true },
        orderBy: { nome: "asc" },
      }),
      prisma.equipe.findMany({
        where: { empresaId: agenciaId, status: "ativa" },
        include: {
          gestor: { select: { id: true, nome: true } },
          membros: {
            include: { usuario: { select: { id: true, nome: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.clienteAgencia.findMany({
        where: { agenciaId, status: "ativo" },
        select: { id: true, nome: true, horasContratadas: true, contratoValor: true },
        orderBy: { nome: "asc" },
      }),
      prisma.projeto.findMany({
        where: { agenciaId, status: { in: [...STATUS_ATIVOS] } },
        include: {
          cliente: { select: { id: true, nome: true } },
          equipe: { select: { id: true, nome: true } },
          responsavel: { select: { id: true, nome: true } },
          participantes: {
            include: { usuario: { select: { id: true, nome: true } } },
          },
          apontamentos: { select: { horas: true, usuarioId: true } },
          atualizacoes: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
        orderBy: [{ saude: "desc" }, { prazo: "asc" }],
      }),
      prisma.apontamentoHora.findMany({
        where: {
          agenciaId,
          data: { gte: inicioDaSemana },
          status: { in: ["ENVIADO", "APROVADO"] },
        },
        select: { usuarioId: true, nomeColaborador: true, horas: true, projetoId: true },
      }),
      prisma.apontamentoHora.findMany({
        where: {
          agenciaId,
          data: { gte: inicioDoMes },
          status: { in: ["ENVIADO", "APROVADO"] },
        },
        select: {
          usuarioId: true,
          nomeColaborador: true,
          horas: true,
          projetoId: true,
          faturavel: true,
        },
      }),
    ]);

  const capacidadePorUsuario = new Map<string, number>();
  const equipePorUsuario = new Map<string, { id: string; nome: string; funcao: string | null }>();
  for (const equipe of equipes) {
    for (const membro of equipe.membros) {
      capacidadePorUsuario.set(membro.usuarioId, membro.capacidadeSemanal);
      equipePorUsuario.set(membro.usuarioId, {
        id: equipe.id,
        nome: equipe.nome,
        funcao: membro.funcao,
      });
    }
  }

  const horasSemana = new Map<string, number>();
  const horasMes = new Map<string, number>();
  const horasFaturaveis = new Map<string, number>();
  for (const item of apontamentosSemana) {
    if (!item.usuarioId) continue;
    horasSemana.set(item.usuarioId, (horasSemana.get(item.usuarioId) ?? 0) + item.horas);
  }
  for (const item of apontamentosMes) {
    if (!item.usuarioId) continue;
    horasMes.set(item.usuarioId, (horasMes.get(item.usuarioId) ?? 0) + item.horas);
    if (item.faturavel) {
      horasFaturaveis.set(
        item.usuarioId,
        (horasFaturaveis.get(item.usuarioId) ?? 0) + item.horas,
      );
    }
  }

  const projetosPorUsuario = new Map<string, Set<string>>();
  for (const projeto of projetos) {
    const ids = new Set([
      projeto.responsavelId,
      ...projeto.participantes.map((participante) => participante.usuarioId),
    ]);
    for (const usuarioId of ids) {
      if (!usuarioId) continue;
      const lista = projetosPorUsuario.get(usuarioId) ?? new Set<string>();
      lista.add(projeto.nome);
      projetosPorUsuario.set(usuarioId, lista);
    }
  }

  const colaboradores = usuarios.map((usuario) => {
    const capacidade = capacidadePorUsuario.get(usuario.id) ?? 40;
    const semana = horasSemana.get(usuario.id) ?? 0;
    const mes = horasMes.get(usuario.id) ?? 0;
    return {
      ...usuario,
      equipe: equipePorUsuario.get(usuario.id) ?? null,
      capacidadeSemanal: capacidade,
      horasSemana: arredondar(semana),
      horasMes: arredondar(mes),
      utilizacao: percentual(semana, capacidade),
      faturabilidade: percentual(horasFaturaveis.get(usuario.id) ?? 0, mes),
      projetos: [...(projetosPorUsuario.get(usuario.id) ?? [])],
      semApontamento: semana === 0,
    };
  });

  const projetosDetalhados = projetos.map((projeto) => {
    const horasRealizadas = projeto.apontamentos.reduce(
      (total, item) => total + item.horas,
      0,
    );
    const consumo = percentual(horasRealizadas, projeto.horasPrevistas ?? 0);
    const atrasado = Boolean(
      projeto.prazo &&
        projeto.prazo < agora &&
        !["CONCLUIDO", "CANCELADO"].includes(projeto.status),
    );
    const entregaAtrasada = Boolean(
      projeto.dataProximaEntrega &&
        projeto.dataProximaEntrega < agora &&
        projeto.progresso < 100,
    );
    return {
      id: projeto.id,
      nome: projeto.nome,
      cliente: projeto.cliente,
      equipe: projeto.equipe,
      responsavel: projeto.responsavel,
      participantes: projeto.participantes.map((item) => ({
        id: item.usuario.id,
        nome: item.usuario.nome,
        papel: item.papel,
      })),
      status: projeto.status,
      saude: projeto.saude,
      progresso: projeto.progresso,
      prazo: projeto.prazo,
      horasPrevistas: projeto.horasPrevistas ?? 0,
      horasRealizadas: arredondar(horasRealizadas),
      consumoHoras: consumo,
      proximaEntrega: projeto.proximaEntrega,
      dataProximaEntrega: projeto.dataProximaEntrega,
      impedimento: projeto.impedimento,
      atrasado,
      entregaAtrasada,
      ultimaAtualizacao: projeto.atualizacoes[0]?.createdAt ?? projeto.updatedAt,
    };
  });

  const capacidadeTotal = colaboradores.reduce(
    (total, colaborador) => total + colaborador.capacidadeSemanal,
    0,
  );
  const horasSemanaTotal = colaboradores.reduce(
    (total, colaborador) => total + colaborador.horasSemana,
    0,
  );

  return {
    resumo: {
      colaboradores: colaboradores.length,
      equipes: equipes.length,
      projetosAtivos: projetosDetalhados.length,
      projetosEmRisco: projetosDetalhados.filter(
        (projeto) => projeto.saude !== "NORMAL" || projeto.atrasado,
      ).length,
      entregasAtrasadas: projetosDetalhados.filter((projeto) => projeto.entregaAtrasada)
        .length,
      semApontamento: colaboradores.filter((colaborador) => colaborador.semApontamento)
        .length,
      capacidadeSemanal: arredondar(capacidadeTotal),
      horasSemana: arredondar(horasSemanaTotal),
      ocupacao: percentual(horasSemanaTotal, capacidadeTotal),
    },
    colaboradores,
    equipes: equipes.map((equipe) => ({
      id: equipe.id,
      nome: equipe.nome,
      gestor: equipe.gestor,
      membros: equipe.membros.map((membro) => ({
        id: membro.usuarioId,
        nome: membro.usuario.nome,
        funcao: membro.funcao,
        capacidadeSemanal: membro.capacidadeSemanal,
      })),
    })),
    clientes,
    projetos: projetosDetalhados,
  };
}

export async function criarColaborador(
  agenciaId: string,
  dados: {
    nome: string;
    email?: string;
    funcao?: string;
    capacidadeSemanal?: number;
    equipeId?: string;
  },
) {
  const email =
    dados.email?.trim().toLowerCase() ||
    `colab-${Date.now()}-${randomBytes(3).toString("hex")}@headstock.local`;
  const senhaHash = await hashSenha(randomBytes(24).toString("hex"));

  if (dados.equipeId) await exigirEquipeAgencia(agenciaId, dados.equipeId);

  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        nome: dados.nome.trim(),
        email,
        senhaHash,
        status: "sem_acesso",
        papel: "COLLABORATOR",
        empresaId: agenciaId,
      },
    });
    if (dados.equipeId) {
      await tx.equipeMembro.create({
        data: {
          equipeId: dados.equipeId,
          usuarioId: usuario.id,
          funcao: dados.funcao?.trim() || null,
          capacidadeSemanal: dados.capacidadeSemanal ?? 40,
        },
      });
    }
    return usuario;
  });
}

export async function criarEquipe(
  agenciaId: string,
  dados: { nome: string; gestorId?: string; membrosIds?: string[] },
) {
  if (dados.gestorId) await exigirUsuarioAgencia(agenciaId, dados.gestorId);
  const membros = [...new Set(dados.membrosIds ?? [])];
  for (const usuarioId of membros) await exigirUsuarioAgencia(agenciaId, usuarioId);
  return prisma.equipe.create({
    data: {
      empresaId: agenciaId,
      nome: dados.nome.trim(),
      gestorId: dados.gestorId || null,
      membros: {
        create: membros.map((usuarioId) => ({
          usuarioId,
          capacidadeSemanal: 40,
        })),
      },
    },
  });
}

export async function criarClienteManual(
  agenciaId: string,
  dados: {
    nome: string;
    documento?: string;
    responsavelId?: string;
    contratoValor?: number;
    horasContratadas?: number;
  },
) {
  if (dados.responsavelId) {
    await exigirUsuarioAgencia(agenciaId, dados.responsavelId);
  }

  return prisma.clienteAgencia.create({
    data: {
      agenciaId,
      nome: dados.nome.trim(),
      documento: dados.documento?.trim() || null,
      responsavelId: dados.responsavelId || null,
      contratoValor: dados.contratoValor ?? null,
      horasContratadas: dados.horasContratadas ?? null,
      status: "ativo",
    },
  });
}

export async function criarProjetoManual(
  agenciaId: string,
  dados: {
    nome: string;
    clienteId: string;
    equipeId?: string;
    responsavelId?: string;
    participantesIds?: string[];
    horasPrevistas?: number;
    prazo?: string;
    proximaEntrega?: string;
    dataProximaEntrega?: string;
  },
) {
  await exigirClienteAgencia(agenciaId, dados.clienteId);
  if (dados.equipeId) await exigirEquipeAgencia(agenciaId, dados.equipeId);
  if (dados.responsavelId) await exigirUsuarioAgencia(agenciaId, dados.responsavelId);
  const participantes = [...new Set(dados.participantesIds ?? [])];
  for (const usuarioId of participantes) await exigirUsuarioAgencia(agenciaId, usuarioId);

  return prisma.projeto.create({
    data: {
      agenciaId,
      clienteId: dados.clienteId,
      equipeId: dados.equipeId || null,
      responsavelId: dados.responsavelId || null,
      nome: dados.nome.trim(),
      status: "EM_ANDAMENTO",
      horasPrevistas: dados.horasPrevistas ?? null,
      prazo: dados.prazo ? new Date(`${dados.prazo}T12:00:00`) : null,
      proximaEntrega: dados.proximaEntrega?.trim() || null,
      dataProximaEntrega: dados.dataProximaEntrega
        ? new Date(`${dados.dataProximaEntrega}T12:00:00`)
        : null,
      fonteImportacao: "manual",
      participantes: {
        create: participantes.map((usuarioId) => ({ usuarioId })),
      },
    },
  });
}

export async function registrarHorasManual(
  agenciaId: string,
  dados: {
    usuarioId: string;
    projetoId: string;
    data: string;
    horas: number;
    tipoAtividade?: string;
    faturavel?: boolean;
    observacao?: string;
  },
) {
  const [usuario, projeto] = await Promise.all([
    exigirUsuarioAgencia(agenciaId, dados.usuarioId),
    exigirProjetoAgencia(agenciaId, dados.projetoId),
  ]);
  return prisma.apontamentoHora.create({
    data: {
      agenciaId,
      usuarioId: usuario.id,
      nomeColaborador: usuario.nome,
      projetoId: projeto.id,
      clienteId: projeto.clienteId,
      data: new Date(`${dados.data}T12:00:00`),
      horas: dados.horas,
      tipoAtividade: dados.tipoAtividade?.trim() || "geral",
      faturavel: dados.faturavel ?? true,
      observacao: dados.observacao?.trim() || null,
      status: "APROVADO",
      fonteImportacao: "manual",
    },
  });
}

export async function atualizarProjetoManual(
  agenciaId: string,
  autorId: string,
  dados: {
    projetoId: string;
    progresso: number;
    saude: "NORMAL" | "ATENCAO" | "CRITICO";
    proximaEntrega?: string;
    dataProximaEntrega?: string;
    impedimento?: string;
  },
) {
  const projeto = await exigirProjetoAgencia(agenciaId, dados.projetoId);
  await exigirUsuarioAgencia(agenciaId, autorId);
  const atualizacao = {
    progresso: Math.min(100, Math.max(0, dados.progresso)),
    saude: dados.saude,
    proximaEntrega: dados.proximaEntrega?.trim() || null,
    dataProximaEntrega: dados.dataProximaEntrega
      ? new Date(`${dados.dataProximaEntrega}T12:00:00`)
      : null,
    impedimento: dados.impedimento?.trim() || null,
  };
  return prisma.$transaction([
    prisma.projeto.update({ where: { id: projeto.id }, data: atualizacao }),
    prisma.atualizacaoProjeto.create({
      data: { projetoId: projeto.id, autorId, ...atualizacao },
    }),
  ]);
}
