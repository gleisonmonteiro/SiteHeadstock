import { prisma } from "@/lib/prisma";

// ─── helpers ──────────────────────────────────────────────────────────────────

function norm(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    for (const variant of [k, k.toLowerCase(), k.toUpperCase()]) {
      const v = row[variant];
      if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
    }
  }
  return undefined;
}

function normFloat(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  const s = norm(row, ...keys);
  if (!s) return undefined;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? undefined : n;
}

function normDate(row: Record<string, unknown>, ...keys: string[]): Date | undefined {
  const s = norm(row, ...keys);
  if (!s) return undefined;

  // Serial Excel com ou sem fração de hora (ex: 46182 ou 46182.73106)
  if (/^\d{5,}(\.\d*)?$/.test(s)) {
    const serial = Math.floor(parseFloat(s));
    // Excel epoch: 1 = 01/01/1900; a fórmula correta é -1 por causa do bug do ano bissexto de 1900
    const date = new Date(1899, 11, 30);
    date.setDate(date.getDate() + serial);
    return date;
  }

  // DD/MM/YYYY
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(`${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`);

  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// HH:MM → decimal (ex: "01:03" → 1.05)
function parseHorasHHMM(raw: string): number | undefined {
  const m = raw.match(/^(\d+):(\d{2})$/);
  if (m) return parseInt(m[1]) + parseInt(m[2]) / 60;
  const n = parseFloat(raw.replace(",", "."));
  return isNaN(n) ? undefined : n;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// ─── Cache de clientes dentro do lote ─────────────────────────────────────────

async function upsertCliente(agenciaId: string, nome: string, cache: Map<string, string>) {
  const key = slugify(nome);
  if (cache.has(key)) return cache.get(key)!;
  const c = await prisma.clienteAgencia.upsert({
    where: { agenciaId_nome: { agenciaId, nome } },
    update: {},
    create: { agenciaId, nome, status: "ativo" },
  });
  cache.set(key, c.id);
  return c.id;
}

// ─── Status mapping Operand → Headstock ───────────────────────────────────────

const STATUS_PROJETO: Record<string, string> = {
  "em andamento": "EM_ANDAMENTO",
  "em_andamento": "EM_ANDAMENTO",
  ativo: "EM_ANDAMENTO",
  aberto: "EM_ANDAMENTO",
  "concluido": "CONCLUIDO",
  "concluído": "CONCLUIDO",
  finalizado: "CONCLUIDO",
  cancelado: "CANCELADO",
  pausado: "PAUSADO",
  planejamento: "PLANEJAMENTO",
};

// ─── Detecção automática do tipo de aba pelo header ───────────────────────────

export function detectarTipoAba(linhas: Record<string, unknown>[]): string | null {
  if (linhas.length === 0) return null;
  const keys = Object.keys(linhas[0]).map((k) => slugify(k));

  // Timesheet detalhado (Operand): Usuário + Tempo + Data Fim
  if (keys.some((k) => k === "usuario" || k === "usuário") && keys.includes("tempo")) {
    return "timesheet";
  }

  // Jobs / Pauta: Situação do Job
  if (keys.some((k) => k.includes("situacao do job") || k.includes("situação do job"))) {
    return "jobs";
  }

  // Projetos Pauta: Situação do Projeto
  if (keys.some((k) => k.includes("situacao do projeto") || k.includes("situação do projeto"))) {
    return "projetos";
  }

  // Clientes Operand: CNPJ / CPF
  if (keys.some((k) => k.includes("cnpj"))) {
    return "clientes";
  }

  // Apontamento por cliente (resumido): Horas apontadas + Cliente
  if (keys.some((k) => k.includes("horas apontadas")) && keys.includes("cliente")) {
    return "apontamento_resumido";
  }

  return null;
}

// ─── 1. Timesheet Detalhado (Relatório de Timesheet) ──────────────────────────
// Colunas reais: Nº Doc | Grupo de Clientes | Projeto | Título Doc | Usuário |
//                Descrição timesheet | Tipo | Data Fim | RT | Tempo
//
// ATENÇÃO: "Tempo" é fração de DIA, não hora → multiplicar por 24.
// Timer cria N entradas pequenas por job/dia → agregamos antes de salvar.

export async function importarTimesheetDetalhadoOperand(
  agenciaId: string,
  linhas: Record<string, unknown>[]
) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];

  type Entrada = {
    usuario: string;
    dateISO: string;
    numDoc: string;
    projetoNome: string;
    clienteNome: string;
    tituloDOC: string;
    descricao: string;
    retrabalho: boolean;
    horas: number;
  };

  const entradas: Entrada[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];

    const usuario = norm(
      row,
      "Usuário", "usuario", "Usuário ", "Colaborador", "colaborador", "Nome", "nome"
    );
    const tempo = normFloat(row, "Tempo", "tempo");
    const dataFim = normDate(row, "Data Fim", "Data", "data", "Date", "data fim");

    if (!usuario || !tempo || !dataFim) continue;

    const horas = tempo * 24; // Tempo está em fração de DIA
    if (horas <= 0.0001) continue; // descarta entradas irrelevantes (< ~6 segundos)

    const numDoc =
      norm(row, "Nº Doc", "nº doc", "Nr Doc", "Nr. Doc", "N Doc", "ndoc", "Id", "id") ?? "";
    const clienteNome =
      norm(row, "Grupo de Clientes", "grupo de clientes", "Cliente", "cliente") ?? "";
    const projetoNome = norm(row, "Projeto", "projeto") ?? "";
    const tituloDOC =
      norm(row, "Título Doc", "titulo doc", "Título", "titulo", "Título Doc ") ?? "";
    const descricao =
      norm(row, "Descrição timesheet", "descricao timesheet", "Descrição", "descricao", "Observação") ?? "";
    const rtRaw = norm(row, "RT", "Retrabalho", "retrabalho") ?? "";
    const retrabalho = ["sim", "yes", "true", "1"].includes(slugify(rtRaw));

    entradas.push({
      usuario,
      dateISO: dataFim.toISOString().split("T")[0],
      numDoc: numDoc || slugify(tituloDOC),
      projetoNome,
      clienteNome,
      tituloDOC,
      descricao,
      retrabalho,
      horas,
    });
  }

  // Agrega múltiplas entradas de Timer pelo mesmo job/dia/usuário
  type Grupo = Omit<Entrada, "horas"> & { horasTotal: number };
  const grupos = new Map<string, Grupo>();

  for (const e of entradas) {
    const chave = `${slugify(e.usuario)}|${e.dateISO}|${e.numDoc}|${slugify(e.projetoNome)}`;
    if (!grupos.has(chave)) {
      grupos.set(chave, { ...e, horasTotal: 0 });
    }
    grupos.get(chave)!.horasTotal += e.horas;
  }

  // Cache de projetos para evitar N queries
  const projetoCache = new Map<string, { id: string; clienteId: string | null }>();
  const clienteCache = new Map<string, string>();

  for (const [chave, g] of grupos) {
    const idExterno = `op|ts|${chave}`;

    try {
      let projetoId: string | undefined;
      let clienteId: string | undefined;

      if (g.clienteNome) {
        clienteId = await upsertCliente(agenciaId, g.clienteNome, clienteCache);
      }

      if (g.projetoNome) {
        const projKey = slugify(g.projetoNome);
        const cached = projetoCache.get(projKey);
        if (cached) {
          projetoId = cached.id;
          if (!clienteId && cached.clienteId) clienteId = cached.clienteId;
        } else {
          const proj = await prisma.projeto.findFirst({
            where: { agenciaId, nome: { equals: g.projetoNome, mode: "insensitive" } },
            select: { id: true, clienteId: true },
          });
          if (proj) {
            projetoId = proj.id;
            if (!clienteId && proj.clienteId) clienteId = proj.clienteId;
            projetoCache.set(projKey, proj);
          } else {
            // Projeto ainda não foi importado — cria stub para o link funcionar.
            // Quando o Relatório de Projetos for importado depois, o upsert pelo idExterno
            // do Operand criará o registro definitivo (este stub fica obsoleto mas não conflita).
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stub = await (prisma as any).projeto.upsert({
              where: { agenciaId_idExterno: { agenciaId, idExterno: `auto|ts|${projKey}` } },
              update: { nome: g.projetoNome, clienteId: clienteId ?? null },
              create: {
                agenciaId,
                nome: g.projetoNome,
                idExterno: `auto|ts|${projKey}`,
                clienteId: clienteId ?? null,
                status: "PLANEJAMENTO",
              },
              select: { id: true, clienteId: true },
            }) as { id: string; clienteId: string | null };
            projetoId = stub.id;
            projetoCache.set(projKey, stub);
          }
        }
      }

      const horasArred = Math.round(g.horasTotal * 100) / 100;
      const tipoAtividade = g.tituloDOC || g.descricao || "geral";

      await prisma.apontamentoHora.upsert({
        where: { agenciaId_idExterno: { agenciaId, idExterno } },
        update: {
          horas: horasArred,
          tipoAtividade,
          faturavel: !g.retrabalho,
          observacao: g.descricao || null,
          projetoId: projetoId ?? null,
          clienteId: clienteId ?? null,
        },
        create: {
          agenciaId,
          nomeColaborador: g.usuario,
          data: new Date(g.dateISO),
          horas: horasArred,
          tipoAtividade,
          faturavel: !g.retrabalho,
          observacao: g.descricao || null,
          status: "APROVADO",
          idExterno,
          fonteImportacao: "operand",
          projetoId: projetoId ?? null,
          clienteId: clienteId ?? null,
        },
      });
      importados++;
    } catch {
      erros.push({ linha: -1, erro: `Erro ao salvar apontamento de ${g.usuario} em ${g.dateISO}` });
    }
  }

  return { importados, erros, grupos: grupos.size };
}

