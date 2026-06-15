"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { BIBadge, BIKpi, BISection, BITabs } from "@/components/bi/BIKit";

type Aba = "acompanhar" | "entrada" | "programacoes";

interface Etapa {
  id: string;
  nome: string;
  ordem: number;
  externa: boolean;
}

interface Programacao {
  id: string;
  nome: string;
  etapas: Etapa[];
  _count?: { ordens: number };
}

interface Saldo {
  etapaId: string;
  etapaNome: string;
  etapaOrdem: number;
  etapaExterna: boolean;
  local: string | null;
  quantidade: number;
  dataEntrada: string;
  dataPrevisaoRetorno: string | null;
  diasNaEtapa: number;
  diasAtraso: number;
  atrasada: boolean;
}

interface OP {
  id: string;
  numero: string;
  referencia: string | null;
  produto: string;
  qtdTotal: number;
  status: string;
  dataEnvio: string | null;
  dataRetornoPrevista: string | null;
  atrasada: boolean;
  diasAtraso: number;
  quantidadeConcluida: number;
  quantidadeDefeitos: number;
  saldos: Saldo[];
  programacao: Programacao;
}

interface MovimentoSelecionado {
  op: OP;
  saldo: Saldo;
  proximaEtapa: Etapa | null;
}

const inteiro = new Intl.NumberFormat("pt-BR");

function dataHoje() {
  return new Date().toISOString().slice(0, 10);
}

function formatarData(data: string | null) {
  return data ? new Date(data).toLocaleDateString("pt-BR") : "Sem previsão";
}

function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="space-y-1">
      <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-[var(--border-col)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[#102c29]"
      />
    </label>
  );
}

