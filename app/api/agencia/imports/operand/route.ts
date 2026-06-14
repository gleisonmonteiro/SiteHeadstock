import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import {
  detectarTipoAba,
  importarTimesheetDetalhadoOperand,
  importarProjetosOperand,
  importarJobsOperand,
  importarClientesOperand,
  importarApontamentoResumoOperand,
} from "@/services/importOperandService";

// Nomes de abas reais do Operand ag (export direto) + nomes genéricos
const ABA_MODULO: Record<string, string> = {
  // Export real Operand — Timesheet Detalhado
  "relatório de timesheet": "timesheet",
  "relatorio de timesheet": "timesheet",
  timesheet: "timesheet",
  apontamentos: "timesheet",
  "apontamento de horas": "timesheet",
  horas: "timesheet",

  // Export real Operand — Jobs Pauta
  "relatório de jobs pauta": "jobs",
  "relatorio de jobs pauta": "jobs",
  "relatório de jobs": "relatorio_jobs",
  jobs: "jobs",
  job: "jobs",
  tarefas: "jobs",
  tarefa: "jobs",
  pauta: "jobs",

  // Export real Operand — Projetos Pauta
  "relatório de projetos pauta": "projetos",
  "relatorio de projetos pauta": "projetos",
  "relatório de projetos": "projetos",
  projetos: "projetos",
  projeto: "projetos",

  // Export real Operand — Clientes
  "relatório de clientes": "clientes",
  "relatorio de clientes": "clientes",
  clientes: "clientes",
};

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.empresa.tipo !== "AGENCIA") {
      return NextResponse.json({ erro: "Acesso restrito a agências" }, { status: 403 });
    }

    const agenciaId = usuario.empresaId;
    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File;
    const nomeColaborador = String(formData.get("nomeColaborador") ?? usuario.nome ?? "desconhecido");

    if (!arquivo) return NextResponse.json({ erro: "Arquivo é obrigatório" }, { status: 400 });
    const ext = arquivo.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls"].includes(ext ?? "")) {
      return NextResponse.json({ erro: "Somente .xlsx ou .xls são aceitos" }, { status: 400 });
    }

    const buffer = await arquivo.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const resultados: Record<
      string,
      { importados: number; erros: number; ignorado?: boolean; detalhe?: string }
    > = {};

    for (const nomeAba of workbook.SheetNames) {
      const abaKey = nomeAba.toLowerCase().trim();
      let modulo = ABA_MODULO[abaKey];

      const ws = workbook.Sheets[nomeAba];
      const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (linhas.length === 0) {
        resultados[nomeAba] = { importados: 0, erros: 0, ignorado: true };
        continue;
      }

      // Fallback: detecta tipo pelo conteúdo das colunas quando o nome não bate
      if (!modulo) modulo = detectarTipoAba(linhas) ?? "";

      if (!modulo) {
        resultados[nomeAba] = { importados: 0, erros: 0, ignorado: true };
        continue;
      }

      if (modulo === "timesheet") {
        const r = await importarTimesheetDetalhadoOperand(agenciaId, linhas);
        resultados[nomeAba] = {
          importados: r.importados,
          erros: r.erros.length,
          detalhe: `${r.grupos} entradas agregadas`,
        };
      } else if (modulo === "projetos") {
        const r = await importarProjetosOperand(agenciaId, linhas);
        resultados[nomeAba] = {
          importados: r.projetosImportados + r.jobsImportados,
          erros: r.erros.length,
          detalhe: `${r.projetosImportados} projetos, ${r.jobsImportados} jobs`,
        };
      } else if (modulo === "jobs" || modulo === "relatorio_jobs") {
        const r = await importarJobsOperand(agenciaId, linhas);
        resultados[nomeAba] = { importados: r.importados, erros: r.erros.length };
      } else if (modulo === "clientes") {
        const r = await importarClientesOperand(agenciaId, linhas);
        resultados[nomeAba] = { importados: r.importados, erros: r.erros.length };
      } else if (modulo === "apontamento_resumido") {
        const r = await importarApontamentoResumoOperand(agenciaId, linhas, nomeColaborador);
        resultados[nomeAba] = { importados: r.importados, erros: r.erros.length };
      }
    }

    return NextResponse.json({ sucesso: true, abas: resultados });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao processar arquivo Operand");
  }
}