// ─── 2. Jobs Detalhado (Relatório de Jobs Pauta) ──────────────────────────────
// Colunas reais: Nº Doc | Tipo Doc | Título | Grupo de Clientes | Projeto |
//                Empresa | Status | Situação do Job | Situação da Tarefa |
//                Data de criação | Data Início | Prazo | Data de Conclusão |
//                Concluído no prazo | Tarefas concluídas | Tarefas |
//                Tempo Realizado em Minutos | Tempo Estimado em Minutos | Responsável

export async function importarJobsOperand(
  agenciaId: string,
  linhas: Record<string, unknown>[]
) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];
  const clienteCache = new Map<string, string>();
  const projetoCache = new Map<string, string>();

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];

    const nome = norm(
      row,
      "Título", "titulo", "Job", "job", "Nome", "nome", "Título Doc", "titulo doc"
    );
    const idOperand = norm(
      row,
      "Nº Doc", "nº doc", "Nr Doc", "Nr. Doc", "Id", "id", "Código", "codigo"
    );

    if (!nome && !idOperand) continue;

    const idExterno = idOperand ? `op|job|${idOperand}` : `op|job|${slugify(nome ?? "")}`;

    const clienteNome = norm(
      row,
      "Grupo de Clientes", "grupo de clientes", "Empresa", "empresa", "Cliente", "cliente"
    );
    const projetoNome = norm(row, "Projeto", "projeto");
    const nomeResponsavel = norm(row, "Responsável", "responsavel", "Responsible");
    const prazo = normDate(row, "Prazo", "prazo", "Prazo Doc", "prazo doc", "Deadline");
    const categoria = norm(row, "Tipo Doc", "tipo doc", "Tipo", "tipo", "Categoria");

    const statusRaw =
      norm(row, "Situação do Job", "situacao do job", "Status", "status", "Situação", "situacao") ?? "";
    const statusSlug = slugify(statusRaw);
    const status = ["concluido", "concluído", "finalizado", "done", "closed"].includes(statusSlug)
      ? "concluido"
      : ["cancelado"].includes(statusSlug)
      ? "cancelado"
      : "aberto";

    try {
      let clienteId: string | undefined;
      if (clienteNome) clienteId = await upsertCliente(agenciaId, clienteNome, clienteCache);

      let projetoId: string | undefined;
      if (projetoNome) {
        const projKey = slugify(projetoNome);
        if (projetoCache.has(projKey)) {
          projetoId = projetoCache.get(projKey);
        } else {
          const proj = await prisma.projeto.findFirst({
            where: { agenciaId, nome: { equals: projetoNome, mode: "insensitive" } },
            select: { id: true },
          });
          if (proj) {
            projetoId = proj.id;
            projetoCache.set(projKey, proj.id);
          }
        }
      }

      await prisma.job.upsert({
        where: { agenciaId_idExterno: { agenciaId, idExterno } },
        update: { nome: nome ?? idExterno, nomeResponsavel, status, prazo, categoria, projetoId, clienteId },
        create: {
          agenciaId,
          nome: nome ?? idExterno,
          nomeResponsavel,
          status,
          prazo,
          categoria,
          idExterno,
          clienteId,
          projetoId,
        },
      });
      importados++;
    } catch {
      erros.push({ linha: i + 2, erro: `Erro ao salvar job: ${nome ?? idOperand}` });
    }
  }

  return { importados, erros };
}

