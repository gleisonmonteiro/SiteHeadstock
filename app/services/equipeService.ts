import { prisma } from "@/lib/prisma";

function inicioDaSemana(d: Date) {
  const inicio = new Date(d);
  inicio.setHours(0, 0, 0, 0);
  const dia = inicio.getDay();
  inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1));
  return inicio;
}

function inicioDoMes(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function adicionarDias(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function arredondar(v: number, casas = 1) {
  const f = 10 ** casas;
  return Math.round(v * f) / f;
}

function slugNome(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
}

// ─── Visão geral de equipes ────────────────────────────────────────────────────

export async function obterEquipes(agenciaId: string) {
  const agora = new Date();
  const inicioSemana = inicioDaSemana(agora);
  const fimSemana = adicionarDias(inicioSemana, 7);
  const inicioMes = inicioDoMes(agora);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const [equipes, apontamentosMes, apontamentosSemana] = await Promise.all([
    prisma.equipe.findMany({
      where: { empresaId: agenciaId, status: "ativa" },
      include: {
        gestor: { select: { nome: true } },
        membros: {
          include: { usuario: { select: { id: true, nome: true } } },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.apontamentoHora.findMany({
      where: {
        agenciaId,
        data: { gte: inicioMes, lt: fimMes },
        status: { in: ["ENVIADO", "APROVADO"] },
      },
      select: {
        nomeColaborador: true,
        horas: true,
        faturavel: true,
        projeto: { select: { nome: true } },
        cliente: { select: { nome: true } },
      },
    }),
    prisma.apontamentoHora.findMany({
      where: {
        agenciaId,
        data: { gte: inicioSemana, lt: fimSemana },
        status: { in: ["ENVIADO", "APROVADO"] },
      },
      select: { nomeColaborador: true, horas: true },
    }),
  ]);

  type ColabMetrics = { horasMes: number; horasSemana: number; projetos: Set<string>; clientes: Set<string> };
  const metricas = new Map<string, ColabMetrics>();

  for (const ap of apontamentosMes) {
    const chave = slugNome(ap.nomeColaborador || "(sem nome)");
    if (!metricas.has(chave)) {
      metricas.set(chave, { horasMes: 0, horasSemana: 0, projetos: new Set(), clientes: new Set() });
    }
    const m = metricas.get(chave)!;
    m.horasMes += ap.horas;
    if (ap.projeto?.nome) m.projetos.add(ap.projeto.nome);
    if (ap.cliente?.nome) m.clientes.add(ap.cliente.nome);
  }

  for (const ap of apontamentosSemana) {
    const chave = slugNome(ap.nomeColaborador || "(sem nome)");
    if (!metricas.has(chave)) {
      metricas.set(chave, { horasMes: 0, horasSemana: 0, projetos: new Set(), clientes: new Set() });
    }
    metricas.get(chave)!.horasSemana += ap.horas;
  }

  const nomesComEquipe = new Set<string>();

  const equipesDetalhadas = equipes.map((equipe) => {
    const membros = equipe.membros.map((membro) => {
      const chave = slugNome(membro.usuario.nome);
      nomesComEquipe.add(chave);
      const m = metricas.get(chave);
      const horasSemana = arredondar(m?.horasSemana ?? 0);
      const horasMes = arredondar(m?.horasMes ?? 0);
      const cap = membro.capacidadeSemanal;
      return {
        id: membro.usuarioId,
        nome: membro.usuario.nome,
        funcao: membro.funcao,
        capacidadeSemanal: cap,
        horasSemana,
        horasMes,
        utilizacao: cap > 0 ? Math.round((horasSemana / cap) * 100) : null,
        projetos: [...(m?.projetos ?? [])],
        clientes: [...(m?.clientes ?? [])],
      };
    });

    const capacidade = membros.reduce((s, m) => s + m.capacidadeSemanal, 0);
    const horasSemanaTotal = membros.reduce((s, m) => s + m.horasSemana, 0);
    const ocupacao = capacidade > 0 ? Math.round((horasSemanaTotal / capacidade) * 100) : 0;

    return {
      id: equipe.id,
      nome: equipe.nome,
      gestor: equipe.gestor?.nome ?? "Sem gestor",
      membros,
      capacidade,
      horasSemana: arredondar(horasSemanaTotal),
      ocupacao,
      statusOcupacao:
        ocupacao > 100 ? "SOBRECARGA" : ocupacao >= 85 ? "ATENCAO" : "NORMAL",
    };
  });

  // Colaboradores vindos do Operand que ainda não têm equipe no Headstock
  const semEquipe = [...metricas.entries()]
    .filter(([chave]) => !nomesComEquipe.has(chave))
    .map(([, m]) => {
      // Resgata nome original das listas (usa o primeiro apontamento do mês que bate)
      const ap = apontamentosMes.find((a) => slugNome(a.nomeColaborador) === [...nomesComEquipe].find(() => false) || true);
      return {
        nome: ap?.nomeColaborador ?? "(colaborador)",
        horasSemana: arredondar(m.horasSemana),
        horasMes: arredondar(m.horasMes),
        projetos: [...m.projetos],
        clientes: [...m.clientes],
      };
    });

  // Reconstrução com nome real (o Map usa slug como chave)
  const semEquipeReal = (() => {
    const result: typeof semEquipe = [];
    const vistos = new Set<string>();
    for (const ap of [...apontamentosMes, ...apontamentosSemana]) {
      const nome = ap.nomeColaborador || "(sem nome)";
      const chave = slugNome(nome);
      if (!nomesComEquipe.has(chave) && !vistos.has(chave)) {
        vistos.add(chave);
        const m = metricas.get(chave)!;
        result.push({
          nome,
          horasSemana: arredondar(m.horasSemana),
          horasMes: arredondar(m.horasMes),
          projetos: [...m.projetos],
          clientes: [...m.clientes],
        });
      }
    }
    return result;
  })();

  return { equipes: equipesDetalhadas, semEquipe: semEquipeReal };
}

// ─── Detalhe de uma equipe ─────────────────────────────────────────────────────

export async function obterEquipeDetalhe(agenciaId: string, equipeId: string) {
  const agora = new Date();
  const inicioSemana = inicioDaSemana(agora);
  const fimSemana = adicionarDias(inicioSemana, 7);
  const inicioMes = inicioDoMes(agora);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  const [equipe, apontamentosMes, apontamentosSemana] = await Promise.all([
    prisma.equipe.findFirst({
      where: { id: equipeId, empresaId: agenciaId },
      include: {
        gestor: { select: { nome: true } },
        membros: {
          include: { usuario: { select: { id: true, nome: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.apontamentoHora.findMany({
      where: {
        agenciaId,
        data: { gte: inicioMes, lt: fimMes },
        status: { in: ["ENVIADO", "APROVADO"] },
      },
      select: {
        id: true,
        nomeColaborador: true,
        data: true,
        horas: true,
        tipoAtividade: true,
        faturavel: true,
        observacao: true,
        projeto: { select: { id: true, nome: true } },
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { data: "desc" },
    }),
    prisma.apontamentoHora.findMany({
      where: {
        agenciaId,
        data: { gte: inicioSemana, lt: fimSemana },
        status: { in: ["ENVIADO", "APROVADO"] },
      },
      select: { nomeColaborador: true, horas: true },
    }),
  ]);

  if (!equipe) return null;

  const semanaPorColab = new Map<string, number>();
  for (const ap of apontamentosSemana) {
    const k = slugNome(ap.nomeColaborador);
    semanaPorColab.set(k, (semanaPorColab.get(k) ?? 0) + ap.horas);
  }

  const membros = equipe.membros.map((membro) => {
    const chave = slugNome(membro.usuario.nome);
    const apMembro = apontamentosMes.filter((a) => slugNome(a.nomeColaborador) === chave);
    const horasMes = apMembro.reduce((s, a) => s + a.horas, 0);
    const horasSemana = semanaPorColab.get(chave) ?? 0;
    const cap = membro.capacidadeSemanal;

    // Últimos 10 apontamentos deste colaborador
    const ultimosApontamentos = apMembro.slice(0, 10).map((a) => ({
      id: a.id,
      data: a.data.toISOString().split("T")[0],
      horas: a.horas,
      tipoAtividade: a.tipoAtividade,
      faturavel: a.faturavel,
      observacao: a.observacao,
      projetoNome: a.projeto?.nome,
      clienteNome: a.cliente?.nome,
    }));

    const projetos = [...new Set(apMembro.map((a) => a.projeto?.nome).filter(Boolean))];
    const clientes = [...new Set(apMembro.map((a) => a.cliente?.nome).filter(Boolean))];

    return {
      id: membro.usuarioId,
      nome: membro.usuario.nome,
      funcao: membro.funcao,
      capacidadeSemanal: cap,
      horasSemana: arredondar(horasSemana),
      horasMes: arredondar(horasMes),
      utilizacao: cap > 0 ? Math.round((horasSemana / cap) * 100) : null,
      projetos,
      clientes,
      ultimosApontamentos,
    };
  });

  const capacidade = membros.reduce((s, m) => s + m.capacidadeSemanal, 0);
  const horasSemanaTotal = membros.reduce((s, m) => s + m.horasSemana, 0);
  const ocupacao = capacidade > 0 ? Math.round((horasSemanaTotal / capacidade) * 100) : 0;

  return {
    id: equipe.id,
    nome: equipe.nome,
    gestor: equipe.gestor?.nome ?? "Sem gestor",
    capacidade,
    horasSemana: arredondar(horasSemanaTotal),
    ocupacao,
    statusOcupacao: ocupacao > 100 ? "SOBRECARGA" : ocupacao >= 85 ? "ATENCAO" : "NORMAL",
    membros,
  };
}
