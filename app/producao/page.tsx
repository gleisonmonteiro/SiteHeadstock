"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
}

interface Movimentacao {
  id: string;
  etapa: Etapa;
  dataEntrada: string;
  dataSaida: string | null;
}

interface OP {
  id: string;
  numero: string;
  produto: string;
  referencia: string | null;
  oficina: string | null;
  qtdTotal: number;
  custoTotal: number;
  status: string;
  etapaAtualId: string | null;
  programacao: { etapas: Etapa[] };
  movimentacoes: Movimentacao[];
  createdAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function diasEntre(inicio: string, fim?: string | null) {
  const d1 = new Date(inicio).getTime();
  const d2 = fim ? new Date(fim).getTime() : Date.now();
  return Math.floor((d2 - d1) / 86_400_000);
}

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function diasNaEtapaAtual(op: OP): number | null {
  const movAtual = [...op.movimentacoes].reverse().find((m) => !m.dataSaida);
  if (!movAtual) return null;
  return diasEntre(movAtual.dataEntrada);
}

function corAlerta(dias: number) {
  if (dias > 10) return { bg: "bg-[#ef8e78]/15", text: "text-[#ef8e78]", label: "Crítico" };
  if (dias > 5) return { bg: "bg-[#e6c071]/15", text: "text-[#e6c071]", label: "Atenção" };
  return { bg: "bg-[#73d9cb]/15", text: "text-[#73d9cb]", label: "Normal" };
}

// ── Badges ─────────────────────────────────────────────────────────────────────

function BadgeStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    EM_ANDAMENTO: "bg-[#00B8C6]/20 text-[#00B8C6]",
    CONCLUIDA: "bg-[#C8F34D]/20 text-[#C8F34D]",
    AGUARDANDO: "bg-white/10 text-white/60",
    CANCELADA: "bg-red-500/20 text-red-400",
  };
  const label: Record<string, string> = {
    EM_ANDAMENTO: "Em andamento",
    CONCLUIDA: "Concluída",
    AGUARDANDO: "Aguardando",
    CANCELADA: "Cancelada",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-white/10 text-white/50"}`}
    >
      {label[status] ?? status}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProducaoPage() {
  const [ops, setOps] = useState<OP[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("EM_ANDAMENTO");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const buscarOps = async (status: string) => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/producao/ops?status=${status}`);
      const data = await r.json();
      setOps(data.ops ?? []);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarOps(filtroStatus);
  }, [filtroStatus]);

  const importar = async () => {
    if (!arquivo) return;
    setImportando(true);
    setMsgImport("");
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    try {
      const r = await fetch("/api/producao/imports", {
        method: "POST",
        body: fd,
      });
      const data = await r.json();
      if (data.sucesso) {
        setMsgImport(
          `Importadas: ${data.importadas} | Já existentes: ${data.atualizadas} | Erros: ${data.erros}`
        );
        setArquivo(null);
        if (fileRef.current) fileRef.current.value = "";
        buscarOps(filtroStatus);
      } else {
        setMsgImport(data.erro ?? "Erro na importação");
      }
    } catch {
      setMsgImport("Erro ao conectar com o servidor");
    } finally {
      setImportando(false);
    }
  };

  // Métricas derivadas
  const opsAndamento = ops.filter((o) => o.status === "EM_ANDAMENTO");
  const opsCriticas = opsAndamento.filter((o) => {
    const d = diasNaEtapaAtual(o);
    return d !== null && d > 10;
  });
  const opsAtencao = opsAndamento.filter((o) => {
    const d = diasNaEtapaAtual(o);
    return d !== null && d > 5 && d <= 10;
  });
  const opsNormais = opsAndamento.filter((o) => {
    const d = diasNaEtapaAtual(o);
    return d !== null && d <= 5;
  });

  // Por oficina
  const porOficina = new Map<string, { qtd: number; pecas: number; criticas: number }>();
  opsAndamento.forEach((op) => {
    const key = op.oficina ?? "Sem oficina";
    const cur = porOficina.get(key) ?? { qtd: 0, pecas: 0, criticas: 0 };
    const dias = diasNaEtapaAtual(op);
    porOficina.set(key, {
      qtd: cur.qtd + 1,
      pecas: cur.pecas + op.qtdTotal,
      criticas: cur.criticas + (dias !== null && dias > 10 ? 1 : 0),
    });
  });

  // Tempo médio por etapa (das OPs em andamento — etapa atual)
  const etapas = ops[0]?.programacao?.etapas ?? [];
  const porEtapa = new Map<string, { ops: number[]; opsIds: string[] }>();
  etapas.forEach((e) => porEtapa.set(e.id, { ops: [], opsIds: [] }));
  opsAndamento.forEach((op) => {
    if (op.etapaAtualId) {
      const movAtual = [...op.movimentacoes].reverse().find((m) => !m.dataSaida);
      if (movAtual) {
        const entry = porEtapa.get(op.etapaAtualId);
        if (entry) {
          entry.ops.push(diasEntre(movAtual.dataEntrada));
          entry.opsIds.push(op.id);
        }
      }
    }
  });

  // Kanban
  const kanbanPorEtapa = new Map<string, OP[]>();
  etapas.forEach((e) => kanbanPorEtapa.set(e.id, []));
  opsAndamento.forEach((op) => {
    if (op.etapaAtualId && kanbanPorEtapa.has(op.etapaAtualId)) {
      kanbanPorEtapa.get(op.etapaAtualId)!.push(op);
    }
  });

  return (
    <DashboardLayout titulo="Produção" descricao="Acompanhamento estratégico de Ordens de Produção">
      <div className="min-h-screen bg-[var(--bg-dark)] p-6 text-[#f2fbf8]">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#73d9cb]">Produção</h1>
            <p className="mt-1 text-sm text-[#b3ceca]">
              Acompanhamento estratégico de Ordens de Produção
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded border border-[var(--border-col)] bg-[var(--card-dark)] px-3 py-1.5 text-sm text-[#b3ceca] hover:text-white"
            >
              {arquivo ? arquivo.name : "Selecionar Excel"}
            </button>
            {arquivo && (
              <button
                onClick={importar}
                disabled={importando}
                className="rounded bg-[#00B8C6] px-3 py-1.5 text-sm font-semibold text-[#0A1F1F] disabled:opacity-50"
              >
                {importando ? "Importando..." : "Importar OPs"}
              </button>
            )}
          </div>
        </div>

        {msgImport && (
          <div className="mb-4 rounded border border-[var(--border-col)] bg-[var(--card-dark)] p-3 text-sm text-[#73d9cb]">
            {msgImport}
          </div>
        )}

        {/* ── Alertas estratégicos ───────────────────────────────────────── */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#ef8e78]/30 bg-[#ef8e78]/10 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#ef8e78]">
              Alerta crítico
            </p>
            <p className="mt-1 text-3xl font-extrabold text-[#ef8e78]">
              {opsCriticas.length}
            </p>
            <p className="mt-1 text-[11px] text-[#ef8e78]/70">
              OPs paradas há mais de 10 dias
            </p>
          </div>
          <div className="rounded-xl border border-[#e6c071]/30 bg-[#e6c071]/10 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#e6c071]">
              Atenção
            </p>
            <p className="mt-1 text-3xl font-extrabold text-[#e6c071]">
              {opsAtencao.length}
            </p>
            <p className="mt-1 text-[11px] text-[#e6c071]/70">
              OPs entre 6 e 10 dias na etapa
            </p>
          </div>
          <div className="rounded-xl border border-[#73d9cb]/25 bg-[#73d9cb]/8 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#73d9cb]">
              Fluxo normal
            </p>
            <p className="mt-1 text-3xl font-extrabold text-[#73d9cb]">
              {opsNormais.length}
            </p>
            <p className="mt-1 text-[11px] text-[#73d9cb]/70">
              OPs em andamento há até 5 dias
            </p>
          </div>
          <div className="rounded-xl border border-[#C8F34D]/25 bg-[#C8F34D]/8 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#C8F34D]">
              Concluídas
            </p>
            <p className="mt-1 text-3xl font-extrabold text-[#C8F34D]">
              {ops.filter((o) => o.status === "CONCLUIDA").length}
            </p>
            <p className="mt-1 text-[11px] text-[#C8F34D]/70">
              OPs finalizadas neste filtro
            </p>
          </div>
        </div>

        {/* ── Por oficina + Tempo por etapa ─────────────────────────────── */}
        {opsAndamento.length > 0 && (
          <div className="mb-5 grid gap-3 lg:grid-cols-2">
            {/* Por oficina */}
            <div className="rounded-xl border border-[var(--border-col)] bg-[var(--card-dark)] p-4">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
                Distribuição por Oficina
              </p>
              <div className="space-y-3">
                {Array.from(porOficina.entries()).map(
                  ([oficina, { qtd, pecas, criticas }]) => (
                    <div key={oficina} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-white truncate">
                            {oficina}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {criticas > 0 && (
                              <span className="rounded bg-[#ef8e78]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#ef8e78]">
                                {criticas} crítica{criticas > 1 ? "s" : ""}
                              </span>
                            )}
                            <span className="text-[11px] text-[#b3ceca]">
                              {qtd} OPs · {pecas.toLocaleString("pt-BR")} peças
                            </span>
                          </div>
                        </div>
                        <div className="relative h-1.5 overflow-hidden rounded-full bg-[#1F3A3A]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(qtd / opsAndamento.length) * 100}%`,
                              backgroundColor:
                                criticas > 0 ? "#ef8e78" : "#73d9cb",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}
                {porOficina.size === 0 && (
                  <p className="text-center text-[11px] text-[#789b96] py-2">
                    Nenhuma OP em andamento
                  </p>
                )}
              </div>
            </div>

            {/* Tempo médio por etapa */}
            <div className="rounded-xl border border-[var(--border-col)] bg-[var(--card-dark)] p-4">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
                Tempo médio por etapa (OPs ativas)
              </p>
              <div className="space-y-2.5">
                {etapas.map((etapa) => {
                  const entry = porEtapa.get(etapa.id);
                  const qtdEtapa = entry?.ops.length ?? 0;
                  const mediaDias =
                    qtdEtapa > 0
                      ? Math.round(
                          entry!.ops.reduce((s, d) => s + d, 0) / qtdEtapa
                        )
                      : 0;
                  const { text, label } = corAlerta(mediaDias);
                  return (
                    <div
                      key={etapa.id}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="font-semibold text-[#b3ceca]">
                        {etapa.nome}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#789b96]">
                          {qtdEtapa > 0
                            ? `${qtdEtapa} OP${qtdEtapa > 1 ? "s" : ""}`
                            : "—"}
                        </span>
                        {qtdEtapa > 0 && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${text}`}
                          >
                            {mediaDias}d méd · {label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {etapas.length === 0 && (
                  <p className="text-center text-[11px] text-[#789b96] py-2">
                    Sem programação cadastrada
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Filtros de status ─────────────────────────────────────────── */}
        <div className="mb-4 flex gap-2">
          {["EM_ANDAMENTO", "CONCLUIDA", "AGUARDANDO", "CANCELADA"].map(
            (s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                  filtroStatus === s
                    ? "bg-[#00B8C6] text-[#0A1F1F]"
                    : "border border-[var(--border-col)] text-[#b3ceca] hover:text-white"
                }`}
              >
                {
                  {
                    EM_ANDAMENTO: "Em Andamento",
                    CONCLUIDA: "Concluída",
                    AGUARDANDO: "Aguardando",
                    CANCELADA: "Cancelada",
                  }[s]
                }
              </button>
            )
          )}
        </div>

        {/* ── Pipeline Kanban ───────────────────────────────────────────── */}
        {filtroStatus === "EM_ANDAMENTO" && etapas.length > 0 && (
          <div className="mb-6 overflow-x-auto">
            <div
              className="flex gap-3 pb-2"
              style={{ minWidth: `${etapas.length * 200}px` }}
            >
              {etapas.map((etapa) => {
                const opsEtapa = kanbanPorEtapa.get(etapa.id) ?? [];
                const temCritica = opsEtapa.some((op) => {
                  const d = diasNaEtapaAtual(op);
                  return d !== null && d > 10;
                });
                return (
                  <div key={etapa.id} className="w-48 flex-shrink-0">
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${temCritica ? "text-[#ef8e78]" : "text-[#73d9cb]"}`}
                      >
                        {etapa.nome}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          temCritica
                            ? "bg-[#ef8e78]/20 text-[#ef8e78]"
                            : "bg-[#00B8C6]/20 text-[#00B8C6]"
                        }`}
                      >
                        {opsEtapa.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {opsEtapa.map((op) => {
                        const dias = diasNaEtapaAtual(op);
                        const alerta = dias !== null ? corAlerta(dias) : null;
                        return (
                          <div
                            key={op.id}
                            className={`rounded-lg border p-3 ${
                              alerta?.label === "Crítico"
                                ? "border-[#ef8e78]/30 bg-[#ef8e78]/5"
                                : alerta?.label === "Atenção"
                                  ? "border-[#e6c071]/25 bg-[#e6c071]/5"
                                  : "border-[var(--border-col)] bg-[var(--card-dark)]"
                            }`}
                          >
                            <p className="text-xs font-bold text-white">
                              OP {op.numero}
                            </p>
                            <p className="mt-0.5 text-[11px] leading-tight text-[#b3ceca]">
                              {op.produto}
                            </p>
                            {op.oficina && (
                              <p className="mt-0.5 text-[10px] text-[#789b96]">
                                {op.oficina}
                              </p>
                            )}
                            <p className="mt-1 text-[10px] text-[#789b96]">
                              {op.qtdTotal} peças
                            </p>
                            {dias !== null && alerta && (
                              <p
                                className={`mt-1 text-[10px] font-bold ${alerta.text}`}
                              >
                                {dias}d na etapa · {alerta.label}
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {opsEtapa.length === 0 && (
                        <p className="py-4 text-center text-[11px] text-[#789b96]/50">
                          —
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tabela ───────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-lg border border-[var(--border-col)] bg-[var(--card-dark)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-col)] text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
                <th className="px-4 py-3 text-left">OP</th>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left">Oficina</th>
                <th className="px-4 py-3 text-right">Peças</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-left">Etapa atual</th>
                <th className="px-4 py-3 text-left">Tempo na etapa</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {carregando ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-[#789b96]"
                  >
                    Carregando...
                  </td>
                </tr>
              ) : ops.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-[#789b96]"
                  >
                    Nenhuma OP encontrada
                  </td>
                </tr>
              ) : (
                ops.map((op) => {
                  const mov = [...op.movimentacoes]
                    .reverse()
                    .find((m) => !m.dataSaida);
                  const etapaNome = op.etapaAtualId
                    ? (op.programacao.etapas.find(
                        (e) => e.id === op.etapaAtualId
                      )?.nome ?? "—")
                    : "—";
                  const dias = diasNaEtapaAtual(op);
                  const alerta = dias !== null ? corAlerta(dias) : null;
                  return (
                    <tr
                      key={op.id}
                      className="border-b border-[var(--border-col)]/40 hover:bg-white/3"
                    >
                      <td className="px-4 py-3 font-bold text-white">
                        {op.numero}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-[#b3ceca]">
                        {op.produto}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#b3ceca]">
                        {op.oficina ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {op.qtdTotal.toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {op.custoTotal > 0
                          ? `R$ ${op.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-[#73d9cb]">
                        {etapaNome}
                      </td>
                      <td className="px-4 py-3">
                        {dias !== null && alerta ? (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${alerta.bg} ${alerta.text}`}
                          >
                            {dias}d · {alerta.label}
                          </span>
                        ) : mov ? (
                          <span className="text-[11px] text-[#789b96]">
                            desde {formatarData(mov.dataEntrada)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#789b96]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BadgeStatus status={op.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
