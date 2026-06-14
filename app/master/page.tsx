"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Infra {
  cargaScore: number;
  recomendacao: string;
}

interface Overview {
  totalAgencias: number;
  totalEmpresas: number;
  totalUsuarios: number;
  totalClientes: number;
  totalProjetos: number;
  totalJobs: number;
  totalApontamentos: number;
  uploadsTotal: number;
  uploadsMes: number;
  horasSemana: number;
  infra: Infra;
}

interface ClienteCard {
  id: string;
  nome: string;
  status: string;
  projetosAtivos: number;
  projetosCriticos: number;
}

interface Agencia {
  id: string;
  nome: string;
  totalUsuarios: number;
  totalClientes: number;
  totalProjetosAtivos: number;
  projetosCriticos: number;
  projetosAtencao: number;
  horasSemana: number;
  ultimoUpload: string | null;
  saude: "NORMAL" | "ATENCAO" | "CRITICO" | "INATIVO";
  clientes: ClienteCard[];
}

interface Alerta {
  id: string;
  nome: string;
  agenciaId: string;
  agencia: string;
  clienteId: string;
  cliente: string;
  prazo: string | null;
  nivel: string;
  tipo: "projeto" | "job";
}

interface Evento {
  id: string;
  tipo: "upload" | "import";
  empresa: string;
  descricao: string;
  createdAt: string;
}

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const SAUDE_DOT: Record<string, string> = {
  NORMAL: "bg-emerald-400",
  ATENCAO: "bg-yellow-400",
  CRITICO: "bg-red-500 animate-pulse",
  INATIVO: "bg-slate-500",
};
const SAUDE_BORDA: Record<string, string> = {
  NORMAL: "border-emerald-500/20",
  ATENCAO: "border-yellow-500/30",
  CRITICO: "border-red-500/40",
  INATIVO: "border-slate-600/30",
};
const NIVEL_COR: Record<string, string> = {
  CRITICO: "text-red-400 bg-red-500/10 border-red-500/25",
  VENCIDO: "text-orange-400 bg-orange-500/10 border-orange-500/25",
  ATENCAO: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
};

function RelTime({ iso }: { iso: string | null }) {
  if (!iso) return <span className="text-slate-500">nunca</span>;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return <span>{min}min atrás</span>;
  const h = Math.floor(min / 60);
  if (h < 24) return <span>{h}h atrás</span>;
  const d = Math.floor(h / 24);
  return <span>{d}d atrás</span>;
}