// ─── 3. Projetos Pauta (Relatório de Projetos Pauta) ──────────────────────────
// Colunas reais: Cliente | Grupo de Clientes | Projeto | Responsável | Empresa |
//                Situação do Projeto | Data criação | Prazo desejado | Prazo estimado |
//                Nº Doc | Tipo Doc | Título Doc | Status | Custos externos | ...
//
// Cada linha pode ser um projeto (tem Situação do Projeto) e/ou um job (tem Nº Doc).
// Processamos ambos na mesma passagem.

export async function importarProjetosOperand(
  agenciaId: string,
  linhas: Record<string, unknown>[]
) {
  let projetosImportados = 0;
  let jobsImportados = 0;
  const erros: { linha: number; erro: string }[] = [];
  const clienteCache = new Map<string, string>();
  const projetoCache = new Map<string, { id: string }>();

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];

    const projetoNome = norm(row, "Projeto", "projeto");
    const clienteNome =
      norm(row, "Cliente", "cliente", "Grupo de Clientes", "grupo de clientes", "Empresa") ?? "";
    const situacaoProjeto = norm(
      row,
      "Situação do Projeto", "situacao do projeto", "Status do Projeto", "situacao"
    );

    // — Linha com dados de projeto —
    if (projetoNome && situacaoProjeto) {
      const idExterno = `op|proj|${slugify(projetoNome)}|${slugify(clienteNome)}`;
      const statusRaw = slugify(situacaoProjeto);
      const status = STATUS_PROJETO[statusRaw] ?? "EM_ANDAMENTO";
      const prazo =
        normDate(row, "Prazo estimado", "prazo estimado", "Prazo desejado", "prazo desejado", "Prazo", "prazo") ??
        undefined;
      const dataInicio = normDate(row, "Data criação", "data criacao", "Data de criação") ?? undefined;

      try {
        let clienteId: string | undefined;
        if (clienteNome) clienteId = await upsertCliente(agenciaId, clienteNome, clienteCache);

        if (!clienteId) {
          erros.push({ linha: i + 2, erro: `Projeto "${projetoNome}" sem cliente — ignorado` });
          continue;
        }

        const proj = await prisma.projeto.upsert({
          where: { agenciaId_idExterno: { agenciaId, idExterno } },
          update: { nome: projetoNome, status: status as never, prazo, dataInicio },
          create: {
            agenciaId,
            clienteId,
            nome: projetoNome,
            status: status as never,
            prazo,
            dataInicio,
            idExterno,
            fonteImportacao: "operand",
          },
        });

        projetoCache.set(slugify(projetoNome), { id: proj.id });
        projetosImportados++;
      } catch {
        erros.push({ linha: i + 2, erro: `Erro ao salvar projeto "${projetoNome}"` });
      }
    }

    // — Linha com dados de job —
    const idOperand = norm(row, "Nº Doc", "nº doc", "Nr Doc");
    const tituloDoc = norm(row, "Título Doc", "titulo doc", "Título", "titulo");
    if (idOperand && tituloDoc) {
      const idExterno = `op|job|${idOperand}`;
      const statusRaw = slugify(
        norm(row, "Status", "status", "Situação do doc", "situacao do doc") ?? ""
      );
      const status = ["concluido", "concluído", "finalizado"].includes(statusRaw)
        ? "concluido"
        : "aberto";
      const prazo = normDate(row, "Prazo Doc", "prazo doc", "Prazo", "prazo") ?? undefined;

      try {
        let projetoId: string | undefined;
        if (projetoNome) {
          const cached = projetoCache.get(slugify(projetoNome));
          if (cached) {
            projetoId = cached.id;
          } else {
            const proj = await prisma.projeto.findFirst({
              where: { agenciaId, nome: { equals: projetoNome, mode: "insensitive" } },
              select: { id: true },
            });
            if (proj) {
              projetoId = proj.id;
              projetoCache.set(slugify(projetoNome), { id: proj.id });
            }
          }
        }

        let clienteId: string | undefined;
        if (clienteNome) clienteId = await upsertCliente(agenciaId, clienteNome, clienteCache);

        await prisma.job.upsert({
          where: { agenciaId_idExterno: { agenciaId, idExterno } },
          update: { nome: tituloDoc, status, prazo, projetoId, clienteId },
          create: {
            agenciaId,
            nome: tituloDoc,
            status,
            prazo,
            idExterno,
            projetoId,
            clienteId,
          },
        });
        jobsImportados++;
      } catch {
        erros.push({ linha: i + 2, erro: `Erro ao salvar job "${tituloDoc}"` });
      }
    }
  }

  return { projetosImportados, jobsImportados, erros };
}

