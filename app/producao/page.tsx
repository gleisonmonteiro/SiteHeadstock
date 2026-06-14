"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  BIBarList,
  BIBadge,
  BIDataTable,
  BIKpi,
  BISection,
  BITabs,
} from "@/components/bi/BIKit";

type Aba = "visao" | "pipeline" | "oficinas" | "grade";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
}

interface ItemOP {
  id: string;
  cor: string | null;
  tamanho: string | null;
  quantidade: number;
  custoTotal: number;
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
  genero: string | null;
  oficina: string | null;
  qtdTotal: number;
  custoTotal: number;
  status: "AGUARDANDO" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA";
  etapaAtualId: string | null;
  programacao: { etapas: Etapa[] };
  itens: ItemOP[];
  movimentacoes: Movimentacao[];
  createdAt: string;
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const inteiro = new Intl.NumberFormat("pt-BR");

function diasEntre(inicio: string, fim?: string | null) {
  const final = fim ? new Date(fim).getTime() : Date.now();
  return Math.max(0, Math.floor((final - new Date(inicio).getTime()) / 86_400_000));
}

function movimentacaoAtual(op: OP) {
  return [...op.movimentacoes].reverse().find((movimento) => !movimento.dataSaida);
}

function diasNaEtapa(op: OP) {
  const movimento = movimentacaoAtual(op);
  return movimento ? diasEntre(movimento.dataEntrada) : 0;
}

function etapaAtual(op: OP) {
  return op.programacao.etapas.find((etapa) => etapa.id === op.etapaAtualId)?.nome ?? "Sem etapa";
}

function tomTempo(dias: number): "success" | "warning" | "danger" {
  if (dias > 10) return "danger";
  if (dias > 5) return "warning";
  return "success";
}

export default function ProducaoPage() {
  const [aba, setAba] = useState<Aba>("visao");
  const [ops, setOps] = useState<OP[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function importar() {
    if (!arquivo) return;
    setImportando(true);
    setMensagem("");
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    try {
      const resposta = await fetch("/api/producao/imports", {
        method: "POST",
        body: formData,
      });
      const dados = await resposta.json();
      setMensagem(
        resposta.ok
          ? `Importadas ${dados.importadas}; existentes ${dados.atualizadas}; erros ${dados.erros}.`
          : dados.erro ?? "Erro na importação",
      );
      if (resposta.ok) {
        setArquivo(null);
        if (fileRef.current) fileRef.current.value = "";
        await buscarOps();
      }
    } catch {
      setMensagem("Erro ao conectar com o servidor");
    } finally {
      setImportando(false);
    }
  }

  const metricas = useMemo(() => {
    const abertas = ops.filter((op) => !["CONCLUIDA", "CANCELADA"].includes(op.status));
    const andamento = ops.filter((op) => op.status === "EM_ANDAMENTO");
    const concluidas = ops.filter((op) => op.status === "CONCLUIDA");
    const quantidadeAberta = abertas.reduce((soma, op) => soma + op.qtdTotal, 0);
    const quantidadeAndamento = andamento.reduce((soma, op) => soma + op.qtdTotal, 0);
    const quantidadeConcluida = concluidas.reduce((soma, op) => soma + op.qtdTotal, 0);
    const criticas = andamento.filter((op) => diasNaEtapa(op) > 10);
    const custoAberto = abertas.reduce((soma, op) => soma + op.custoTotal, 0);
    return {
      abertas,
      andamento,
      concluidas,
      quantidadeAberta,
      quantidadeAndamento,
      quantidadeConcluida,
      criticas,
      custoAberto,
      conclusaoPct:
        quantidadeAberta + quantidadeConcluida > 0
          ? (quantidadeConcluida / (quantidadeAberta + quantidadeConcluida)) * 100
          : 0,
    };
  }, [ops]);

  const porEtapa = useMemo(() => {
    const mapa = new Map<string, { ops: number; quantidade: number; dias: number[] }>();
    for (const op of metricas.andamento) {
      const nome = etapaAtual(op);
      const atual = mapa.get(nome) ?? { ops: 0, quantidade: 0, dias: [] };
      atual.ops++;
      atual.quantidade += op.qtdTotal;
      atual.dias.push(diasNaEtapa(op));
      mapa.set(nome, atual);
    }
    return Array.from(mapa.entries()).map(([nome, item]) => ({
      nome,
      ops: item.ops,
      quantidade: item.quantidade,
      mediaDias:
        item.dias.length > 0
          ? Math.round(item.dias.reduce((soma, dias) => soma + dias, 0) / item.dias.length)
          : 0,
    }));
  }, [metricas.andamento]);

  const porOficina = useMemo(() => {
    const mapa = new Map<string, { ops: number; quantidade: number; custo: number; criticas: number }>();
    for (const op of metricas.andamento) {
      const nome = op.oficina ?? "Sem oficina";
      const atual = mapa.get(nome) ?? { ops: 0, quantidade: 0, custo: 0, criticas: 0 };
      atual.ops++;
      atual.quantidade += op.qtdTotal;
      atual.custo += op.custoTotal;
      atual.criticas += diasNaEtapa(op) > 10 ? 1 : 0;
      mapa.set(nome, atual);
    }
    return Array.from(mapa.entries())
      .map(([nome, item]) => ({ nome, ...item }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [metricas.andamento]);

  const tamanhos = useMemo(
    () =>
      Array.from(
        new Set(ops.flatMap((op) => op.itens.map((item) => item.tamanho).filter(Boolean))),
      ).sort() as string[],
    [ops],
  );

  const gradePorReferencia = useMemo(() => {
    const mapa = new Map<
      string,
      { produto: string; total: number; custo: number; tamanhos: Map<string, number> }
    >();
    for (const op of ops) {
      const referencia = op.referencia ?? op.produto;
      const atual = mapa.get(referencia) ?? {
        produto: op.produto,
        total: 0,
        custo: 0,
        tamanhos: new Map<string, number>(),
      };
      atual.total += op.qtdTotal;
      atual.custo += op.custoTotal;
      for (const item of op.itens) {
        const tamanho = item.tamanho ?? "Sem tam.";
        atual.tamanhos.set(tamanho, (atual.tamanhos.get(tamanho) ?? 0) + item.quantidade);
      }
      mapa.set(referencia, atual);
    }
    return Array.from(mapa.entries())
      .map(([referencia, item]) => ({ referencia, ...item }))
      .sort((a, b) => b.total - a.total);
  }, [ops]);

  return (
    <DashboardLayout
      titulo="Produção e Ordens"
      descricao="Abertura, fluxo, gargalos, oficinas e grade de produção"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto">
            <BITabs
              value={aba}
              onChange={setAba}
              items={[
                { id: "visao", label: "Visão executiva" },
                { id: "pipeline", label: "Pipeline e etapas" },
                { id: "oficinas", label: "Oficinas" },
                { id: "grade", label: "Referências e grade" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(evento) => setArquivo(evento.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] px-3 py-2 text-[11px] font-bold text-[var(--text-secondary)]"
            >
              {arquivo?.name ?? "Selecionar Excel"}
            </button>
            {arquivo && (
              <button
                type="button"
                onClick={() => void importar()}
                disabled={importando}
                className="rounded-lg bg-[#73d9cb] px-3 py-2 text-[11px] font-extrabold text-[#06211f] disabled:opacity-50"
              >
                {importando ? "Importando..." : "Importar OPs"}
              </button>
            )}
          </div>
        </div>

        {mensagem && (
          <div className="rounded-xl border border-[#73d9cb]/30 bg-[#73d9cb]/8 p-3 text-xs text-[var(--accent)]">
            {mensagem}
          </div>
        )}

        {carregando ? (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)]"
              />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <BIKpi
                label="Ordens abertas"
                value={inteiro.format(metricas.abertas.length)}
                detail={`${inteiro.format(metricas.quantidadeAberta)} peças`}
                tone="accent"
              />
              <BIKpi
                label="Em produção"
                value={inteiro.format(metricas.andamento.length)}
                detail={`${inteiro.format(metricas.quantidadeAndamento)} peças`}
              />
              <BIKpi
                label="Concluídas"
                value={inteiro.format(metricas.concluidas.length)}
                detail={`${inteiro.format(metricas.quantidadeConcluida)} peças`}
                tone="success"
              />
              <BIKpi
                label="% concluído"
                value={`${metricas.conclusaoPct.toFixed(1)}%`}
                detail="sobre peças abertas + concluídas"
              />
              <BIKpi
                label="OPs críticas"
                value={inteiro.format(metricas.criticas.length)}
                detail="mais de 10 dias na etapa"
                tone={metricas.criticas.length > 0 ? "danger" : "success"}
              />
              <BIKpi
                label="Custo em aberto"
                value={moeda.format(metricas.custoAberto)}
                detail="custo informado nas OPs"
              />
            </section>

            {aba === "visao" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-[1fr_1fr_1.5fr]">
                  <BISection title="Peças por etapa" subtitle="Volume atual no pipeline">
                    <BIBarList
                      items={porEtapa.map((item) => ({
                        label: item.nome,
                        value: item.quantidade,
                        detail: `${item.ops} OPs`,
                      }))}
                      formatValue={inteiro.format}
                      color="#1478ff"
                    />
                  </BISection>
                  <BISection title="Carga por oficina" subtitle="Peças em produção">
                    <BIBarList
                      items={porOficina.map((item) => ({
                        label: item.nome,
                        value: item.quantidade,
                        detail: `${item.criticas} críticas`,
                      }))}
                      formatValue={inteiro.format}
                      color="#00a9a5"
                    />
                  </BISection>
                  <BISection title="Gargalos atuais" subtitle="Etapas com maior permanência média">
                    <BIDataTable
                      columns={[
                        { key: "etapa", label: "Etapa" },
                        { key: "ops", label: "OPs", align: "right" },
                        { key: "quantidade", label: "Peças", align: "right" },
                        { key: "tempo", label: "Tempo médio", align: "right" },
                        { key: "situacao", label: "Situação", align: "right" },
                      ]}
                      rows={[...porEtapa]
                        .sort((a, b) => b.mediaDias - a.mediaDias)
                        .map((item) => ({
                          id: item.nome,
                          etapa: <span className="font-bold">{item.nome}</span>,
                          ops: inteiro.format(item.ops),
                          quantidade: inteiro.format(item.quantidade),
                          tempo: `${item.mediaDias} dias`,
                          situacao: (
                            <BIBadge tone={tomTempo(item.mediaDias)}>
                              {item.mediaDias > 10
                                ? "Crítico"
                                : item.mediaDias > 5
                                  ? "Atenção"
                                  : "Normal"}
                            </BIBadge>
                          ),
                        }))}
                    />
                  </BISection>
                </section>
                <BISection title="Ordens de produção" subtitle="Visão sintética do portfólio atual">
                  <BIDataTable
                    columns={[
                      { key: "op", label: "OP" },
                      { key: "referencia", label: "Referência" },
                      { key: "produto", label: "Produto" },
                      { key: "oficina", label: "Oficina" },
                      { key: "pecas", label: "Peças", align: "right" },
                      { key: "custo", label: "Custo", align: "right" },
                      { key: "etapa", label: "Etapa atual" },
                      { key: "tempo", label: "Tempo", align: "right" },
                      { key: "status", label: "Status", align: "right" },
                    ]}
                    rows={ops.map((op) => ({
                      id: op.id,
                      op: <span className="font-black">{op.numero}</span>,
                      referencia: op.referencia ?? "—",
                      produto: op.produto,
                      oficina: op.oficina ?? "—",
                      pecas: inteiro.format(op.qtdTotal),
                      custo: moeda.format(op.custoTotal),
                      etapa: etapaAtual(op),
                      tempo: `${diasNaEtapa(op)}d`,
                      status: (
                        <BIBadge
                          tone={
                            op.status === "CONCLUIDA"
                              ? "success"
                              : op.status === "CANCELADA"
                                ? "danger"
                                : op.status === "AGUARDANDO"
                                  ? "warning"
                                  : "accent"
                          }
                        >
                          {op.status.replace("_", " ")}
                        </BIBadge>
                      ),
                    }))}
                  />
                </BISection>
              </div>
            )}

            {aba === "pipeline" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-3">
                  {porEtapa.map((item) => (
                    <BISection
                      key={item.nome}
                      title={item.nome}
                      subtitle={`${item.ops} OPs · ${inteiro.format(item.quantidade)} peças`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-[var(--text-secondary)]">
                          Permanência média
                        </span>
                        <BIBadge tone={tomTempo(item.mediaDias)}>
                          {item.mediaDias} dias
                        </BIBadge>
                      </div>
                      <div className="space-y-2">
                        {metricas.andamento
                          .filter((op) => etapaAtual(op) === item.nome)
                          .slice(0, 8)
                          .map((op) => (
                            <div
                              key={op.id}
                              className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel-soft)] p-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <strong className="text-[11px]">OP {op.numero}</strong>
                                <BIBadge tone={tomTempo(diasNaEtapa(op))}>
                                  {diasNaEtapa(op)}d
                                </BIBadge>
                              </div>
                              <p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">
                                {op.referencia ?? op.produto} · {inteiro.format(op.qtdTotal)} peças
                              </p>
                            </div>
                          ))}
                      </div>
                    </BISection>
                  ))}
                </section>
              </div>
            )}

            {aba === "oficinas" && (
              <BISection title="Análise por oficina" subtitle="Carga, custo e risco operacional">
                <BIDataTable
                  columns={[
                    { key: "oficina", label: "Oficina" },
                    { key: "ops", label: "OPs", align: "right" },
                    { key: "pecas", label: "Peças", align: "right" },
                    { key: "custo", label: "Custo", align: "right" },
                    { key: "criticas", label: "Críticas", align: "right" },
                    { key: "participacao", label: "% carga", align: "right" },
                  ]}
                  rows={porOficina.map((item) => ({
                    id: item.nome,
                    oficina: <span className="font-bold">{item.nome}</span>,
                    ops: inteiro.format(item.ops),
                    pecas: inteiro.format(item.quantidade),
                    custo: moeda.format(item.custo),
                    criticas: (
                      <BIBadge tone={item.criticas > 0 ? "danger" : "success"}>
                        {item.criticas}
                      </BIBadge>
                    ),
                    participacao: `${(
                      (item.quantidade / Math.max(metricas.quantidadeAndamento, 1)) *
                      100
                    ).toFixed(1)}%`,
                  }))}
                />
              </BISection>
            )}

            {aba === "grade" && (
              <BISection
                title="Produção por referência e grade"
                subtitle="Distribuição de peças por tamanho disponível nas OPs"
              >
                <BIDataTable
                  columns={[
                    { key: "referencia", label: "Referência" },
                    { key: "produto", label: "Produto" },
                    { key: "total", label: "Total", align: "right" },
                    ...tamanhos.map((tamanho) => ({
                      key: `tam-${tamanho}`,
                      label: tamanho,
                      align: "right" as const,
                    })),
                    { key: "custo", label: "Custo", align: "right" },
                  ]}
                  rows={gradePorReferencia.map((item) => ({
                    id: item.referencia,
                    referencia: <span className="font-black">{item.referencia}</span>,
                    produto: item.produto,
                    total: inteiro.format(item.total),
                    custo: moeda.format(item.custo),
                    ...Object.fromEntries(
                      tamanhos.map((tamanho) => [
                        `tam-${tamanho}`,
                        inteiro.format(item.tamanhos.get(tamanho) ?? 0),
                      ]),
                    ),
                  }))}
                />
              </BISection>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
