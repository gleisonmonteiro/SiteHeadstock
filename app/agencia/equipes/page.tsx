"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";

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
}

interface Equipe {
  id: string;
  nome: string;
  gestor: string;
  membros: Membro[];
  capacidade: number;
  horasSemana: number;
  ocupacao: number;
  statusOcupacao: "NORMAL" | "ATENCAO" | "SOBRECARGA";
}

interface ColabSemEquipe {
  nome: string;
  horasSemana: number;
  horasMes: number;
  projetos: string[];
  clientes: string[];
}

const COR_OCUPACAO = {
  NORMAL: "text-emerald-400",
  ATENCAO: "text-yellow-400",
  SOBRECARGA: "text-red-400",
};

const BARRA_OCUPACAO = {
  NORMAL: "bg-emerald-500",
  ATENCAO: "bg-yellow-500",
  SOBRECARGA: "bg-red-500",
};

function BarraUtilizacao({ pct, status }: { pct: number; status: string }) {
  const cor = BARRA_OCUPACAO[status as keyof typeof BARRA_OCUPACAO] ?? "bg-turquesa";
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10">
      <div
        className={`h-1.5 rounded-full transition-all ${cor}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function EquipesPage() {
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [semEquipe, setSemEquipe] = useState<ColabSemEquipe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [msgImport, setMsgImport] = useState("");
  const [erroImport, setErroImport] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/agencia/equipes")
      .then((r) => r.json())
      .then((d) => {
        setEquipes(d.equipes ?? []);
        setSemEquipe(d.semEquipe ?? []);
      })
      .finally(() => setCarregando(false));
  }, []);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setImportando(true);
    setMsgImport("");
    setErroImport("");

    const fd = new FormData();
    fd.append("arquivo", arquivo);

    try {
      const res = await fetch("/api/agencia/imports/operand", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setErroImport(data.erro ?? "Erro ao importar");
      } else {
        type AbaResult = { importados: number; erros: number; ignorado?: boolean; detalhe?: string };
        const abas = data.abas as Record<string, AbaResult>;
        const totais = Object.values(abas)
          .filter((v) => !v.ignorado)
          .reduce((acc, v) => ({ imp: acc.imp + v.importados, err: acc.err + v.erros }), { imp: 0, err: 0 });
        const detalhe = Object.entries(abas)
          .filter(([, v]) => !v.ignorado && v.detalhe)
          .map(([, v]) => v.detalhe)
          .join("; ");
        setMsgImport(`${totais.imp} importados${totais.err ? `, ${totais.err} com erro` : ""}${detalhe ? ` · ${detalhe}` : ""}`);
        // Recarrega dados
        const novo = await fetch("/api/agencia/equipes").then((r) => r.json());
        setEquipes(novo.equipes ?? []);
        setSemEquipe(novo.semEquipe ?? []);
      }
    } catch {
      setErroImport("Erro de conexão com o servidor");
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <DashboardLayout titulo="Equipes" descricao="Horas, ocupação e projetos por colaborador">
      {/* Barra de ações */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/agencia"
          className="text-sm text-[#94A3B8] hover:text-white transition-colors"
        >
          ← Visão da Agência
        </Link>

        <div className="flex items-center gap-3">
          {msgImport && (
            <span className="text-sm text-emerald-400">{msgImport}</span>
          )}
          {erroImport && (
            <span className="text-sm text-red-400">{erroImport}</span>
          )}
          <label className="cursor-pointer rounded-lg border border-[#1F3A3A] bg-[#0F2A2A] px-4 py-2 text-sm font-semibold text-[#73d9cb] hover:border-[#73d9cb]/50 transition-colors">
            {importando ? "Importando..." : "↑ Importar Operand (.xlsx / .xls)"}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImport}
              disabled={importando}
            />
          </label>
        </div>
      </div>

      {carregando ? (
        <div className="py-20 text-center text-[#94A3B8]">Carregando...</div>
      ) : equipes.length === 0 && semEquipe.length === 0 ? (
        <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-12 text-center">
          <p className="text-lg font-semibold text-white mb-2">Nenhum dado ainda</p>
          <p className="text-sm text-[#94A3B8]">
            Importe o relatório de Timesheet do Operand (.xlsx) para ver horas por colaborador.<br />
            Configure equipes na seção de cadastros para ver agrupamentos por time.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {equipes.map((equipe) => (
            <div key={equipe.id} className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] overflow-hidden">
              {/* Header da equipe */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F3A3A]">
                <div>
                  <h2 className="font-bold text-white text-base">{equipe.nome}</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Gestor: {equipe.gestor} · {equipe.membros.length} membros · {equipe.capacidade}h/sem capacidade
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-xl font-bold ${COR_OCUPACAO[equipe.statusOcupacao]}`}>
                      {equipe.ocupacao}%
                    </span>
                    <p className="text-xs text-[#94A3B8]">{equipe.horasSemana}h / {equipe.capacidade}h</p>
                  </div>
                  <Link
                    href={`/agencia/equipes/${equipe.id}`}
                    className="rounded-lg border border-[#1F3A3A] px-3 py-1.5 text-xs font-semibold text-[#73d9cb] hover:border-[#73d9cb]/50 hover:bg-[#73d9cb]/5 transition-colors"
                  >
                    Ver detalhe →
                  </Link>
                </div>
              </div>

              {/* Membros */}
              <div className="divide-y divide-[#1F3A3A]">
                {equipe.membros.map((m) => (
                  <div key={m.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 items-center">
                    <div>
                      <p className="text-sm font-semibold text-white">{m.nome}</p>
                      {m.funcao && <p className="text-xs text-[#94A3B8]">{m.funcao}</p>}
                      {m.projetos.length > 0 && (
                        <p className="text-xs text-[#73d9cb]/80 mt-0.5 truncate max-w-xs">
                          {m.projetos.slice(0, 3).join(" · ")}
                        </p>
                      )}
                      {m.clientes.length > 0 && (
                        <p className="text-xs text-[#94A3B8] mt-0.5 truncate max-w-xs">
                          {m.clientes.slice(0, 3).join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-bold text-white">{m.horasSemana}h</p>
                      <p className="text-xs text-[#94A3B8]">semana</p>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-bold text-white">{m.horasMes}h</p>
                      <p className="text-xs text-[#94A3B8]">mês</p>
                    </div>

                    <div className="min-w-[90px]">
                      {m.utilizacao !== null ? (
                        <>
                          <p className={`text-sm font-bold text-right ${
                            m.utilizacao > 100 ? "text-red-400" : m.utilizacao >= 85 ? "text-yellow-400" : "text-emerald-400"
                          }`}>
                            {m.utilizacao}%
                          </p>
                          <BarraUtilizacao
                            pct={m.utilizacao}
                            status={m.utilizacao > 100 ? "SOBRECARGA" : m.utilizacao >= 85 ? "ATENCAO" : "NORMAL"}
                          />
                        </>
                      ) : (
                        <p className="text-xs text-[#94A3B8] text-right">—</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Colaboradores sem equipe */}
          {semEquipe.length > 0 && (
            <div className="rounded-xl border border-dashed border-[#1F3A3A] bg-[#0F2A2A]/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1F3A3A]">
                <h2 className="font-bold text-[#94A3B8] text-base">Sem equipe definida</h2>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Colaboradores com apontamentos no Operand não vinculados a um time no Headstock
                </p>
              </div>
              <div className="divide-y divide-[#1F3A3A]">
                {semEquipe.map((c) => (
                  <div key={c.nome} className="grid grid-cols-[1fr_auto_auto] gap-4 px-6 py-3 items-center">
                    <div>
                      <p className="text-sm font-semibold text-white">{c.nome}</p>
                      {c.projetos.length > 0 && (
                        <p className="text-xs text-[#73d9cb]/80 mt-0.5 truncate max-w-xs">
                          {c.projetos.slice(0, 4).join(" · ")}
                        </p>
                      )}
                      {c.clientes.length > 0 && (
                        <p className="text-xs text-[#94A3B8] mt-0.5 truncate max-w-xs">
                          {c.clientes.slice(0, 3).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-bold text-white">{c.horasSemana}h</p>
                      <p className="text-xs text-[#94A3B8]">semana</p>
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm font-bold text-white">{c.horasMes}h</p>
                      <p className="text-xs text-[#94A3B8]">mês</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