// ─── 4. Clientes Operand ──────────────────────────────────────────────────────
// Colunas reais: Nome | CNPJ / CPF | E-mail | Telefone | Cidade | Estado | Situação

export async function importarClientesOperand(
  agenciaId: string,
  linhas: Record<string, unknown>[]
) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const nome = norm(row, "Nome", "nome");
    if (!nome) continue;

    const situacaoRaw = norm(row, "Situação", "situacao", "Status", "status") ?? "Ativo";
    const status = slugify(situacaoRaw) === "inativo" ? "inativo" : "ativo";

    try {
      await prisma.clienteAgencia.upsert({
        where: { agenciaId_nome: { agenciaId, nome } },
        update: { status },
        create: { agenciaId, nome, status },
      });
      importados++;
    } catch {
      erros.push({ linha: i + 2, erro: `Erro ao salvar cliente "${nome}"` });
    }
  }

  return { importados, erros };
}

// ─── 5. Apontamento por Cliente Resumido ──────────────────────────────────────
// Colunas reais: Cliente | Projeto | Retrabalho | Horas estimadas | Horas apontadas |
//                Valor apontamentos - R$ | Valor/Hora (Média) - R$
//
// Não tem data nem colaborador individual — gera uma visão agregada por cliente/projeto.
// Armazena como apontamento do mês atual com o nome do colaborador informado na chamada.

