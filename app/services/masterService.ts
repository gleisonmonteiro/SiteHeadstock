import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../.generated/client";

// Exclui a empresa-plataforma do Gleison (tipo AGENCIA mas com papel MASTER)
const FILTRO_AGENCIA_CLIENTE: Prisma.EmpresaWhereInput = {
  tipo: "AGENCIA",
  status: "ativo",
  usuarios: { none: { papel: { in: ["MASTER_PLATFORM", "MASTER_CONSULTANT"] } } },
};

// ─── Overview global da plataforma ───────────────────────────────────────────

export async function obterOverviewPlataforma() {
  const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const mesAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalAgencias,
    totalEmpresas,
    totalUsuarios,
    totalClientes,
    totalProjetos,
    totalJobs,
    totalApontamentos,
    uploadsTotal,
    uploadsMes,
    horasSemana,
  ] = await Promise.all([
    prisma.empresa.count({ where: FILTRO_AGENCIA_CLIENTE }),
    prisma.empresa.count({ where: { status: "ativo" } }),
    prisma.usuario.count({ where: { status: "ativo" } }),
    prisma.clienteAgencia.count(),
    prisma.projeto.count({ where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] } } }),
    prisma.job.count({ where: { status: { not: "concluido" } } }),
    prisma.apontamentoHora.count(),
    prisma.upload.count(),
    prisma.upload.count({ where: { createdAt: { gte: mesAtras } } }),
    prisma.apontamentoHora.aggregate({
      _sum: { horas: true },
      where: { data: { gte: semanaAtras } },
    }),
  ]);

  // Gauge de capacidade Vercel Hobby → Pro → AWS
  const cargaScore = Math.min(
    100,
    Math.round((totalEmpresas / 50) * 40 + (uploadsMes / 200) * 40 + (totalUsuarios / 200) * 20)
  );
  const recomendacaoInfra =
    cargaScore < 30
      ? "Vercel Hobby"
      : cargaScore < 60
      ? "Vercel Pro"
      : cargaScore < 85
      ? "AWS / Railway"
      : "AWS dedicado";

  return {
    totalAgencias,
    totalEmpresas,
    totalUsuarios,
    totalClientes,
    totalProjetos,
    totalJobs,
    totalApontamentos,
    uploadsTotal,
    uploadsMes,
    horasSemana: Math.round((horasSemana._sum.horas ?? 0) * 10) / 10,
    infra: { cargaScore, recomendacao: recomendacaoInfra },
  };
}

// ─── Agências com métricas ────────────────────────────────────────────────────

export async function obterAgenciasParaMaster() {
  const semanaAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const diasAtras30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const agencias = await prisma.empresa.findMany({
    where: FILTRO_AGENCIA_CLIENTE,
    orderBy: { createdAt: "asc" },
    include: {
      usuarios: { where: { status: "ativo" }, select: { id: true, nome: true, papel: true } },
      clientesAssistidos: {
        select: {
          id: true,
          nome: true,
          status: true,
          projetos: {
            where: { status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
            select: { id: true, nome: true, status: true, saude: true, prazo: true, progresso: true },
          },
        },
      },
      apontamentosHora: {
        where: { data: { gte: semanaAtras } },
        select: { horas: true },
      },
      uploads: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, tipo: true, nomeArquivo: true },
      },
    },
  });

  return agencias.map((a) => {
    const todosProjetosAtivos = a.clientesAssistidos.flatMap((c) => c.projetos);
    const projetosCriticos = todosProjetosAtivos.filter((p) => p.saude === "CRITICO");
    const projetosAtencao = todosProjetosAtivos.filter((p) => p.saude === "ATENCAO");
    const horasSemana = a.apontamentosHora.reduce((s, ap) => s + ap.horas, 0);
    const ultimoUpload = a.uploads[0]?.createdAt ?? null;
    const inativo = !ultimoUpload || ultimoUpload < diasAtras30;

    const saude: "NORMAL" | "ATENCAO" | "CRITICO" | "INATIVO" = projetosCriticos.length > 0
      ? "CRITICO"
      : projetosAtencao.length > 0
      ? "ATENCAO"
      : inativo && a.clientesAssistidos.length > 0
      ? "INATIVO"
      : "NORMAL";

    return {
      id: a.id,
      nome: a.nome,
      totalUsuarios: a.usuarios.length,
      totalClientes: a.clientesAssistidos.length,
      totalProjetosAtivos: todosProjetosAtivos.length,
      projetosCriticos: projetosCriticos.length,
      projetosAtencao: projetosAtencao.length,
      horasSemana: Math.round(horasSemana * 10) / 10,
      ultimoUpload,
      saude,
      clientes: a.clientesAssistidos.slice(0, 8).map((c) => ({
        id: c.id,
        nome: c.nome,
        status: c.status,
        projetosAtivos: c.projetos.length,
        projetosCriticos: c.projetos.filter((p) => p.saude === "CRITICO").length,
      })),
    };
  });
}

