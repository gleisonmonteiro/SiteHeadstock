"use client";

import { useEffect, useState } from "react";
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
  dataPrevisaoRetorno: string | null;
}

interface OP {
  id: string;
  numero: string;
  produto: string;
  referencia: string | null;
  oficina: string | null;
  qtdTotal: number;
  status: string;
  etapaAtualId: string | null;
  programacao: { etapas: Etapa[] };
  movimentacoes: Movimentacao[];
}

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function diasNaEtapa(op: OP) {
  const movAtual = [...op.movimentacoes].reverse().find((m) => !m.dataSaida);
  if (!movAtual) return null;
  return Math.floor((Date.now() - new Date(movAtual.dataEntrada).getTime()) / 86_400_000);
}

function previsaoRetorno(op: OP) {
  const movAtual = [...op.movimentacoes].reverse().find((m) => !m.dataSaida);
  return movAtual?.dataPrevisaoRetorno ?? null;
}

export default function OperacionalPage() {
  const [ops, setOps] = useState<OP[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [opSelecionada, setOpSelecionada] = useState<OP | null>(null);
  const [observacao, setObservacao] = useState("");
  const [movendo, setMovendo] = useState(false);
  const [msg, setMsg] = useState("");

  const buscar = async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/producao/ops?status=EM_ANDAMENTO");
      const data = await r.json();
      setOps(data.ops ?? []);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { buscar(); }, []);

  const etapaAtual = (op: OP) => op.programacao.etapas.find((e) => e.id === op.etapaAtualId);
  const proximaEtapa = (op: OP) => {
    const atual = etapaAtual(op);
    if (!atual) return null;
    return op.programacao.etapas.find((e) => e.ordem === atual.ordem + 1) ?? null;
  };
  const ehUltimaEtapa = (op: OP) => {
    const atual = etapaAtual(op);
    if (!atual) return false;
    return atual.ordem === op.programacao.etapas.length;
  };

  const mover = async (op: OP) => {
    const prox = proximaEtapa(op);
    const ultima = ehUltimaEtapa(op);

    if (!prox && !ultima) {
      setMsg("Próxima etapa não encontrada");
      return;
    }

    setMovendo(true);
    setMsg("");
    try {
      const body = ultima
        ? { concluir: true }
        : { proximaEtapaId: prox!.id, observacao: observacao || undefined };

      const r = await fetch(`/api/producao/ops/${op.id}/movimentar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (data.sucesso) {
        setMsg(`OP ${op.numero} ${ultima ? "concluída" : `avançou para ${prox!.nome}`} com sucesso`);
        setOpSelecionada(null);
        setObservacao("");
        buscar();
      } else {
        setMsg(data.erro ?? "Erro ao movimentar");
      }
    } catch {
      setMsg("Erro ao conectar com o servidor");
    } finally {
      setMovendo(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[var(--bg-dark)] p-6 text-[#f2fbf8]">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#73d9cb]">Movimentação de OPs</h1>
          <p className="mt-1 text-sm text-[#b3ceca]">Selecione uma OP para registrar a passagem para a próxima etapa</p>
        </div>

        {msg && (
          <div className="mb-4 rounded border border-[var(--border-col)] bg-[var(--card-dark)] p-3 text-sm text-[#73d9cb]">
            {msg}
          </div>
        )}

        {/* Modal de confirmação */}
        {opSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-[var(--border-col)] bg-[var(--card-dark)] p-6">
              <h2 className="mb-1 text-lg font-bold text-white">Movimentar OP {opSelecionada.numero}</h2>
              <p className="mb-1 text-sm text-[#b3ceca]">{opSelecionada.produto}</p>
              <div className="my-4 flex items-center gap-3">
                <span className="rounded bg-[#00B8C6]/20 px-3 py-1 text-sm font-bold text-[#00B8C6]">
                  {etapaAtual(opSelecionada)?.nome ?? "—"}
                </span>
                <span className="text-[#789b96]">→</span>
                <span className={`rounded px-3 py-1 text-sm font-bold ${ehUltimaEtapa(opSelecionada) ? "bg-[#C8F34D]/20 text-[#C8F34D]" : "bg-white/10 text-white"}`}>
                  {ehUltimaEtapa(opSelecionada) ? "CONCLUÍDA" : proximaEtapa(opSelecionada)?.nome ?? "—"}
                </span>
              </div>
              <p className="mb-2 text-xs text-[#789b96]">
                Data e hora são registradas automaticamente pelo sistema.
              </p>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observação (opcional)"
                rows={2}
                className="mb-4 w-full rounded border border-[var(--border-col)] bg-[#0A1F1F] px-3 py-2 text-sm text-white placeholder-[#789b96] focus:outline-none focus:border-[#00B8C6]"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setOpSelecionada(null); setObservacao(""); }}
                  className="flex-1 rounded border border-[var(--border-col)] py-2 text-sm text-[#b3ceca] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => mover(opSelecionada)}
                  disabled={movendo}
                  className={`flex-1 rounded py-2 text-sm font-bold disabled:opacity-50 ${
                    ehUltimaEtapa(opSelecionada)
                      ? "bg-[#C8F34D] text-[#0A1F1F]"
                      : "bg-[#00B8C6] text-[#0A1F1F]"
                  }`}
                >
                  {movendo ? "Registrando..." : ehUltimaEtapa(opSelecionada) ? "Concluir OP" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de OPs */}
        {carregando ? (
          <p className="text-center text-[#789b96] py-12">Carregando OPs...</p>
        ) : ops.length === 0 ? (
          <div className="rounded-lg border border-[var(--border-col)] bg-[var(--card-dark)] p-8 text-center text-[#789b96]">
            Nenhuma OP em andamento no momento
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ops.map((op) => {
              const atual = etapaAtual(op);
              const prox = proximaEtapa(op);
              const ultima = ehUltimaEtapa(op);
              const dias = diasNaEtapa(op);
              const prev = previsaoRetorno(op);
              const atrasada = prev && new Date(prev) < new Date() && !ultima;

              return (
                <div
                  key={op.id}
                  className={`rounded-xl border bg-[var(--card-dark)] p-4 transition-colors ${
                    atrasada ? "border-red-500/50" : "border-[var(--border-col)]"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-bold text-white">OP {op.numero}</p>
                      <p className="text-xs text-[#b3ceca] leading-tight mt-0.5">{op.produto}</p>
                    </div>
                    {atrasada && (
                      <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                        Atrasada
                      </span>
                    )}
                  </div>

                  <div className="mb-3 space-y-1 text-xs text-[#789b96]">
                    <p>Peças: <span className="text-white">{op.qtdTotal.toLocaleString("pt-BR")}</span></p>
                    {op.oficina && <p>Oficina: <span className="text-[#b3ceca]">{op.oficina}</span></p>}
                    {dias !== null && <p>Na etapa há: <span className={dias > 7 ? "text-red-400 font-semibold" : "text-white"}>{dias}d</span></p>}
                    {prev && <p>Prev. retorno: <span className="text-[#b3ceca]">{formatarData(prev)}</span></p>}
                  </div>

                  <div className="mb-3 flex items-center gap-2 text-xs">
                    <span className="rounded bg-[#00B8C6]/20 px-2 py-0.5 font-semibold text-[#00B8C6]">
                      {atual?.nome ?? "—"}
                    </span>
                    {(prox || ultima) && (
                      <>
                        <span className="text-[#789b96]">→</span>
                        <span className={`rounded px-2 py-0.5 font-semibold ${ultima ? "bg-[#C8F34D]/20 text-[#C8F34D]" : "bg-white/10 text-white/60"}`}>
                          {ultima ? "CONCLUIR" : prox!.nome}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => { setOpSelecionada(op); setMsg(""); }}
                    className={`w-full rounded py-2 text-sm font-bold transition-colors ${
                      ultima
                        ? "bg-[#C8F34D]/20 text-[#C8F34D] hover:bg-[#C8F34D]/30"
                        : "bg-[#00B8C6]/20 text-[#00B8C6] hover:bg-[#00B8C6]/30"
                    }`}
                  >
                    {ultima ? "Concluir OP" : "Avançar etapa"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