export async function importarApontamentoResumoOperand(
  agenciaId: string,
  linhas: Record<string, unknown>[],
  nomeColaborador: string,
  mesRef: Date = new Date()
) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];
  const clienteCache = new Map<string, string>();
  const projetoCache = new Map<string, { id: string; clienteId: string | null }>();

  // Usa o primeiro dia do mês de referência como data
  const dataRef = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
  const dataISO = dataRef.toISOString().split("T")[0];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const clienteNome = norm(row, "Cliente", "cliente");
    const projetoNome = norm(row, "Projeto", "projeto");
    const horasRaw = norm(row, "Horas apontadas", "horas apontadas", "Horas", "horas");

    if (!horasRaw || !clienteNome) continue;
    if (slugify(clienteNome).startsWith("total")) continue; // filtra linha de totais

    const horas = parseHorasHHMM(horasRaw);
    if (!horas || horas <= 0) continue;

    const idExterno = `op|resumo|${slugify(nomeColaborador)}|${dataISO}|${slugify(clienteNome)}|${slugify(projetoNome ?? "")}`;

    try {
      let clienteId: string | undefined;
      clienteId = await upsertCliente(agenciaId, clienteNome, clienteCache);

      let projetoId: string | undefined;
      if (projetoNome) {
        const projKey = slugify(projetoNome);
        const cached = projetoCache.get(projKey);
        if (cached) {
          projetoId = cached.id;
        } else {
          const proj = await prisma.projeto.findFirst({
            where: { agenciaId, nome: { equals: projetoNome, mode: "insensitive" } },
            select: { id: true, clienteId: true },
          });
          if (proj) {
            projetoId = proj.id;
            if (!clienteId && proj.clienteId) clienteId = proj.clienteId;
            projetoCache.set(projKey, proj);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const stub = await (prisma as any).projeto.upsert({
              where: { agenciaId_idExterno: { agenciaId, idExterno: `auto|resumo|${projKey}` } },
              update: { nome: projetoNome, clienteId: clienteId ?? null },
              create: {
                agenciaId,
                nome: projetoNome,
                idExterno: `auto|resumo|${projKey}`,
                clienteId: clienteId ?? null,
                status: "PLANEJAMENTO",
              },
              select: { id: true, clienteId: true },
            }) as { id: string; clienteId: string | null };
            projetoId = stub.id;
            projetoCache.set(projKey, stub);
          }
        }
      }

      await prisma.apontamentoHora.upsert({
        where: { agenciaId_idExterno: { agenciaId, idExterno } },
        update: { horas },
        create: {
          agenciaId,
          nomeColaborador,
          data: dataRef,
          horas,
          tipoAtividade: projetoNome ?? "geral",
          faturavel: true,
          status: "APROVADO",
          idExterno,
          fonteImportacao: "operand_resumo",
          clienteId,
          projetoId,
        },
      });
      importados++;
    } catch {
      erros.push({ linha: i + 2, erro: `Erro ao salvar resumo de ${clienteNome}/${projetoNome}` });
    }
  }

  return { importados, erros };
}