export default function OperacionalPage() {
  const [aba, setAba] = useState<Aba>("acompanhar");
  const [ops, setOps] = useState<OP[]>([]);
  const [programacoes, setProgramacoes] = useState<Programacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [movimento, setMovimento] = useState<MovimentoSelecionado | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [novaOP, setNovaOP] = useState({
    numero: "",
    referencia: "",
    descricao: "",
    quantidade: "",
    programacaoId: "",
    dataEnvio: dataHoje(),
    dataRetornoPrevista: "",
    localInicial: "",
  });
  const [dadosMovimento, setDadosMovimento] = useState({
    quantidade: "",
    quantidadeDefeito: "0",
    localDestino: "",
    dataPrevisaoRetorno: "",
    observacao: "",
  });
  const [novaProgramacao, setNovaProgramacao] = useState({
    nome: "",
    etapas: [
      { nome: "CORTE", externa: false },
      { nome: "COSTURA", externa: true },
      { nome: "ACABAMENTO", externa: false },
    ],
  });

  async function carregar() {
    setCarregando(true);
    try {
      const [resOps, resProgramacoes] = await Promise.all([
        fetch("/api/producao/ops"),
        fetch("/api/producao/programacoes"),
      ]);
      const [dadosOps, dadosProgramacoes] = await Promise.all([
        resOps.json(),
        resProgramacoes.json(),
      ]);
      if (!resOps.ok || !resProgramacoes.ok) {
        setMensagem(
          dadosProgramacoes.erro ??
            dadosOps.erro ??
            "Não foi possível carregar os dados de produção. Atualize a página.",
        );
        return;
      }
      setOps(dadosOps.ops ?? []);
      const lista = dadosProgramacoes.programacoes ?? [];
      setProgramacoes(lista);
      setNovaOP((atual) => ({
        ...atual,
        programacaoId: atual.programacaoId || lista[0]?.id || "",
      }));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(carregar);
  }, []);

  const metricas = useMemo(() => {
    const abertas = ops.filter((op) => !["CONCLUIDA", "CANCELADA"].includes(op.status));
    return {
      abertas: abertas.length,
      pecas: abertas.reduce(
        (total, op) => total + op.saldos.reduce((soma, saldo) => soma + saldo.quantidade, 0),
        0,
      ),
      atrasadas: abertas.filter((op) => op.atrasada).length,
      defeitos: ops.reduce((total, op) => total + op.quantidadeDefeitos, 0),
    };
  }, [ops]);

  function abrirMovimento(op: OP, saldo: Saldo) {
    const proximaEtapa =
      op.programacao.etapas.find((etapa) => etapa.ordem === saldo.etapaOrdem + 1) ??
      null;
    setMovimento({ op, saldo, proximaEtapa });
    setDadosMovimento({
      quantidade: String(saldo.quantidade),
      quantidadeDefeito: "0",
      localDestino: "",
      dataPrevisaoRetorno: op.dataRetornoPrevista?.slice(0, 10) ?? "",
      observacao: "",
    });
    setMensagem("");
  }

  async function confirmarMovimento() {
    if (!movimento) return;
    setSalvando(true);
    try {
      const resposta = await fetch(
        `/api/producao/ops/${movimento.op.id}/movimentar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            etapaOrigemId: movimento.saldo.etapaId,
            localOrigem: movimento.saldo.local,
            etapaDestinoId: movimento.proximaEtapa?.id ?? null,
            concluir: !movimento.proximaEtapa,
            quantidade: Number(dadosMovimento.quantidade),
            quantidadeDefeito: Number(dadosMovimento.quantidadeDefeito),
            localDestino: dadosMovimento.localDestino,
            dataPrevisaoRetorno: dadosMovimento.dataPrevisaoRetorno,
            observacao: dadosMovimento.observacao,
          }),
        },
      );
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagem(dados.erro ?? "Não foi possível registrar a movimentação");
        return;
      }
      setMovimento(null);
      setMensagem(
        movimento.proximaEtapa
          ? `${dadosMovimento.quantidade} peças enviadas para ${movimento.proximaEtapa.nome}`
          : `${dadosMovimento.quantidade} peças concluídas`,
      );
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function criarOrdem(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setMensagem("");
    try {
      const resposta = await fetch("/api/producao/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novaOP),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagem(dados.erro ?? "Não foi possível criar a OP");
        return;
      }
      setMensagem(`OP ${novaOP.numero} criada e enviada para a primeira etapa`);
      setNovaOP((atual) => ({
        ...atual,
        numero: "",
        referencia: "",
        descricao: "",
        quantidade: "",
        dataEnvio: dataHoje(),
        dataRetornoPrevista: "",
        localInicial: "",
      }));
      setAba("acompanhar");
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function importar() {
    if (!arquivo || !novaOP.programacaoId) return;
    setSalvando(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("programacaoId", novaOP.programacaoId);
    try {
      const resposta = await fetch("/api/producao/imports", {
        method: "POST",
        body: formData,
      });
      const dados = await resposta.json();
      setMensagem(
        resposta.ok
          ? `${dados.importadas} OPs importadas, ${dados.atualizadas} já existentes e ${dados.erros} linhas com erro`
          : dados.erro ?? "Erro na importação",
      );
      if (resposta.ok) {
        setArquivo(null);
        if (fileRef.current) fileRef.current.value = "";
        await carregar();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function criarFluxo(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    try {
      const resposta = await fetch("/api/producao/programacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novaProgramacao.nome,
          etapas: novaProgramacao.etapas.map((etapa, index) => ({
            ...etapa,
            ordem: index + 1,
          })),
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) {
        setMensagem(dados.erro ?? "Não foi possível criar a programação");
        return;
      }
      setMensagem(`Programação ${novaProgramacao.nome} criada`);
      setNovaProgramacao({
        nome: "",
        etapas: [
          { nome: "CORTE", externa: false },
          { nome: "COSTURA", externa: true },
          { nome: "ACABAMENTO", externa: false },
        ],
      });
      await carregar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <DashboardLayout
      titulo="Acompanhamento de OPs"
      descricao="Entrada e movimentação objetiva da produção"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <BITabs
            value={aba}
            onChange={setAba}
            items={[
              { id: "acompanhar", label: "Acompanhar e movimentar" },
              { id: "entrada", label: "Lançar ou importar OP" },
              { id: "programacoes", label: `Programações (${programacoes.length}/5)` },
            ]}
          />
          <p className="text-[10px] text-[var(--text-secondary)]">
            Ao enviar para o próximo setor, a saída do setor atual é automática.
          </p>
        </div>

        {mensagem && (
          <div className="rounded-xl border border-[#73d9cb]/30 bg-[#73d9cb]/8 px-4 py-3 text-xs font-semibold text-[var(--accent)]">
            {mensagem}
          </div>
        )}

        {movimento && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#031014]/75 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#73d9cb]/25 bg-[var(--bg-panel)] p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--accent)]">
                    OP {movimento.op.numero}
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    {movimento.saldo.etapaNome} →{" "}
                    {movimento.proximaEtapa?.nome ?? "Concluir"}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Saldo disponível: {inteiro.format(movimento.saldo.quantidade)} peças
                    {movimento.saldo.local ? ` em ${movimento.saldo.local}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMovimento(null)}
                  className="px-2 py-1 text-lg text-[var(--text-secondary)]"
                >
                  ×
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Quantidade enviada"
                  type="number"
                  min="1"
                  max={movimento.saldo.quantidade}
                  value={dadosMovimento.quantidade}
                  onChange={(e) =>
                    setDadosMovimento((atual) => ({
                      ...atual,
                      quantidade: e.target.value,
                    }))
                  }
                />
                <Input
                  label="Peças com defeito"
                  type="number"
                  min="0"
                  value={dadosMovimento.quantidadeDefeito}
                  onChange={(e) =>
                    setDadosMovimento((atual) => ({
                      ...atual,
                      quantidadeDefeito: e.target.value,
                    }))
                  }
                />
                {movimento.proximaEtapa && (
                  <>
                    <Input
                      label={
                        movimento.proximaEtapa.externa
                          ? "Oficina / local externo"
                          : "Setor / posição"
                      }
                      placeholder="Opcional"
                      value={dadosMovimento.localDestino}
                      onChange={(e) =>
                        setDadosMovimento((atual) => ({
                          ...atual,
                          localDestino: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Nova previsão"
                      type="date"
                      value={dadosMovimento.dataPrevisaoRetorno}
                      onChange={(e) =>
                        setDadosMovimento((atual) => ({
                          ...atual,
                          dataPrevisaoRetorno: e.target.value,
                        }))
                      }
                    />
                  </>
                )}
              </div>
              <label className="mt-3 block space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
                  Observação rápida
                </span>
                <textarea
                  rows={2}
                  value={dadosMovimento.observacao}
                  onChange={(e) =>
                    setDadosMovimento((atual) => ({
                      ...atual,
                      observacao: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-[var(--border-col)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[#102c29]"
                />
              </label>
              <button
                type="button"
                onClick={() => void confirmarMovimento()}
                disabled={salvando}
                className="mt-4 w-full rounded-lg bg-[#73d9cb] px-4 py-3 text-sm font-black text-[#06211f] disabled:opacity-50"
              >
                {salvando
                  ? "Registrando..."
                  : movimento.proximaEtapa
                    ? "Confirmar envio"
                    : "Concluir quantidade"}
              </button>
            </div>
          </div>
        )}

        {aba === "acompanhar" && (
          <>
            <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
              <BIKpi label="OPs abertas" value={String(metricas.abertas)} tone="accent" />
              <BIKpi
                label="Peças em fluxo"
                value={inteiro.format(metricas.pecas)}
                detail="somadas em todos os setores"
              />
              <BIKpi
                label="OPs atrasadas"
                value={String(metricas.atrasadas)}
                tone={metricas.atrasadas ? "danger" : "success"}
              />
              <BIKpi
                label="Defeitos apontados"
                value={inteiro.format(metricas.defeitos)}
                tone={metricas.defeitos ? "warning" : "success"}
              />
            </section>

            {carregando ? (
              <div className="h-48 animate-pulse rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)]" />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {ops
                  .filter((op) => !["CONCLUIDA", "CANCELADA"].includes(op.status))
                  .map((op) => (
                    <BISection
                      key={op.id}
                      title={`OP ${op.numero} · ${op.produto}`}
                      subtitle={`${op.referencia || "Sem referência"} · ${inteiro.format(op.qtdTotal)} peças · ${op.programacao.nome}`}
                      action={
                        op.atrasada ? (
                          <BIBadge tone="danger">{op.diasAtraso}d de atraso</BIBadge>
                        ) : (
                          <BIBadge tone="success">Em fluxo</BIBadge>
                        )
                      }
                    >
                      <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-[var(--text-secondary)]">
                        <span>Envio: {formatarData(op.dataEnvio)}</span>
                        <span>Retorno: {formatarData(op.dataRetornoPrevista)}</span>
                        <span>Concluídas: {inteiro.format(op.quantidadeConcluida)}</span>
                        {op.quantidadeDefeitos > 0 && (
                          <span className="font-bold text-[#c87922]">
                            Defeitos: {inteiro.format(op.quantidadeDefeitos)}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {op.saldos.map((saldo) => (
                          <div
                            key={`${saldo.etapaId}-${saldo.local ?? ""}`}
                            className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_auto] sm:items-center ${
                              saldo.atrasada
                                ? "border-[#ef8e78]/40 bg-[#ef8e78]/6"
                                : "border-[var(--border-col)] bg-[var(--bg-panel-soft)]"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-xs">{saldo.etapaNome}</strong>
                                <BIBadge tone={saldo.etapaExterna ? "warning" : "accent"}>
                                  {saldo.etapaExterna ? "Externo" : "Interno"}
                                </BIBadge>
                                <span className="text-xs font-black">
                                  {inteiro.format(saldo.quantidade)} peças
                                </span>
                              </div>
                              <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                                {saldo.local || "Sem local específico"} · {saldo.diasNaEtapa}d
                                na etapa
                                {saldo.atrasada ? ` · ${saldo.diasAtraso}d atrasada` : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => abrirMovimento(op, saldo)}
                              className="rounded-lg bg-[#73d9cb]/16 px-3 py-2 text-[11px] font-black text-[var(--accent)]"
                            >
                              {saldo.etapaOrdem === op.programacao.etapas.length
                                ? "Concluir"
                                : "Enviar ao próximo"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </BISection>
                  ))}
              </div>
            )}
          </>
        )}

        {aba === "entrada" && (
          <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
            <BISection
              title="Lançar uma OP"
              subtitle="Somente os dados necessários para iniciar o acompanhamento"
            >
              <form onSubmit={criarOrdem} className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="OP"
                  required
                  value={novaOP.numero}
                  onChange={(e) => setNovaOP({ ...novaOP, numero: e.target.value })}
                />
                <Input
                  label="Referência"
                  value={novaOP.referencia}
                  onChange={(e) => setNovaOP({ ...novaOP, referencia: e.target.value })}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Descrição"
                    required
                    value={novaOP.descricao}
                    onChange={(e) => setNovaOP({ ...novaOP, descricao: e.target.value })}
                  />
                </div>
                <Input
                  label="Quantidade"
                  type="number"
                  min="1"
                  required
                  value={novaOP.quantidade}
                  onChange={(e) => setNovaOP({ ...novaOP, quantidade: e.target.value })}
                />
                <label className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
                    Programação
                  </span>
                  <select
                    required
                    value={novaOP.programacaoId}
                    onChange={(e) =>
                      setNovaOP({ ...novaOP, programacaoId: e.target.value })
                    }
                    className="w-full rounded-lg border border-[var(--border-col)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[#102c29]"
                  >
                    <option value="">Selecione</option>
                    {programacoes.map((programacao) => (
                      <option key={programacao.id} value={programacao.id}>
                        {programacao.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Data de envio"
                  type="date"
                  required
                  value={novaOP.dataEnvio}
                  onChange={(e) => setNovaOP({ ...novaOP, dataEnvio: e.target.value })}
                />
                <Input
                  label="Data de retorno"
                  type="date"
                  value={novaOP.dataRetornoPrevista}
                  onChange={(e) =>
                    setNovaOP({ ...novaOP, dataRetornoPrevista: e.target.value })
                  }
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Local inicial (opcional)"
                    placeholder="Ex.: Estoque, Oficina Silva"
                    value={novaOP.localInicial}
                    onChange={(e) =>
                      setNovaOP({ ...novaOP, localInicial: e.target.value })
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={salvando || programacoes.length === 0}
                  className="sm:col-span-2 rounded-lg bg-[#73d9cb] px-4 py-3 text-sm font-black text-[#06211f] disabled:opacity-50"
                >
                  {programacoes.length === 0
                    ? "Crie uma programação primeiro"
                    : salvando
                      ? "Criando..."
                      : "Criar e iniciar OP"}
                </button>
              </form>
            </BISection>

            <BISection
              title="Importar planilha"
              subtitle="Use o modelo simples do Headstock"
            >
              <div className="space-y-3">
                <a
                  href="/api/producao/modelo"
                  className="flex items-center justify-between rounded-xl border border-[#73d9cb]/30 bg-[#73d9cb]/8 p-3 text-xs font-black text-[var(--accent)]"
                >
                  Baixar modelo de importação
                  <span>↓ XLSX</span>
                </a>
                <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
                  Colunas: OP, Referência, Descrição, Quantidade, Data de Envio e
                  Data de Retorno.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                  className="w-full text-xs"
                />
                <button
                  type="button"
                  onClick={() => void importar()}
                  disabled={!arquivo || !novaOP.programacaoId || salvando}
                  className="w-full rounded-lg border border-[var(--accent)] px-4 py-3 text-sm font-black text-[var(--accent)] disabled:opacity-40"
                >
                  {salvando ? "Importando..." : "Importar para a programação selecionada"}
                </button>
              </div>
            </BISection>
          </div>
        )}

        {aba === "programacoes" && (
          <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
            <BISection
              title="Programações disponíveis"
              subtitle="Uma OP não muda de programação depois que começa a movimentar"
            >
              <div className="space-y-2">
                {programacoes.map((programacao) => (
                  <div
                    key={programacao.id}
                    className="rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel-soft)] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <strong className="text-xs">{programacao.nome}</strong>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {programacao._count?.ordens ?? 0} OPs
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {programacao.etapas.map((etapa) => (
                        <BIBadge key={etapa.id} tone={etapa.externa ? "warning" : "accent"}>
                          {etapa.ordem}. {etapa.nome}
                        </BIBadge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </BISection>

            <BISection
              title="Nova programação"
              subtitle={`${Math.max(0, 5 - programacoes.length)} espaços disponíveis`}
            >
              <form onSubmit={criarFluxo} className="space-y-3">
                {mensagem && (
                  <div className="rounded-lg border border-[#e6c071]/35 bg-[#e6c071]/8 px-3 py-2 text-xs font-semibold text-[#b17b1d] dark:text-[#e6c071]">
                    {mensagem}
                  </div>
                )}
                <Input
                  label="Nome da programação"
                  required
                  placeholder="Ex.: Produção terceirizada"
                  value={novaProgramacao.nome}
                  onChange={(e) =>
                    setNovaProgramacao({ ...novaProgramacao, nome: e.target.value })
                  }
                />
                <div className="space-y-2">
                  {novaProgramacao.etapas.map((etapa, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-2"
                    >
                      <span className="text-center text-xs font-black text-[var(--accent)]">
                        {index + 1}
                      </span>
                      <input
                        required
                        value={etapa.nome}
                        onChange={(e) =>
                          setNovaProgramacao((atual) => ({
                            ...atual,
                            etapas: atual.etapas.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, nome: e.target.value }
                                : item,
                            ),
                          }))
                        }
                        className="rounded-lg border border-[var(--border-col)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[#102c29]"
                      />
                      <label className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={etapa.externa}
                          onChange={(e) =>
                            setNovaProgramacao((atual) => ({
                              ...atual,
                              etapas: atual.etapas.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, externa: e.target.checked }
                                  : item,
                              ),
                            }))
                          }
                        />
                        Externa
                      </label>
                      <button
                        type="button"
                        disabled={novaProgramacao.etapas.length <= 2}
                        onClick={() =>
                          setNovaProgramacao((atual) => ({
                            ...atual,
                            etapas: atual.etapas.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                        className="px-2 text-sm text-[#ef8e78] disabled:opacity-20"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setNovaProgramacao((atual) => ({
                        ...atual,
                        etapas: [...atual.etapas, { nome: "", externa: false }],
                      }))
                    }
                    className="flex-1 rounded-lg border border-[var(--border-col)] px-3 py-2 text-xs font-bold"
                  >
                    Adicionar etapa
                  </button>
                  <button
                    type="submit"
                    disabled={salvando || programacoes.length >= 5}
                    className="flex-1 rounded-lg bg-[#73d9cb] px-3 py-2 text-xs font-black text-[#06211f] disabled:opacity-40"
                  >
                    Criar programação
                  </button>
                </div>
              </form>
            </BISection>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
