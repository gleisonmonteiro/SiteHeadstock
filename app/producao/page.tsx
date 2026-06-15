"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  BIBarList,
  BIBadge,
  BIDataTable,
  BIKpi,
  BISection,
  BITabs,
} from "@/components/bi/BIKit";

type Aba = "visao" | "pipeline" | "historico";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  externa: boolean;
}

interface Saldo {
  etapaId: string;
  etapaNome: string;
  etapaOrdem: number;
  etapaExterna: boolean;
  local: string | null;
  quantidade: number;
  diasNaEtapa: number;
  diasAtraso: number;
  atrasada: boolean;
}

interface Movimento {
  id: string;
  tipo: string;
  quantidade: number;
  quantidadeDefeito: number;
  localOrigem: string | null;
  localDestino: string | null;
  dataEntrada: string;
  observacao: string | null;
  estornadaEm: string | null;
  motivoEstorno: string | null;
  etapa: Etapa | null;
  etapaOrigem: Etapa | null;
  usuario: { nome: string } | null;
  estornadaPor: { nome: string } | null;
}

interface OP {
  id: string;
  numero: string;
  produto: string;
  referencia: string | null;
  qtdTotal: number;
  status: "AGUARDANDO" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  dataEnvio: string | null;
  dataRetornoPrevista: string | null;
  atrasada: boolean;
  diasAtraso: number;
  quantidadeConcluida: number;
  quantidadeDefeitos: number;
  saldos: Saldo[];
  movimentacoes: Movimento[];
  ultimaMovimentacao: Movimento | null;
  programacao: { id: string; nome: string; etapas: Etapa[] };
}

const inteiro = new Intl.NumberFormat("pt-BR");

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function descricaoMovimento(movimento: Movimento) {
  if (movimento.tipo === "ENTRADA") {
    return `Entrada em ${movimento.etapa?.nome ?? "produção"}`;
  }
  if (movimento.tipo === "CONCLUSAO") {
    return `Conclusão a partir de ${movimento.etapaOrigem?.nome ?? "etapa final"}`;
  }
  return `${movimento.etapaOrigem?.nome ?? "Origem"} → ${movimento.etapa?.nome ?? "Destino"}`;
}

