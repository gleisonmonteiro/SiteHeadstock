import { prisma } from "@/lib/prisma";

const STATUS_PROJETO_ATIVO = ["PLANEJAMENTO", "EM_ANDAMENTO", "PAUSADO"] as const;

function inicioDoDia(data: Date) {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function inicioDaSemana(data: Date) {
  const inicio = inicioDoDia(data);
  const dia = inicio.getDay();
  inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1));
  return inicio;
}

function inicioDoMes(data: Date) {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

function adicionarDias(data: Date, dias: number) {
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

function percentual(parte: number, total: number) {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

function arredondar(valor: number, casas = 1) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

export async function obterResumoAgencia(agenciaId: string | null) {
  const agora = new Date();
  const hoje = inicioDoDia(agora);
  const inicioSemana = inicioDaSemana(agora);
  const fimSemana = adicionarDias(inicioSemana, 7);
  const inicioSemanaAnterior = adicionarDias(inicioSemana, -7);
  const inicioMes = inicioDoMes(agora);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  // undefined é ignorado pelo Prisma no where (sem filtro); null filtraria por IS NULL
  const id = agenciaId ?? undefined;

  const [
    clientes,
    projetos,
    apontamentosMes,
    apontamentosSemana,
    apontamentosSemanaAnterior,
    equipes,
  ] = await Promise.all([
    prisma.clienteAgencia.findMany({
      where: { agenciaId: id, status: "ativo" },
      include: {
        responsavel: { select: { nome: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.projeto.findMany({
      where: {
        agenciaId: id,
        status: { in: [...STATUS_PROJETO_ATIVO] },
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        responsavel: { select: { nome: true } },
        equipe: { select: { id: true, nome: true } },
        apontamentos: { select: { horas: true } },
        atualizacoes: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [{ saude: "desc" }, { prazo: "asc" }],
    }),
    prisma.apontamentoHora.findMany({
      where: {
        agenciaId: id,
        data: { gte: inicioMes, lt: fimMes },
        status: { in: ["ENVIADO", "APROVADO"] },
      },
      select: {
        usuarioId: true,
        clienteId: true,
        projetoId: true,
        horas: true,
        faturavel: true,
      },
    }),
    prisma.apontamentoHora.findMany({
      where: {
        agenciaId: id,
        data: { gte: inicioSemana, lt: fimSemana },
        status: { in: ["ENVIADO", "APROVADO"] },
      },
      select: { usuarioId: true, horas: true, faturavel: true },
    }),
    prisma.apontamentoHora.aggregate({
      where: {
        agenciaId: id,
        data: { gte: inicioSemanaAnterior, lt: inicioSemana },
        status: { in: ["ENVIADO", "APROVADO"] },
      },
      _sum: { horas: true },
    }),
    prisma.equipe.findMany({
      where: { empresaId: id, status: "ativa" },
      include: {
        gestor: { select: { nome: true } },
        membros: {
          include: {
            usuario: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
  ]);

  const membrosPorUsuario = new Map<
    string,
    {
      nome: string;
      capacidadeSemanal: number;
      custoHora: number | null;
    }
  >();

  for (const equipe of equipes) {
    for (const membro of equipe.membros) {
      if (!membrosPorUsuario.has(membro.usuarioId)) {
        membrosPorUsuario.set(membro.usuarioId, {
          nome: membro.usuario.nome,
          capacidadeSemanal: membro.capacidadeSemanal,
          custoHora: membro.custoHora,
        });
      }
    }
  }

  const horasSemanaPorUsuario = new Map<string, number>();
  for (const apontamento of apontamentosSemana) {
    if (!apontamento.usuarioId) continue;
    horasSemanaPorUsuario.set(
      apontamento.usuarioId,
      (horasSemanaPorUsuario.get(apontamento.usuarioId) ?? 0) + apontamento.horas
    );
  }

  const horasMesPorCliente = new Map<string, number>();
  const horasMesPorUsuario = new Map<string, number>();
  let horasMes = 0;
  let horasFaturaveisMes = 0;

  for (const apontamento of apontamentosMes) {
    horasMes += apontamento.horas;
    if (apontamento.faturavel) horasFaturaveisMes += apontamento.horas;

    if (apontamento.clienteId) {
      horasMesPorCliente.set(
        apontamento.clienteId,
        (horasMesPorCliente.get(apontamento.clienteId) ?? 0) + apontamento.horas
      );
    }

    if (apontamento.usuarioId) {
      horasMesPorUsuario.set(
        apontamento.usuarioId,
        (horasMesPorUsuario.get(apontamento.usuarioId) ?? 0) + apontamento.horas
      );
    }
  }

  const receitaContratada = clientes.reduce(
    (total, cliente) => total + (cliente.contratoValor ?? 0),
    0
  );
  const horasContratadas = clientes.reduce(
    (total, cliente) => total + (cliente.horasContratadas ?? 0),
    0
  );
  const maiorContrato = clientes.reduce(
    (maior, cliente) => Math.max(maior, cliente.contratoValor ?? 0),
    0
  );
  const capacidadeSemanal = [...membrosPorUsuario.values()].reduce(
    (total, membro) => total + membro.capacidadeSemanal,
    0
  );
  const horasSemana = apontamentosSemana.reduce(
    (total, item) => total + item.horas,
    0
  );
  const horasSemanaAnterior = apontamentosSemanaAnterior._sum.horas ?? 0;

  let custoApontado = 0;
  let horasComCusto = 0;
  for (const [usuarioId, horas] of horasMesPorUsuario) {
    const custoHora = membrosPorUsuario.get(usuarioId)?.custoHora;
    if (custoHora !== null && custoHora !== undefined) {
      custoApontado += horas * custoHora;
      horasComCusto += horas;
    }
  }
  const coberturaCustos = percentual(horasComCusto, horasMes);
  const margemContribuicao =
    receitaContratada > 0 && coberturaCustos === 100
      ? percentual(receitaContratada - custoApontado, receitaContratada)
      : null;

  const projetosPorCliente = new Map<string, typeof projetos>();
  for (const projeto of projetos) {
    const lista = projetosPorCliente.get(projeto.clienteId) ?? [];
    lista.push(projeto);
    projetosPorCliente.set(projeto.clienteId, lista);
  }

  const carteira = clientes.map((cliente) => {
    const projetosCliente = projetosPorCliente.get(cliente.id) ?? [];
    const horasConsumidas = horasMesPorCliente.get(cliente.id) ?? 0;
    const consumoContrato = percentual(
      horasConsumidas,
      cliente.horasContratadas ?? 0
    );
    const riscos = projetosCliente.filter(
      (projeto) => projeto.saude !== "NORMAL"
    ).length;

    let statusEconomico: "SAUDAVEL" | "ATENCAO" | "ESTOURADO" | "SEM_FRANQUIA" =
      "SAUDAVEL";
    if (!cliente.horasContratadas) statusEconomico = "SEM_FRANQUIA";
    else if (consumoContrato > 100) statusEconomico = "ESTOURADO";
    else if (consumoContrato >= 80) statusEconomico = "ATENCAO";

    return {
      id: cliente.id,
      nome: cliente.nome,
      responsavel: cliente.responsavel?.nome ?? "Sem responsável",
      contratoValor: cliente.contratoValor ?? 0,
      participacaoReceita: percentual(
        cliente.contratoValor ?? 0,
        receitaContratada
      ),
      horasContratadas: cliente.horasContratadas ?? 0,
      horasConsumidas: arredondar(horasConsumidas),
      consumoContrato,
      projetosAtivos: projetosCliente.length,
      riscos,
      statusEconomico,
      conectado: Boolean(cliente.empresaConectadaId),
    };
  });

  const alertas: Array<{
    id: string;
    severidade: "CRITICO" | "ATENCAO" | "INFO";
    categoria: "PROJETO" | "CONTRATO" | "EQUIPE" | "DADO";
    titulo: string;
    detalhe: string;
    acao: string;
  }> = [];

  for (const projeto of projetos) {
    const horasConsumidas = projeto.apontamentos.reduce(
      (total, item) => total + item.horas,
      0
    );
    const consumo = percentual(horasConsumidas, projeto.horasPrevistas ?? 0);
    const diasParaPrazo = projeto.prazo
      ? Math.ceil((projeto.prazo.getTime() - hoje.getTime()) / 86_400_000)
      : null;
    const ultimaAtualizacao =
      projeto.atualizacoes[0]?.createdAt ?? projeto.updatedAt;
    const diasSemAtualizacao = Math.floor(
      (hoje.getTime() - inicioDoDia(ultimaAtualizacao).getTime()) / 86_400_000
    );

    if (projeto.saude === "CRITICO") {
      alertas.push({
        id: `critico-${projeto.id}`,
        severidade: "CRITICO",
        categoria: "PROJETO",
        titulo: `${projeto.nome} está crítico`,
        detalhe: `${projeto.cliente.nome}: ${projeto.progresso}% concluído e ${consumo}% das horas consumidas.`,
        acao: projeto.impedimento
          ? `Resolver impedimento: ${projeto.impedimento}`
          : "Revisar escopo, prazo e responsável hoje.",
      });
    } else if (consumo >= 85 && projeto.progresso < 70) {
      alertas.push({
        id: `horas-${projeto.id}`,
        severidade: consumo >= 100 ? "CRITICO" : "ATENCAO",
        categoria: "PROJETO",
        titulo: `${projeto.nome} pressiona o orçamento`,
        detalhe: `${consumo}% das horas consumidas para ${projeto.progresso}% de progresso.`,
        acao: "Reestimar o saldo e alinhar escopo com o cliente.",
      });
    }

    if (diasParaPrazo !== null && diasParaPrazo < 0) {
      alertas.push({
        id: `atraso-${projeto.id}`,
        severidade: "CRITICO",
        categoria: "PROJETO",
        titulo: `${projeto.nome} está atrasado`,
        detalhe: `Prazo vencido há ${Math.abs(diasParaPrazo)} dia(s).`,
        acao: "Definir novo compromisso e comunicar o cliente.",
      });
    } else if (diasParaPrazo !== null && diasParaPrazo <= 7) {
      alertas.push({
        id: `prazo-${projeto.id}`,
        severidade: "ATENCAO",
        categoria: "PROJETO",
        titulo: `${projeto.nome} vence em ${diasParaPrazo} dia(s)`,
        detalhe: `${projeto.progresso}% concluído para ${projeto.cliente.nome}.`,
        acao: "Confirmar próxima entrega e remover bloqueios.",
      });
    }

    if (diasSemAtualizacao > 7) {
      alertas.push({
        id: `atualizacao-${projeto.id}`,
        severidade: "ATENCAO",
        categoria: "DADO",
        titulo: `${projeto.nome} está sem atualização`,
        detalhe: `Última atualização gerencial há ${diasSemAtualizacao} dias.`,
        acao: "Solicitar atualização semanal ao responsável.",
      });
    }
  }

  for (const cliente of carteira) {
    if (cliente.statusEconomico === "ESTOURADO") {
      alertas.push({
        id: `contrato-${cliente.id}`,
        severidade: "CRITICO",
        categoria: "CONTRATO",
        titulo: `${cliente.nome} excedeu a franquia`,
        detalhe: `${cliente.horasConsumidas}h consumidas de ${cliente.horasContratadas}h no mês.`,
        acao: "Avaliar cobrança adicional ou ajuste do contrato.",
      });
    } else if (cliente.statusEconomico === "ATENCAO") {
      alertas.push({
        id: `contrato-${cliente.id}`,
        severidade: "ATENCAO",
        categoria: "CONTRATO",
        titulo: `${cliente.nome} já consumiu ${cliente.consumoContrato}%`,
        detalhe: `${cliente.horasConsumidas}h de ${cliente.horasContratadas}h contratadas.`,
        acao: "Revisar demanda restante antes de novas solicitações.",
      });
    }
  }

  for (const [usuarioId, membro] of membrosPorUsuario) {
    if ((horasSemanaPorUsuario.get(usuarioId) ?? 0) === 0) {
      alertas.push({
        id: `apontamento-${usuarioId}`,
        severidade: "ATENCAO",
        categoria: "EQUIPE",
        titulo: `${membro.nome} está sem apontamento`,
        detalhe: "Nenhuma hora enviada ou aprovada na semana atual.",
        acao: "Solicitar o fechamento do apontamento semanal.",
      });
    }
  }

  if (coberturaCustos < 100) {
    alertas.push({
      id: "cobertura-custos",
      severidade: "INFO",
      categoria: "DADO",
      titulo: "Margem ainda não é confiável",
      detalhe: `${coberturaCustos}% das horas do mês possuem custo-hora configurado.`,
      acao: "Cadastrar custo-hora da equipe para acompanhar margem por cliente.",
    });
  }

  const ordemSeveridade = { CRITICO: 0, ATENCAO: 1, INFO: 2 };
  alertas.sort(
    (a, b) => ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade]
  );

  const equipesResumo = equipes.map((equipe) => {
    const capacidade = equipe.membros.reduce(
      (total, membro) => total + membro.capacidadeSemanal,
      0
    );
    const horas = equipe.membros.reduce(
      (total, membro) =>
        total + (horasSemanaPorUsuario.get(membro.usuarioId) ?? 0),
      0
    );
    const ocupacao = percentual(horas, capacidade);

    return {
      id: equipe.id,
      nome: equipe.nome,
      gestor: equipe.gestor?.nome ?? "Sem gestor",
      pessoas: equipe.membros.length,
      capacidade: arredondar(capacidade),
      horas: arredondar(horas),
      ocupacao,
      status:
        ocupacao > 100 ? "SOBRECARGA" : ocupacao >= 85 ? "ATENCAO" : "NORMAL",
    };
  });

  const proximasEntregas = projetos
    .filter((projeto) => projeto.dataProximaEntrega || projeto.prazo)
    .sort((a, b) => {
      const dataA = a.dataProximaEntrega ?? a.prazo!;
      const dataB = b.dataProximaEntrega ?? b.prazo!;
      return dataA.getTime() - dataB.getTime();
    })
    .slice(0, 5)
    .map((projeto) => ({
      id: projeto.id,
      nome: projeto.proximaEntrega ?? projeto.nome,
      projeto: projeto.nome,
      cliente: projeto.cliente.nome,
      responsavel: projeto.responsavel?.nome ?? "Sem responsável",
      data: projeto.dataProximaEntrega ?? projeto.prazo,
      progresso: projeto.progresso,
      saude: projeto.saude,
    }));

  const projetosEmRisco = projetos.filter(
    (projeto) => projeto.saude !== "NORMAL"
  ).length;
  const alertasCriticos = alertas.filter(
    (alerta) => alerta.severidade === "CRITICO"
  ).length;

  return {
    periodo: {
      referencia: agora,
      inicioMes,
      inicioSemana,
    },
    indicadores: {
      receitaContratada,
      ticketMedio:
        clientes.length > 0 ? arredondar(receitaContratada / clientes.length, 2) : 0,
      margemContribuicao,
      coberturaCustos,
      custoApontado: arredondar(custoApontado, 2),
      concentracaoMaiorCliente: percentual(maiorContrato, receitaContratada),
      clientesAtivos: clientes.length,
      projetosAtivos: projetos.length,
      projetosEmRisco,
      alertasCriticos,
      colaboradores: membrosPorUsuario.size,
      horasMes: arredondar(horasMes),
      horasContratadas: arredondar(horasContratadas),
      consumoContratos: percentual(horasMes, horasContratadas),
      horasSemana: arredondar(horasSemana),
      capacidadeSemanal: arredondar(capacidadeSemanal),
      ocupacaoSemanal: percentual(horasSemana, capacidadeSemanal),
      variacaoHorasSemana:
        horasSemanaAnterior > 0
          ? Math.round(
              ((horasSemana - horasSemanaAnterior) / horasSemanaAnterior) * 100
            )
          : null,
      faturabilidade: percentual(horasFaturaveisMes, horasMes),
      receitaPorHoraContratada:
        horasContratadas > 0
          ? arredondar(receitaContratada / horasContratadas, 2)
          : 0,
    },
    carteira,
    equipes: equipesResumo,
    alertas: alertas.slice(0, 10),
    proximasEntregas,
  };
}