// ─── Alertas críticos cross-agência ──────────────────────────────────────────

export async function obterAlertasMaster() {
  const agora = new Date();
  const diasAtras7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [criticos, vencidos, atencao, jobsVencidos] = await Promise.all([
    prisma.projeto.findMany({
      where: { saude: "CRITICO", status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      include: {
        agencia: { select: { id: true, nome: true } },
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 15,
    }),
    prisma.projeto.findMany({
      where: {
        prazo: { lt: agora },
        status: { notIn: ["CONCLUIDO", "CANCELADO"] },
      },
      include: {
        agencia: { select: { id: true, nome: true } },
        cliente: { select: { id: true, nome: true } },
      },
      orderBy: { prazo: "asc" },
      take: 10,
    }),
    prisma.projeto.findMany({
      where: { saude: "ATENCAO", status: { notIn: ["CONCLUIDO", "CANCELADO"] } },
      include: {
        agencia: { select: { id: true, nome: true } },
        cliente: { select: { id: true, nome: true } },
      },
      take: 10,
    }),
    prisma.job.findMany({
      where: {
        prazo: { lt: agora, gte: diasAtras7 },
        status: { not: "concluido" },
      },
      include: {
        agencia: { select: { id: true, nome: true } },
        cliente: { select: { nome: true } },
      },
      take: 10,
    }),
  ]);

  const mapProjeto = (p: typeof criticos[0], nivel: string) => ({
    id: p.id,
    nome: p.nome,
    agenciaId: p.agencia.id,
    agencia: p.agencia.nome,
    clienteId: p.cliente.id,
    cliente: p.cliente.nome,
    prazo: p.prazo,
    nivel,
    tipo: "projeto" as const,
  });

  return {
    total: criticos.length + vencidos.length + atencao.length + jobsVencidos.length,
    alertas: [
      ...criticos.map((p) => mapProjeto(p, "CRITICO")),
      ...vencidos.map((p) => mapProjeto(p, "VENCIDO")),
      ...jobsVencidos.map((j) => ({
        id: j.id,
        nome: j.nome,
        agenciaId: j.agencia.id,
        agencia: j.agencia.nome,
        clienteId: "",
        cliente: j.cliente?.nome ?? "—",
        prazo: j.prazo,
        nivel: "VENCIDO",
        tipo: "job" as const,
      })),
      ...atencao.map((p) => mapProjeto(p, "ATENCAO")),
    ],
  };
}

// ─── Feed de atividade recente ────────────────────────────────────────────────

export async function obterAtividadeRecente() {
  const [uploads, apontamentos] = await Promise.all([
    prisma.upload.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { empresa: { select: { nome: true } } },
    }),
    prisma.apontamentoHora.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        agencia: { select: { nome: true } },
        projeto: { select: { nome: true } },
      },
      distinct: ["agenciaId"],
    }),
  ]);

  const eventos = [
    ...uploads.map((u) => ({
      id: u.id,
      tipo: "upload" as const,
      empresa: u.empresa.nome,
      descricao: `${u.tipo} — ${u.linhasImportadas} linhas`,
      createdAt: u.createdAt,
    })),
    ...apontamentos.map((a) => ({
      id: a.id,
      tipo: "import" as const,
      empresa: a.agencia.nome,
      descricao: `Timesheet — ${a.projeto?.nome ?? "sem projeto"}`,
      createdAt: a.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 12);

  return eventos;
}