function GaugeBar({ score, label }: { score: number; label: string }) {
  const cor =
    score < 30 ? "bg-emerald-500" : score < 60 ? "bg-yellow-500" : score < 85 ? "bg-orange-500" : "bg-red-500";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className={score < 30 ? "text-emerald-400" : score < 60 ? "text-yellow-400" : "text-red-400"}>
          {score}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${cor}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Componente de card de agência ────────────────────────────────────────────

function AgenciaCard({
  ag,
  onEnviarCard,
}: {
  ag: Agencia;
  onEnviarCard: (id: string, nome: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const diasSemUpload = ag.ultimoUpload
    ? Math.floor((Date.now() - new Date(ag.ultimoUpload).getTime()) / 86400000)
    : null;

  return (
    <div
      className={`rounded-xl border bg-[#0F2A2A] overflow-hidden transition-colors ${SAUDE_BORDA[ag.saude]}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${SAUDE_DOT[ag.saude]}`}
            title={ag.saude}
          />
          <div>
            <h3 className="font-bold text-white text-sm">{ag.nome}</h3>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">
              {ag.totalUsuarios} usuário{ag.totalUsuarios !== 1 ? "s" : ""} ·{" "}
              {ag.totalClientes} cliente{ag.totalClientes !== 1 ? "s" : ""} ·{" "}
              {ag.totalProjetosAtivos} projeto{ag.totalProjetosAtivos !== 1 ? "s" : ""} ativo{ag.totalProjetosAtivos !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ag.projetosCriticos > 0 && (
            <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400">
              {ag.projetosCriticos} crítico{ag.projetosCriticos > 1 ? "s" : ""}
            </span>
          )}
          {ag.projetosAtencao > 0 && ag.projetosCriticos === 0 && (
            <span className="rounded-full bg-yellow-500/15 border border-yellow-500/30 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
              {ag.projetosAtencao} atenção
            </span>
          )}
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 border-t border-[#1F3A3A] divide-x divide-[#1F3A3A]">
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-[#73d9cb]">{ag.horasSemana}h</p>
          <p className="text-[10px] text-[#94A3B8]">horas / semana</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-lg font-bold text-white">{ag.totalClientes}</p>
          <p className="text-[10px] text-[#94A3B8]">clientes</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className={`text-lg font-bold ${diasSemUpload === null ? "text-slate-500" : diasSemUpload > 30 ? "text-red-400" : "text-white"}`}>
            {diasSemUpload !== null ? `${diasSemUpload}d` : "—"}
          </p>
          <p className="text-[10px] text-[#94A3B8]">últ. upload</p>
        </div>
      </div>

      {/* Clientes expandível */}
      {ag.clientes.length > 0 && (
        <>
          <button
            onClick={() => setExpandido(!expandido)}
            className="w-full border-t border-[#1F3A3A] px-5 py-2.5 text-left text-[11px] text-[#94A3B8] hover:text-white hover:bg-white/3 transition-colors flex items-center justify-between"
          >
            <span>Clientes ({ag.clientes.length})</span>
            <span>{expandido ? "▲" : "▼"}</span>
          </button>
          {expandido && (
            <div className="border-t border-[#1F3A3A] divide-y divide-[#1F3A3A]">
              {ag.clientes.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-2">
                  <div className="flex items-center gap-2">
                    {c.projetosCriticos > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    )}
                    <span className="text-xs text-[#b3ceca]">{c.nome}</span>
                  </div>
                  <span className="text-[10px] text-[#94A3B8]">
                    {c.projetosAtivos} proj
                    {c.projetosCriticos > 0 && (
                      <span className="ml-1 text-red-400">· {c.projetosCriticos}⚠</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Ações */}
      <div className="flex border-t border-[#1F3A3A]">
        <Link
          href={`/agencia?view=${ag.id}`}
          className="flex-1 py-2.5 text-center text-[11px] font-semibold text-[#73d9cb] hover:bg-[#73d9cb]/5 transition-colors"
        >
          Entrar na agência →
        </Link>
        <button
          onClick={() => onEnviarCard(ag.id, ag.nome)}
          className="border-l border-[#1F3A3A] px-4 py-2.5 text-[11px] text-[#94A3B8] hover:text-white hover:bg-white/3 transition-colors"
        >
          Enviar card
        </button>
      </div>
    </div>
  );
}

// ─── Modal enviar card ────────────────────────────────────────────────────────

function ModalEnviarCard({
  agenciaId,
  agenciaNome,
  onClose,
}: {
  agenciaId: string;
  agenciaNome: string;
  onClose: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function enviar() {
    if (!mensagem.trim()) return;
    setEnviando(true);
    try {
      await fetch("/api/master/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agenciaId, titulo, mensagem }),
      });
      setSucesso(true);
      setTimeout(onClose, 1500);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-[#1F3A3A] bg-[#0A1F1F] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1F3A3A] px-5 py-4">
          <div>
            <h2 className="font-bold text-white text-sm">Enviar card para {agenciaNome}</h2>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">O CEO da agência verá este card no painel deles</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          {sucesso ? (
            <p className="text-center text-emerald-400 font-semibold py-4">Card enviado com sucesso!</p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Título (opcional)
                </label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Alerta de projeto crítico"
                  className="w-full rounded-lg border border-[#1F3A3A] bg-[#0F2A2A] px-3 py-2 text-sm text-white placeholder:text-[#94A3B8]/50 outline-none focus:border-[#73d9cb]/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  Mensagem *
                </label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={4}
                  placeholder="Descreva o alerta ou situação relevante..."
                  className="w-full rounded-lg border border-[#1F3A3A] bg-[#0F2A2A] px-3 py-2 text-sm text-white placeholder:text-[#94A3B8]/50 outline-none focus:border-[#73d9cb]/50 resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-[#1F3A3A] py-2 text-sm text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={enviar}
                  disabled={enviando || !mensagem.trim()}
                  className="flex-1 rounded-lg bg-[#73d9cb]/15 border border-[#73d9cb]/30 py-2 text-sm font-bold text-[#73d9cb] hover:bg-[#73d9cb]/25 disabled:opacity-40 transition-colors"
                >
                  {enviando ? "Enviando..." : "Enviar card"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MasterPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [atividade, setAtividade] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [cardModal, setCardModal] = useState<{ id: string; nome: string } | null>(null);

  const carregar = useCallback(async () => {
    const [ov, ag, al, at] = await Promise.all([
      fetch("/api/master/overview").then((r) => r.json()),
      fetch("/api/master/agencias").then((r) => r.json()),
      fetch("/api/master/alertas").then((r) => r.json()),
      fetch("/api/master/atividade").then((r) => r.json()),
    ]);
    setOverview(ov);
    setAgencias(ag.agencias ?? []);
    setAlertas(al.alertas ?? []);
    setAtividade(at.eventos ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (carregando) {
    return (
      <DashboardLayout titulo="Master" descricao="Carregando...">
        <div className="flex h-64 items-center justify-center">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-[#73d9cb] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const infra = overview?.infra;
  const infraCor =
    !infra
      ? "text-white"
      : infra.cargaScore < 30
      ? "text-emerald-400"
      : infra.cargaScore < 60
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <DashboardLayout titulo="Painel Master" descricao="Visão de plataforma — Gleison">
      {/* ── KPI Hero Row ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Agências", value: overview?.totalAgencias ?? 0, cor: "text-[#73d9cb]" },
          { label: "Clientes", value: overview?.totalClientes ?? 0, cor: "text-white" },
          { label: "Usuários", value: overview?.totalUsuarios ?? 0, cor: "text-white" },
          { label: "Projetos ativos", value: overview?.totalProjetos ?? 0, cor: "text-white" },
          { label: "Jobs abertos", value: overview?.totalJobs ?? 0, cor: "text-white" },
          {
            label: "Horas (semana)",
            value: `${overview?.horasSemana ?? 0}h`,
            cor: "text-[#C8F34D]",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] px-4 py-3 text-center"
          >
            <p className={`text-2xl font-extrabold ${kpi.cor}`}>{kpi.value}</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              {kpi.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Linha central: Agências + Alertas ── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">

        {/* Agências */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-white">
              Agências
              <span className="ml-2 text-[11px] font-normal text-[#94A3B8]">
                {agencias.length} ativa{agencias.length !== 1 ? "s" : ""}
              </span>
            </h2>
            <span className="text-[11px] text-[#94A3B8]">Clique em "Entrar na agência" para navegar</span>
          </div>
          {agencias.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#1F3A3A] p-10 text-center text-[#94A3B8] text-sm">
              Nenhuma agência cadastrada ainda
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {agencias.map((ag) => (
                <AgenciaCard
                  key={ag.id}
                  ag={ag}
                  onEnviarCard={(id, nome) => setCardModal({ id, nome })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Alertas críticos */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-white">
              Alertas
              {alertas.length > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {alertas.length}
                </span>
              )}
            </h2>
          </div>
          <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] overflow-hidden">
            {alertas.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">✓</p>
                <p className="text-sm text-emerald-400 font-semibold">Sem alertas críticos</p>
                <p className="text-xs text-[#94A3B8] mt-1">Todos os projetos estão saudáveis</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1F3A3A]">
                {alertas.map((a) => (
                  <div key={`${a.tipo}-${a.id}`} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${NIVEL_COR[a.nivel] ?? "text-slate-400"}`}
                          >
                            {a.nivel}
                          </span>
                          <span className="text-[10px] text-[#94A3B8]">{a.tipo}</span>
                        </div>
                        <p className="text-sm font-semibold text-white truncate">{a.nome}</p>
                        <p className="text-[11px] text-[#94A3B8] truncate">
                          {a.agencia} · {a.cliente}
                        </p>
                        {a.prazo && (
                          <p className="text-[10px] text-orange-400 mt-0.5">
                            Prazo: {new Date(a.prazo).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setCardModal({ id: a.agenciaId, nome: a.agencia })}
                        className="shrink-0 rounded-lg border border-[#1F3A3A] px-2 py-1 text-[10px] text-[#73d9cb] hover:border-[#73d9cb]/40 hover:bg-[#73d9cb]/5 transition-colors"
                      >
                        Card
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Linha inferior: Atividade + Infraestrutura ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Feed de atividade */}
        <div>
          <h2 className="mb-3 font-bold text-white">Atividade recente</h2>
          <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] overflow-hidden">
            {atividade.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#94A3B8]">Nenhuma atividade registrada</p>
            ) : (
              <div className="divide-y divide-[#1F3A3A]">
                {atividade.map((ev) => (
                  <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] ${
                        ev.tipo === "upload"
                          ? "bg-[#73d9cb]/15 text-[#73d9cb]"
                          : "bg-[#C8F34D]/10 text-[#C8F34D]"
                      }`}
                    >
                      {ev.tipo === "upload" ? "↑" : "⟳"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">{ev.empresa}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate">{ev.descricao}</p>
                    </div>
                    <div className="shrink-0 text-[10px] text-[#94A3B8]">
                      <RelTime iso={ev.createdAt} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Infraestrutura */}
        <div>
          <h2 className="mb-3 font-bold text-white">Capacidade da plataforma</h2>
          <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-5">
            {infra && (
              <>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#94A3B8] uppercase tracking-wider font-bold">
                      Hospedagem recomendada
                    </p>
                    <p className={`text-xl font-extrabold mt-0.5 ${infraCor}`}>
                      {infra.recomendacao}
                    </p>
                  </div>
                  <div className="relative h-14 w-14">
                    <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1F3A3A" strokeWidth="2.5" />
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={infra.cargaScore < 30 ? "#34d399" : infra.cargaScore < 60 ? "#fbbf24" : "#f87171"}
                        strokeWidth="2.5"
                        strokeDasharray={`${infra.cargaScore} 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${infraCor}`}>
                      {infra.cargaScore}%
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <GaugeBar
                    score={Math.round(((overview?.totalEmpresas ?? 0) / 50) * 100)}
                    label={`Empresas (${overview?.totalEmpresas ?? 0} / ~50 Hobby)`}
                  />
                  <GaugeBar
                    score={Math.round(((overview?.uploadsMes ?? 0) / 200) * 100)}
                    label={`Uploads este mês (${overview?.uploadsMes ?? 0} / ~200 Hobby)`}
                  />
                  <GaugeBar
                    score={Math.round(((overview?.totalUsuarios ?? 0) / 200) * 100)}
                    label={`Usuários ativos (${overview?.totalUsuarios ?? 0} / ~200 Hobby)`}
                  />
                </div>

                <div className="mt-4 rounded-lg border border-[#1F3A3A] bg-black/20 px-4 py-3">
                  <p className="text-[11px] text-[#94A3B8] leading-5">
                    {infra.cargaScore < 30
                      ? "Vercel Hobby suporta confortavelmente o volume atual. Continue monitorando ao passar de 20 empresas."
                      : infra.cargaScore < 60
                      ? "Crescimento consistente. Avalie Vercel Pro para eliminar limites de execução de funções."
                      : infra.cargaScore < 85
                      ? "Carga relevante. Avalie migrar para Vercel Pro ou Railway com DB dedicado."
                      : "Volume crítico para Vercel Hobby. Migração para AWS EC2 + RDS recomendada."}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Estatísticas do banco */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            {[
              { label: "Apontamentos", value: overview?.totalApontamentos ?? 0 },
              { label: "Jobs", value: overview?.totalJobs ?? 0 },
              { label: "Total uploads", value: overview?.uploadsTotal ?? 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-[#1F3A3A] bg-[#0F2A2A] px-3 py-3 text-center"
              >
                <p className="text-base font-bold text-white">{s.value.toLocaleString("pt-BR")}</p>
                <p className="text-[10px] text-[#94A3B8]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {cardModal && (
        <ModalEnviarCard
          agenciaId={cardModal.id}
          agenciaNome={cardModal.nome}
          onClose={() => setCardModal(null)}
        />
      )}
    </DashboardLayout>
  );
}