export default function ProducaoPage() {
  const [aba, setAba] = useState<Aba>("visao");
  const [ops, setOps] = useState<OP[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [movimentoEstorno, setMovimentoEstorno] = useState<{
    movimento: Movimento;
    op: OP;
  } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function buscarOps() {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/producao/ops");
      const dados = await resposta.json();
      setOps(dados.ops ?? []);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(buscarOps);
  }, []);

  const metricas = useMemo(() => {
    const abertas = ops.filter((op) => !["CONCLUIDA", "CANCELADA"].includes(op.status));
    const concluidas = ops.filter((op) => op.status === "CONCLUIDA");
    return {
      abertas,
      concluidas,
      pecasPendentes: abertas.reduce(
        (total, op) => total + op.saldos.reduce((soma, saldo) => soma + saldo.quantidade, 0),
        0,
      ),
      pecasConcluidas: ops.reduce((total, op) => total + op.quantidadeConcluida, 0),
      atrasadas: abertas.filter((op) => op.atrasada),
      defeitos: ops.reduce((total, op) => total + op.quantidadeDefeitos, 0),
      fracionadas: abertas.filter((op) => op.saldos.length > 1),
    };
  }, [ops]);

  const porEtapa = useMemo(() => {
    const mapa = new Map<
      string,
      { quantidade: number; ops: Set<string>; dias: number[]; atrasadas: number }
    >();
    for (const op of metricas.abertas) {
      for (const saldo of op.saldos) {
        const atual = mapa.get(saldo.etapaNome) ?? {
          quantidade: 0,
          ops: new Set<string>(),
          dias: [],
          atrasadas: 0,
        };
        atual.quantidade += saldo.quantidade;
        atual.ops.add(op.id);
        atual.dias.push(saldo.diasNaEtapa);
        atual.atrasadas += saldo.atrasada ? 1 : 0;
        mapa.set(saldo.etapaNome, atual);
      }
    }
    return [...mapa.entries()]
      .map(([nome, item]) => ({
        nome,
        quantidade: item.quantidade,
        ops: item.ops.size,
        mediaDias: item.dias.length
          ? Math.round(item.dias.reduce((soma, dias) => soma + dias, 0) / item.dias.length)
          : 0,
        atrasadas: item.atrasadas,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [metricas.abertas]);

  const historico = useMemo(
    () =>
      ops
        .flatMap((op) => op.movimentacoes.map((movimento) => ({ op, movimento })))
        .sort(
          (a, b) =>
            new Date(b.movimento.dataEntrada).getTime() -
            new Date(a.movimento.dataEntrada).getTime(),
        ),
    [ops],
  );

  const insights = useMemo(() => {
    const lista: Array<{
      id: string;
      tom: "danger" | "warning" | "accent" | "success";
      titulo: string;
      texto: string;
    }> = [];
    for (const op of metricas.atrasadas.slice(0, 4)) {
      const saldoCritico = [...op.saldos].sort((a, b) => b.diasAtraso - a.diasAtraso)[0];
      lista.push({
        id: `atraso-${op.id}`,
        tom: "danger",
        titulo: `OP ${op.numero} requer atenção`,
        texto: `${inteiro.format(saldoCritico?.quantidade ?? op.qtdTotal)} peças estão ${op.diasAtraso} dias atrasadas em ${saldoCritico?.etapaNome ?? "produção"}.`,
      });
    }
    const gargalo = [...porEtapa].sort((a, b) => b.mediaDias - a.mediaDias)[0];
    if (gargalo?.mediaDias > 0) {
      lista.push({
        id: `gargalo-${gargalo.nome}`,
        tom: gargalo.mediaDias > 10 ? "danger" : "warning",
        titulo: `${gargalo.nome} concentra a maior permanência`,
        texto: `${inteiro.format(gargalo.quantidade)} peças em ${gargalo.ops} OPs, média de ${gargalo.mediaDias} dias no setor.`,
      });
    }
    if (metricas.defeitos > 0) {
      lista.push({
        id: "defeitos",
        tom: "warning",
        titulo: "Defeitos registrados no fluxo",
        texto: `${inteiro.format(metricas.defeitos)} peças foram apontadas com defeito nas movimentações.`,
      });
    }
    if (metricas.fracionadas.length > 0) {
      lista.push({
        id: "fracionadas",
        tom: "accent",
        titulo: "Produção distribuída",
        texto: `${metricas.fracionadas.length} OPs estão divididas entre mais de um setor ou local.`,
      });
    }
    if (lista.length === 0) {
      lista.push({
        id: "normal",
        tom: "success",
        titulo: "Fluxo sem alertas críticos",
        texto: "As OPs abertas estão dentro das previsões registradas.",
      });
    }
    return lista;
  }, [metricas, porEtapa]);

  async function estornar() {
    if (!movimentoEstorno || !motivo.trim()) return;
    setSalvando(true);
    try {
      const resposta = await fetch(
        `/api/producao/movimentacoes/${movimentoEstorno.movimento.id}/estornar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motivo }),
        },
      );
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagem(dados.erro ?? "Não foi possível estornar");
        return;
      }
      setMensagem(`Movimentação da OP ${movimentoEstorno.op.numero} estornada`);
      setMovimentoEstorno(null);
      setMotivo("");
      await buscarOps();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <DashboardLayout
      titulo="Produção e Ordens"
      descricao="Pendências, atrasos, gargalos e decisões sobre o fluxo produtivo"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <BITabs
            value={aba}
            onChange={setAba}
            items={[
              { id: "visao", label: "Visão executiva" },
              { id: "pipeline", label: "Pipeline e locais" },
              { id: "historico", label: "Movimentações e estornos" },
            ]}
          />
          <Link
            href="/producao/operacional"
            className="rounded-lg border border-[var(--accent)] px-3 py-2 text-[11px] font-black text-[var(--accent)]"
          >
            Abrir operação de OPs
          </Link>
        </div>

        {mensagem && (
          <div className="rounded-xl border border-[#73d9cb]/30 bg-[#73d9cb]/8 px-4 py-3 text-xs font-semibold text-[var(--accent)]">
            {mensagem}
          </div>
        )}

        {movimentoEstorno && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#031014]/75 p-4">
            <div className="w-full max-w-md rounded-2xl border border-[#ef8e78]/30 bg-[var(--bg-panel)] p-5">
              <p className="text-[10px] font-extrabold uppercase text-[#ef8e78]">
                Estorno controlado
              </p>
              <h2 className="mt-1 text-lg font-black">
                OP {movimentoEstorno.op.numero}
              </h2>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                {descricaoMovimento(movimentoEstorno.movimento)} ·{" "}
                {inteiro.format(movimentoEstorno.movimento.quantidade)} peças
              </p>
              <textarea
                autoFocus
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo obrigatório do estorno"
                className="mt-4 w-full rounded-lg border border-[var(--border-col)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[#102c29]"
              />
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovimentoEstorno(null);
                    setMotivo("");
                  }}
                  className="flex-1 rounded-lg border border-[var(--border-col)] px-3 py-2 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void estornar()}
                  disabled={!motivo.trim() || salvando}
                  className="flex-1 rounded-lg bg-[#ef8e78] px-3 py-2 text-xs font-black text-[#20100d] disabled:opacity-40"
                >
                  {salvando ? "Estornando..." : "Confirmar estorno"}
                </button>
              </div>
            </div>
          </div>
        )}

        {carregando ? (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)]"
              />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
              <BIKpi
                label="OPs abertas"
                value={inteiro.format(metricas.abertas.length)}
                tone="accent"
              />
              <BIKpi
                label="Peças pendentes"
                value={inteiro.format(metricas.pecasPendentes)}
                detail="em setores internos e externos"
              />
              <BIKpi
                label="OPs atrasadas"
                value={inteiro.format(metricas.atrasadas.length)}
                tone={metricas.atrasadas.length ? "danger" : "success"}
              />
              <BIKpi
                label="Defeitos apontados"
                value={inteiro.format(metricas.defeitos)}
                tone={metricas.defeitos ? "warning" : "success"}
              />
              <BIKpi
                label="Peças concluídas"
                value={inteiro.format(metricas.pecasConcluidas)}
                tone="success"
              />
            </section>

            {aba === "visao" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                  <BISection
                    title="Insights para decisão"
                    subtitle="Atualizados a cada movimentação registrada"
                  >
                    <div className="space-y-2">
                      {insights.map((insight) => (
                        <div
                          key={insight.id}
                          className="rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel-soft)] p-3"
                        >
                          <div className="flex items-center gap-2">
                            <BIBadge tone={insight.tom}>{insight.tom === "danger" ? "Crítico" : insight.tom === "warning" ? "Atenção" : insight.tom === "success" ? "Normal" : "Contexto"}</BIBadge>
                            <strong className="text-xs">{insight.titulo}</strong>
                          </div>
                          <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-secondary)]">
                            {insight.texto}
                          </p>
                        </div>
                      ))}
                    </div>
                  </BISection>
                  <BISection title="Volume por etapa" subtitle="Peças ainda pendentes">
                    <BIBarList
                      items={porEtapa.map((item) => ({
                        label: item.nome,
                        value: item.quantidade,
                        detail: `${item.ops} OPs · média ${item.mediaDias}d`,
                      }))}
                      formatValue={inteiro.format}
                      color="#00a9a5"
                    />
                  </BISection>
                </section>

                <BISection
                  title="Ordens em acompanhamento"
                  subtitle="A situação real considera todos os saldos distribuídos"
                >
                  <BIDataTable
                    columns={[
                      { key: "op", label: "OP" },
                      { key: "produto", label: "Descrição" },
                      { key: "programacao", label: "Programação" },
                      { key: "pendente", label: "Pendente", align: "right" },
                      { key: "concluido", label: "Concluído", align: "right" },
                      { key: "locais", label: "Setores / locais", align: "right" },
                      { key: "defeitos", label: "Defeitos", align: "right" },
                      { key: "situacao", label: "Situação", align: "right" },
                    ]}
                    rows={ops.map((op) => ({
                      id: op.id,
                      op: <span className="font-black">{op.numero}</span>,
                      produto: `${op.referencia ? `${op.referencia} · ` : ""}${op.produto}`,
                      programacao: op.programacao.nome,
                      pendente: inteiro.format(
                        op.saldos.reduce((soma, saldo) => soma + saldo.quantidade, 0),
                      ),
                      concluido: inteiro.format(op.quantidadeConcluida),
                      locais: op.saldos.length,
                      defeitos: op.quantidadeDefeitos || "—",
                      situacao: (
                        <BIBadge
                          tone={
                            op.status === "CONCLUIDA"
                              ? "success"
                              : op.atrasada
                                ? "danger"
                                : "accent"
                          }
                        >
                          {op.status === "CONCLUIDA"
                            ? "Concluída"
                            : op.atrasada
                              ? `${op.diasAtraso}d atraso`
                              : "Em fluxo"}
                        </BIBadge>
                      ),
                    }))}
                  />
                </BISection>
              </div>
            )}

            {aba === "pipeline" && (
              <div className="grid gap-3 xl:grid-cols-3">
                {porEtapa.map((etapa) => (
                  <BISection
                    key={etapa.nome}
                    title={etapa.nome}
                    subtitle={`${inteiro.format(etapa.quantidade)} peças · ${etapa.ops} OPs`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        Permanência média
                      </span>
                      <BIBadge
                        tone={
                          etapa.mediaDias > 10
                            ? "danger"
                            : etapa.mediaDias > 5
                              ? "warning"
                              : "success"
                        }
                      >
                        {etapa.mediaDias} dias
                      </BIBadge>
                    </div>
                    <div className="space-y-2">
                      {metricas.abertas.flatMap((op) =>
                        op.saldos
                          .filter((saldo) => saldo.etapaNome === etapa.nome)
                          .map((saldo) => (
                            <div
                              key={`${op.id}-${saldo.etapaId}-${saldo.local ?? ""}`}
                              className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel-soft)] p-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-[11px]">OP {op.numero}</strong>
                                <BIBadge tone={saldo.atrasada ? "danger" : "accent"}>
                                  {inteiro.format(saldo.quantidade)} peças
                                </BIBadge>
                              </div>
                              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                {saldo.local || "Sem local específico"} · {saldo.diasNaEtapa}d
                                {saldo.atrasada ? ` · atraso ${saldo.diasAtraso}d` : ""}
                              </p>
                            </div>
                          )),
                      )}
                    </div>
                  </BISection>
                ))}
              </div>
            )}

            {aba === "historico" && (
              <BISection
                title="Histórico operacional"
                subtitle="Estorno disponível somente para a movimentação mais recente de cada OP"
              >
                <BIDataTable
                  columns={[
                    { key: "quando", label: "Data e hora" },
                    { key: "op", label: "OP" },
                    { key: "movimento", label: "Movimentação" },
                    { key: "quantidade", label: "Quantidade", align: "right" },
                    { key: "local", label: "Destino / local" },
                    { key: "usuario", label: "Registrado por" },
                    { key: "status", label: "Status", align: "right" },
                    { key: "acao", label: "Ação", align: "right" },
                  ]}
                  rows={historico.map(({ op, movimento }) => {
                    const podeEstornar =
                      !movimento.estornadaEm &&
                      op.ultimaMovimentacao?.id === movimento.id;
                    return {
                      id: movimento.id,
                      quando: formatarDataHora(movimento.dataEntrada),
                      op: <span className="font-black">{op.numero}</span>,
                      movimento: descricaoMovimento(movimento),
                      quantidade: inteiro.format(movimento.quantidade || op.qtdTotal),
                      local: movimento.localDestino || "—",
                      usuario: movimento.usuario?.nome ?? "Sistema",
                      status: movimento.estornadaEm ? (
                        <BIBadge tone="danger">Estornada</BIBadge>
                      ) : (
                        <BIBadge tone="success">Válida</BIBadge>
                      ),
                      acao: podeEstornar ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMovimentoEstorno({ movimento, op });
                            setMensagem("");
                          }}
                          className="rounded border border-[#ef8e78]/35 px-2 py-1 text-[9px] font-black text-[#c65345]"
                        >
                          Estornar
                        </button>
                      ) : (
                        <span className="text-[9px] text-[var(--text-secondary)]">—</span>
                      ),
                    };
                  })}
                />
              </BISection>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
