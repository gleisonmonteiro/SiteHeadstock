"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Apontamento {
  id: string;
  data: string;
  horas: number;
  tipoAtividade: string;
  faturavel: boolean;
  observacao: string | null;
  projetoNome: string | undefined;
  clienteNome: string | undefined;
}

interface Membro {
  id: string;
  nome: string;
  funcao: string | null;
  capacidadeSemanal: number;
  horasSemana: number;
  horasMes: number;
  utilizacao: number | null;
  projetos: string[];
  clientes: string[];
  ultimosApontamentos: Apontamento[];
}

interface EquipeDetalhe {
  id: string;
  nome: string;
  gestor: string;
  capacidade: number;
  horasSemana: number;
  ocupacao: number;
  statusOcupacao: "NORMAL" | "ATENCAO" | "SOBRECARGA";
  membros: Membro[];
}

const COR_STATUS = {
  NORMAL: { text: "text-emerald-400", bg: "bg-emerald-500" },
  ATENCAO: { text: "text-yellow-400", bg: "bg-yellow-500" },
  SOBRECARGA: { text: "text-red-400", bg: "bg-red-500" },
};

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

export default function EquipeDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const [equipe, setEquipe] = useState<EquipeDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [membroAberto, setMembroAberto] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/agencia/equipes/${id}`)
      .then((r) => r.json())
      .then((d) => setEquipe(d))
      .finally(() => setCarregando(false));
  }, [id]);

  if (carregando) {
    return (
      <DashboardLayout titulo="Equipe" descricao="">
        <div className="py-20 text-center text-[#94A3B8]">Carregando...</div>
      </DashboardLayout>
    );
  }

  if (!equipe) {
    return (
      <DashboardLayout titulo="Equipe não encontrada" descricao="">
        <div className="py-20 text-center">
          <p className="text-[#94A3B8] mb-4">Equipe não encontrada.</p>
          <Link href="/agencia/equipes" className="text-[#73d9cb] hover:underline">← Voltar para Equipes</Link>
        </div>
      </DashboardLayout>
    );
  }

  const cor = COR_STATUS[equipe.statusOcupacao];

  return (
    <DashboardLayout titulo={equipe.nome} descricao={`Gestor: ${equipe.gestor}`}>
      {/* Navegação */}
      <div className="mb-6">
        <Link href="/agencia/equipes" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
          ← Equipes
        </Link>
      </div>

      {/* KPI da equipe */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-4">
          <p className="text-xs text-[#94A3B8] mb-1">Ocupação semana</p>
          <p className={`text-2xl font-bold ${cor.text}`}>{equipe.ocupacao}%</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
            <div className={`h-1.5 rounded-full ${cor.bg}`} style={{ width: `${Math.min(equipe.ocupacao, 100)}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-4">
          <p className="text-xs text-[#94A3B8] mb-1">Horas esta semana</p>
          <p className="text-2xl font-bold text-white">{equipe.horasSemana}h</p>
          <p className="text-xs text-[#94A3B8]">de {equipe.capacidade}h</p>
        </div>
        <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-4">
          <p className="text-xs text-[#94A3B8] mb-1">Membros</p>
          <p className="text-2xl font-bold text-white">{equipe.membros.length}</p>
        </div>
        <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-4">
          <p className="text-xs text-[#94A3B8] mb-1">Capacidade semanal</p>
          <p className="text-2xl font-bold text-white">{equipe.capacidade}h</p>
        </div>
      </div>

      {/* Membros */}
      <div className="space-y-4">
        {equipe.membros.map((membro) => {
          const aberto = membroAberto === membro.id;
          const util = membro.utilizacao;
          const corUtil =
            util === null ? "text-[#94A3B8]"
            : util > 100 ? "text-red-400"
            : util >= 85 ? "text-yellow-400"
            : "text-emerald-400";

          return (
            <div key={membro.id} className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] overflow-hidden">
              {/* Linha de cabeçalho do membro */}
              <button
                onClick={() => setMembroAberto(aberto ? null : membro.id)}
                className="w-full grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-6 py-4 items-center text-left hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="font-bold text-white">{membro.nome}</p>
                  <p className="text-xs text-[#94A3B8]">
                    {membro.funcao ?? "Colaborador"} · {membro.capacidadeSemanal}h/sem
                  </p>
                  {membro.clientes.length > 0 && (
                    <p className="text-xs text-[#94A3B8] mt-0.5">
                      {membro.clientes.slice(0, 4).join(" · ")}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-white">{membro.horasSemana}h</p>
                  <p className="text-xs text-[#94A3B8]">semana</p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-bold text-white">{membro.horasMes}h</p>
                  <p className="text-xs text-[#94A3B8]">mês</p>
                </div>

                <div className="text-right min-w-[56px]">
                  {util !== null ? (
                    <p className={`text-sm font-bold ${corUtil}`}>{util}%</p>
                  ) : (
                    <p className="text-sm text-[#94A3B8]">—</p>
                  )}
                  <p className="text-xs text-[#94A3B8]">util.</p>
                </div>

                <span className="text-[#94A3B8] text-sm">{aberto ? "▲" : "▼"}</span>
              </button>

              {/* Apontamentos expandidos */}
              {aberto && (
                <div className="border-t border-[#1F3A3A] px-6 py-4">
                  {membro.ultimosApontamentos.length === 0 ? (
                    <p className="text-sm text-[#94A3B8]">Nenhum apontamento no mês.</p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
                        Últimos apontamentos do mês
                      </p>
                      <div className="space-y-1.5">
                        {membro.ultimosApontamentos.map((ap) => (
                          <div
                            key={ap.id}
                            className="flex items-center gap-3 rounded-lg bg-[#0A1F1F] px-3 py-2 text-sm"
                          >
                            <span className="text-[#94A3B8] w-10 shrink-0">{formatarData(ap.data)}</span>
                            <span className="font-bold text-[#73d9cb] w-10 shrink-0">{ap.horas}h</span>
                            <span className="text-white truncate flex-1">
                              {ap.projetoNome ?? ap.tipoAtividade}
                            </span>
                            {ap.clienteNome && (
                              <span className="text-[#94A3B8] text-xs shrink-0">{ap.clienteNome}</span>
                            )}
                            {ap.tipoAtividade !== "geral" && (
                              <span className="rounded-full bg-[#1F3A3A] px-2 py-0.5 text-xs text-[#73d9cb] shrink-0">
                                {ap.tipoAtividade}
                              </span>
                            )}
                            {!ap.faturavel && (
                              <span className="rounded-full bg-orange-900/40 px-2 py-0.5 text-xs text-orange-300 shrink-0">
                                Não fat.
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {membro.projetos.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                            Projetos ativos
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {membro.projetos.map((p) => (
                              <span key={p} className="rounded-full border border-[#1F3A3A] px-3 py-1 text-xs text-[#94A3B8]">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
