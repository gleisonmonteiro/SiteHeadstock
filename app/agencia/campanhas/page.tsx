"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  BIBarList,
  BIBadge,
  BIDataTable,
  BIKpi,
  BISection,
  BITabs,
} from "@/components/bi/BIKit";

type Aba = "visao" | "campanhas" | "evolucao";
type Modal = "campanha" | "metrica" | "estrategia" | "card" | null;
type Tom = "neutral" | "success" | "warning" | "danger" | "accent";

type Indicadores = {
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  leads: number;
  conversoes: number;
  receitaAtribuida: number;
  roas: number;
  roi: number;
  ctr: number;
  taxaConversao: number;
  cpl: number;
  cpa: number;
  ritmoOrcamento: number;
};

type Campanha = {
  id: string;
  nome: string;
  objetivo: string;
  canal: string;
  status: string;
  orcamento: number;
  custoOperacional: number;
  modeloAtribuicao: string;
  fonteDados: string;
  diagnostico: string | null;
  recomendacao: string | null;
  proximaAcao: string | null;
  cliente: { id: string; nome: string; empresaConectadaId: string | null };
  indicadores: Indicadores;
  decisao: { codigo: string; label: string; tom: Tom; motivo: string };
  vendasEmpresaPeriodo: number | null;
};

type CardGerado = {
  id: string;
  titulo: string;
  mensagem: string;
  createdAt: string;
  cliente: { nome: string };
  campanha: { nome: string } | null;
  dados: {
    cliente: string;
    campanha: string;
    objetivo: string;
    canal: string;
    indicadores: Indicadores;
    decisao: { codigo: string; label: string; tom: Tom; motivo: string };
    diagnostico: string | null;
    recomendacao: string;
    proximaAcao: string | null;
    modeloAtribuicao: string;
    fonteDados: string;
  };
};

type Performance = {
  resumo: Indicadores & {
    campanhas: number;
    campanhasAtivas: number;
    emAtencao: number;
    orcamento: number;
  };
  clientes: Array<{ id: string; nome: string }>;
  campanhas: Campanha[];
  evolucao: Array<{
    data: string;
    investimento: number;
    receitaAtribuida: number;
    conversoes: number;
  }>;
  cards: CardGerado[];
  avisoAtribuicao: string;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const numero = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const campoClass =
  "w-full rounded-lg border border-[var(--border-col)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[#102c29] outline-none focus:border-[var(--accent)]";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function dataCurta(data: string) {
  return new Date(`${data.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function CardPerformance({ card }: { card: CardGerado }) {
  const d = card.dados;
  return (
    <article className="relative overflow-hidden rounded-2xl border border-[#73d9cb]/30 bg-[#071b20] p-6 text-white shadow-2xl">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#73d9cb]/15 blur-3xl" />
      <div className="relative">
        <header className="flex items-start justify-between gap-5 border-b border-white/10 pb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#73d9cb]">
              Headstock | Performance de Campanha
            </p>
            <h3 className="mt-2 text-2xl font-black">{d.cliente}</h3>
            <p className="mt-1 text-sm text-[#b3ceca]">{d.campanha}</p>
          </div>
          <span className="rounded-full border border-[#73d9cb]/30 bg-[#73d9cb]/10 px-4 py-2 text-xs font-black text-[#8ce6da]">
            {d.decisao.label}
          </span>
        </header>
        <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
          {[
            ["Investimento", moeda.format(d.indicadores.investimento)],
            ["Receita atribuída", moeda.format(d.indicadores.receitaAtribuida)],
            ["ROAS", `${d.indicadores.roas.toFixed(2)}x`],
            ["Conversões", numero.format(d.indicadores.conversoes)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#8ba8a4]">{label}</p>
              <strong className="mt-1 block text-lg font-black">{value}</strong>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#73d9cb]/10 p-4">
            <p className="text-[9px] font-black uppercase tracking-wide text-[#73d9cb]">Leitura do resultado</p>
            <p className="mt-2 text-sm leading-6 text-[#e8f5f2]">{d.diagnostico || d.decisao.motivo}</p>
          </div>
          <div className="rounded-xl bg-[#e6c071]/10 p-4">
            <p className="text-[9px] font-black uppercase tracking-wide text-[#e6c071]">Próxima decisão</p>
            <p className="mt-2 text-sm leading-6 text-[#f6eedc]">{d.proximaAcao || d.recomendacao}</p>
          </div>
        </div>
        <footer className="mt-5 flex flex-wrap justify-between gap-2 text-[9px] text-[#789b96]">
          <span>Atribuição: {d.modeloAtribuicao}</span>
          <span>Fonte: {d.fonteDados}</span>
        </footer>
      </div>
    </article>
  );
}

export default function CampanhasPage() {
  const [aba, setAba] = useState<Aba>("visao");
  const [dados, setDados] = useState<Performance | null>(null);
  const [clienteId, setClienteId] = useState("");
  const [campanhaId, setCampanhaId] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [cardAtual, setCardAtual] = useState<CardGerado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  async function carregar(filtro = clienteId) {
    setCarregando(true);
    setErro("");
    try {
      const query = filtro ? `?clienteId=${encodeURIComponent(filtro)}` : "";
      const resposta = await fetch(`/api/agencia/campanhas${query}`);
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro);
      setDados(resultado);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao carregar campanhas");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    let ativo = true;
    async function carregarInicial() {
      try {
        const resposta = await fetch("/api/agencia/campanhas");
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro);
        if (ativo) setDados(resultado);
      } catch (falha) {
        if (ativo) {
          setErro(falha instanceof Error ? falha.message : "Erro ao carregar campanhas");
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregarInicial();
    return () => {
      ativo = false;
    };
  }, []);

  const campanhas = useMemo(() => dados?.campanhas ?? [], [dados]);
  const campanhaSelecionada = useMemo(
    () => campanhas.find((campanha) => campanha.id === campanhaId) ?? null,
    [campanhaId, campanhas],
  );

  async function executar(acao: string, formulario?: HTMLFormElement, id = campanhaId) {
    const form = formulario ? new FormData(formulario) : new FormData();
    const get = (nome: string) => String(form.get(nome) ?? "").trim();
    const getNumero = (nome: string) => Number(form.get(nome)) || 0;
    let payload: Record<string, unknown>;

    if (acao === "criar_campanha") {
      payload = {
        clienteId: get("clienteId"),
        nome: get("nome"),
        objetivo: get("objetivo"),
        canal: get("canal"),
        dataInicio: get("dataInicio"),
        dataFim: get("dataFim") || undefined,
        orcamento: getNumero("orcamento"),
        custoOperacional: getNumero("custoOperacional"),
        modeloAtribuicao: get("modeloAtribuicao"),
        fonteDados: get("fonteDados"),
      };
    } else if (acao === "registrar_metrica") {
      payload = {
        campanhaId: get("campanhaId"),
        data: get("data"),
        investimento: getNumero("investimento"),
        impressoes: getNumero("impressoes"),
        alcance: getNumero("alcance"),
        cliques: getNumero("cliques"),
        leads: getNumero("leads"),
        conversoes: getNumero("conversoes"),
        receitaAtribuida: getNumero("receitaAtribuida"),
        observacao: get("observacao"),
      };
    } else if (acao === "atualizar_estrategia") {
      payload = {
        campanhaId: get("campanhaId"),
        status: get("status"),
        diagnostico: get("diagnostico"),
        recomendacao: get("recomendacao"),
        proximaAcao: get("proximaAcao"),
      };
    } else {
      payload = { campanhaId: id };
    }

    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const resposta = await fetch("/api/agencia/campanhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, dados: payload }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro);
      if (acao === "gerar_card") {
        setCardAtual(resultado);
        setModal("card");
      } else {
        setModal(null);
        setMensagem("Informações atualizadas com sucesso.");
      }
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function copiarCard() {
    if (!cardAtual) return;
    await navigator.clipboard.writeText(cardAtual.mensagem);
    setMensagem("Resumo do card copiado.");
  }

  function baixarCard() {
    if (!cardAtual) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const d = cardAtual.dados;
    const quebra = (texto: string, max: number) => {
      const palavras = texto.split(" ");
      const linhas: string[] = [];
      let linha = "";
      for (const palavra of palavras) {
        const teste = `${linha} ${palavra}`.trim();
        if (ctx.measureText(teste).width > max && linha) {
          linhas.push(linha);
          linha = palavra;
        } else linha = teste;
      }
      if (linha) linhas.push(linha);
      return linhas;
    };

    const gradiente = ctx.createLinearGradient(0, 0, 1200, 675);
    gradiente.addColorStop(0, "#06171c");
    gradiente.addColorStop(1, "#0b3234");
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, 1200, 675);
    ctx.fillStyle = "rgba(115,217,203,.10)";
    ctx.beginPath();
    ctx.arc(1050, 80, 230, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#73d9cb";
    ctx.font = "700 18px Segoe UI";
    ctx.fillText("HEADSTOCK | PERFORMANCE DE CAMPANHA", 70, 62);
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 42px Segoe UI";
    ctx.fillText(d.cliente, 70, 120);
    ctx.fillStyle = "#b3ceca";
    ctx.font = "500 24px Segoe UI";
    ctx.fillText(d.campanha, 70, 158);

    [
      ["INVESTIMENTO", moeda.format(d.indicadores.investimento)],
      ["RECEITA ATRIBUÍDA", moeda.format(d.indicadores.receitaAtribuida)],
      ["ROAS", `${d.indicadores.roas.toFixed(2)}x`],
      ["CONVERSÕES", numero.format(d.indicadores.conversoes)],
    ].forEach(([label, value], indice) => {
      const x = 70 + indice * 270;
      ctx.fillStyle = "rgba(255,255,255,.06)";
      ctx.fillRect(x, 200, 245, 105);
      ctx.fillStyle = "#789b96";
      ctx.font = "700 14px Segoe UI";
      ctx.fillText(label, x + 18, 230);
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 28px Segoe UI";
      ctx.fillText(value, x + 18, 273);
    });

    ctx.fillStyle = "#73d9cb";
    ctx.font = "800 16px Segoe UI";
    ctx.fillText(`DIREÇÃO: ${d.decisao.label.toUpperCase()}`, 70, 355);
    ctx.fillStyle = "#e8f5f2";
    ctx.font = "500 22px Segoe UI";
    quebra(d.diagnostico || d.decisao.motivo, 490).slice(0, 4)
      .forEach((linha, indice) => ctx.fillText(linha, 70, 395 + indice * 31));
    ctx.fillStyle = "#e6c071";
    ctx.font = "800 16px Segoe UI";
    ctx.fillText("PRÓXIMA DECISÃO", 650, 355);
    ctx.fillStyle = "#f6eedc";
    ctx.font = "500 22px Segoe UI";
    quebra(d.proximaAcao || d.recomendacao, 480).slice(0, 4)
      .forEach((linha, indice) => ctx.fillText(linha, 650, 395 + indice * 31));
    ctx.fillStyle = "#789b96";
    ctx.font = "500 14px Segoe UI";
    ctx.fillText(`Atribuição: ${d.modeloAtribuicao}`, 70, 625);
    ctx.textAlign = "right";
    ctx.fillText(`Fonte: ${d.fonteDados}`, 1130, 625);

    const link = document.createElement("a");
    link.download = `card-${d.cliente.toLowerCase().replaceAll(" ", "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (carregando && !dados) {
    return (
      <DashboardLayout titulo="Performance de Campanhas" descricao="Investimento, resultado e direção estratégica">
        <div className="py-24 text-center text-sm text-[var(--text-secondary)]">Consolidando campanhas...</div>
      </DashboardLayout>
    );
  }

  const resumo = dados?.resumo;
  const linhas = campanhas.map((campanha) => ({
    id: campanha.id,
    campanha: (
      <button type="button" className="text-left" onClick={() => {
        setCampanhaId(campanha.id);
        setModal("estrategia");
      }}>
        <strong className="block text-[var(--text-primary)]">{campanha.nome}</strong>
        <span className="text-[9px] text-[var(--text-secondary)]">
          {campanha.cliente.nome} · {campanha.canal}
        </span>
      </button>
    ),
    investimento: moeda.format(campanha.indicadores.investimento),
    receita: moeda.format(campanha.indicadores.receitaAtribuida),
    roas: <strong>{campanha.indicadores.roas.toFixed(2)}x</strong>,
    cpa: moeda.format(campanha.indicadores.cpa),
    ritmo: `${decimal.format(campanha.indicadores.ritmoOrcamento)}%`,
    decisao: <BIBadge tone={campanha.decisao.tom}>{campanha.decisao.label}</BIBadge>,
    card: (
      <button type="button" className="border border-[#73d9cb]/35 px-2.5 py-1 text-[10px] font-extrabold text-[var(--accent)]"
        onClick={() => {
          setCampanhaId(campanha.id);
          void executar("gerar_card", undefined, campanha.id);
        }}>
        Gerar card
      </button>
    ),
  }));

  return (
    <DashboardLayout titulo="Performance de Campanhas" descricao="Investimento, vendas atribuídas e decisões de rota por cliente">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BITabs items={[
            { id: "visao", label: "Visão executiva" },
            { id: "campanhas", label: "Campanhas" },
            { id: "evolucao", label: "Evolução" },
          ]} value={aba} onChange={setAba} />
          <div className="flex flex-wrap items-center gap-2">
            <select value={clienteId} className={campoClass} onChange={(evento) => {
              setClienteId(evento.target.value);
              void carregar(evento.target.value);
            }}>
              <option value="">Todos os clientes</option>
              {dados?.clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
            </select>
            <button type="button" className="border border-[var(--border-col)] bg-[var(--bg-panel)] px-3 py-2 text-xs font-extrabold" onClick={() => setModal("metrica")}>Atualizar resultados</button>
            <button type="button" className="bg-[#b9f0ce] px-3 py-2 text-xs font-extrabold text-[#07161a]" onClick={() => setModal("campanha")}>Nova campanha</button>
          </div>
        </div>

        {(erro || mensagem) && (
          <div className={`rounded-lg border px-4 py-2 text-xs ${erro ? "border-[#ef8e78]/30 bg-[#ef8e78]/10 text-[var(--danger)]" : "border-[#73d9cb]/30 bg-[#73d9cb]/10 text-[var(--accent)]"}`}>
            {erro || mensagem}
          </div>
        )}

        {resumo && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <BIKpi label="Investimento" value={moeda.format(resumo.investimento)} detail={`${decimal.format(resumo.ritmoOrcamento)}% do orçamento`} />
            <BIKpi label="Receita atribuída" value={moeda.format(resumo.receitaAtribuida)} tone="accent" />
            <BIKpi label="ROAS consolidado" value={`${resumo.roas.toFixed(2)}x`} tone={resumo.roas >= 3 ? "success" : "warning"} />
            <BIKpi label="ROI" value={`${decimal.format(resumo.roi)}%`} tone={resumo.roi >= 0 ? "success" : "danger"} />
            <BIKpi label="Conversões" value={numero.format(resumo.conversoes)} detail={`CPA ${moeda.format(resumo.cpa)}`} />
            <BIKpi label="Mudar de rota" value={numero.format(resumo.emAtencao)} detail={`${resumo.campanhasAtivas} campanhas ativas`} tone={resumo.emAtencao ? "danger" : "success"} />
          </div>
        )}

        {aba === "visao" && (
          <>
            <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
              <BISection title="Ranking por receita atribuída" subtitle="Campanhas que mais transformaram mídia em resultado rastreado">
                <BIBarList items={campanhas.slice().sort((a, b) => b.indicadores.receitaAtribuida - a.indicadores.receitaAtribuida).map((campanha) => ({
                  label: campanha.nome,
                  value: campanha.indicadores.receitaAtribuida,
                  detail: `${campanha.cliente.nome} · ROAS ${campanha.indicadores.roas.toFixed(2)}x`,
                }))} formatValue={moeda.format} color="#1478ff" />
              </BISection>
              <BISection title="Direção recomendada" subtitle="Onde escalar, otimizar ou interromper desperdício">
                <div className="space-y-2">
                  {campanhas.slice().sort((a, b) => {
                    const peso = (codigo: string) => codigo === "MUDAR_ROTA" ? 0 : codigo === "ESCALAR" ? 1 : 2;
                    return peso(a.decisao.codigo) - peso(b.decisao.codigo);
                  }).slice(0, 6).map((campanha) => (
                    <button key={campanha.id} type="button" className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border-col)] p-3 text-left hover:bg-[var(--bg-panel-soft)]" onClick={() => {
                      setCampanhaId(campanha.id);
                      setModal("estrategia");
                    }}>
                      <span className="min-w-0">
                        <strong className="block truncate text-xs">{campanha.nome}</strong>
                        <span className="block truncate text-[9px] text-[var(--text-secondary)]">{campanha.decisao.motivo}</span>
                      </span>
                      <BIBadge tone={campanha.decisao.tom}>{campanha.decisao.label}</BIBadge>
                    </button>
                  ))}
                </div>
              </BISection>
            </div>
            <BISection title="Campanhas em andamento" subtitle="Clique na campanha para registrar diagnóstico e próxima ação">
              <BIDataTable columns={[
                { key: "campanha", label: "Campanha" },
                { key: "investimento", label: "Investimento", align: "right" },
                { key: "receita", label: "Receita atribuída", align: "right" },
                { key: "roas", label: "ROAS", align: "right" },
                { key: "ritmo", label: "% orçamento", align: "right" },
                { key: "decisao", label: "Direção" },
                { key: "card", label: "Transparência" },
              ]} rows={linhas} />
            </BISection>
          </>
        )}

        {aba === "campanhas" && (
          <div className="grid gap-3 xl:grid-cols-[1fr_320px]">
            <BISection title="Portfólio de campanhas" subtitle="Eficiência, orçamento e decisão por iniciativa">
              <BIDataTable columns={[
                { key: "campanha", label: "Campanha" },
                { key: "investimento", label: "Investimento", align: "right" },
                { key: "receita", label: "Receita atribuída", align: "right" },
                { key: "roas", label: "ROAS", align: "right" },
                { key: "cpa", label: "CPA", align: "right" },
                { key: "decisao", label: "Direção" },
                { key: "card", label: "Card" },
              ]} rows={linhas} />
            </BISection>
            <BISection title="Cards recentes" subtitle="Snapshots já gerados para prestação de contas">
              <div className="space-y-2">
                {dados?.cards.map((card) => (
                  <button key={card.id} type="button" className="w-full rounded-lg border border-[var(--border-col)] p-3 text-left hover:bg-[var(--bg-panel-soft)]" onClick={() => {
                    setCardAtual(card);
                    setModal("card");
                  }}>
                    <strong className="block truncate text-xs">{card.campanha?.nome}</strong>
                    <span className="mt-1 block text-[9px] text-[var(--text-secondary)]">{card.cliente.nome} · {new Date(card.createdAt).toLocaleString("pt-BR")}</span>
                  </button>
                ))}
              </div>
            </BISection>
          </div>
        )}

        {aba === "evolucao" && (
          <BISection title="Investimento x receita atribuída" subtitle="Evolução diária consolidada no recorte selecionado">
            <div className="h-[430px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados?.evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(96,123,119,.18)" />
                  <XAxis dataKey="data" tickFormatter={dataCurta} fontSize={10} />
                  <YAxis tickFormatter={(valor) => `${Math.round(valor / 1000)} mil`} fontSize={10} />
                  <Tooltip labelFormatter={(label) => dataCurta(String(label))} formatter={(valor) => moeda.format(Number(valor))} contentStyle={{ background: "var(--bg-panel)", border: "1px solid var(--border-col)", borderRadius: 10 }} />
                  <Line type="monotone" dataKey="investimento" name="Investimento" stroke="#e6c071" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="receitaAtribuida" name="Receita atribuída" stroke="#1478ff" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </BISection>
        )}

        <p className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel-soft)] px-4 py-2 text-[9px] leading-4 text-[var(--text-secondary)]">{dados?.avisoAtribuicao}</p>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020d11]/75 p-4 backdrop-blur-sm">
          <div className={`max-h-[92vh] w-full overflow-auto rounded-2xl border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-2xl ${modal === "card" ? "max-w-4xl" : "max-w-2xl"}`}>
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border-col)] bg-[var(--bg-panel)] px-5 py-4">
              <div>
                <h2 className="font-black">
                  {modal === "campanha" && "Nova campanha"}
                  {modal === "metrica" && "Atualizar resultados"}
                  {modal === "estrategia" && "Diagnóstico e próxima decisão"}
                  {modal === "card" && "Card de transparência"}
                </h2>
                <p className="text-[10px] text-[var(--text-secondary)]">{campanhaSelecionada?.nome}</p>
              </div>
              <button type="button" className="px-3 py-1 text-xl" onClick={() => setModal(null)}>×</button>
            </header>

            {modal === "campanha" && (
              <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(evento) => {
                evento.preventDefault();
                void executar("criar_campanha", evento.currentTarget);
              }}>
                <Campo label="Cliente"><select name="clienteId" required className={campoClass}><option value="">Selecione</option>{dados?.clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}</select></Campo>
                <Campo label="Campanha"><input name="nome" required className={campoClass} /></Campo>
                <Campo label="Objetivo"><input name="objetivo" required className={campoClass} placeholder="Ex.: vendas no e-commerce" /></Campo>
                <Campo label="Canal"><input name="canal" required className={campoClass} placeholder="Meta Ads, Google, influenciadores..." /></Campo>
                <Campo label="Início"><input name="dataInicio" type="date" required className={campoClass} /></Campo>
                <Campo label="Fim previsto"><input name="dataFim" type="date" className={campoClass} /></Campo>
                <Campo label="Orçamento de mídia"><input name="orcamento" type="number" min="0" step="0.01" className={campoClass} /></Campo>
                <Campo label="Custo operacional"><input name="custoOperacional" type="number" min="0" step="0.01" className={campoClass} /></Campo>
                <Campo label="Modelo de atribuição"><input name="modeloAtribuicao" required className={campoClass} placeholder="UTM, cupom, CRM..." /></Campo>
                <Campo label="Fonte dos dados"><input name="fonteDados" required className={campoClass} placeholder="Meta Ads + checkout" /></Campo>
                <button disabled={salvando} className="sm:col-span-2 bg-[#b9f0ce] px-4 py-3 font-extrabold text-[#07161a]">{salvando ? "Salvando..." : "Criar campanha"}</button>
              </form>
            )}

            {modal === "metrica" && (
              <form className="grid gap-4 p-5 sm:grid-cols-3" onSubmit={(evento) => {
                evento.preventDefault();
                void executar("registrar_metrica", evento.currentTarget);
              }}>
                <div className="sm:col-span-2"><Campo label="Campanha"><select name="campanhaId" required className={campoClass}><option value="">Selecione</option>{campanhas.map((campanha) => <option key={campanha.id} value={campanha.id}>{campanha.cliente.nome} | {campanha.nome}</option>)}</select></Campo></div>
                <Campo label="Data"><input name="data" type="date" required className={campoClass} /></Campo>
                <Campo label="Investimento"><input name="investimento" type="number" min="0" step="0.01" className={campoClass} /></Campo>
                <Campo label="Receita atribuída"><input name="receitaAtribuida" type="number" min="0" step="0.01" className={campoClass} /></Campo>
                <Campo label="Conversões"><input name="conversoes" type="number" min="0" className={campoClass} /></Campo>
                <Campo label="Impressões"><input name="impressoes" type="number" min="0" className={campoClass} /></Campo>
                <Campo label="Alcance"><input name="alcance" type="number" min="0" className={campoClass} /></Campo>
                <Campo label="Cliques"><input name="cliques" type="number" min="0" className={campoClass} /></Campo>
                <Campo label="Leads"><input name="leads" type="number" min="0" className={campoClass} /></Campo>
                <div className="sm:col-span-2"><Campo label="Observação"><input name="observacao" className={campoClass} /></Campo></div>
                <button disabled={salvando} className="sm:col-span-3 bg-[#b9f0ce] px-4 py-3 font-extrabold text-[#07161a]">{salvando ? "Salvando..." : "Atualizar resultados"}</button>
              </form>
            )}

            {modal === "estrategia" && campanhaSelecionada && (
              <form className="space-y-4 p-5" onSubmit={(evento) => {
                evento.preventDefault();
                void executar("atualizar_estrategia", evento.currentTarget);
              }}>
                <input type="hidden" name="campanhaId" value={campanhaSelecionada.id} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <BIKpi label="Investimento" value={moeda.format(campanhaSelecionada.indicadores.investimento)} />
                  <BIKpi label="Receita atribuída" value={moeda.format(campanhaSelecionada.indicadores.receitaAtribuida)} />
                  <BIKpi label="ROAS" value={`${campanhaSelecionada.indicadores.roas.toFixed(2)}x`} />
                  <BIKpi label="Decisão" value={campanhaSelecionada.decisao.label} tone={campanhaSelecionada.decisao.tom === "neutral" ? "default" : campanhaSelecionada.decisao.tom} />
                </div>
                {campanhaSelecionada.vendasEmpresaPeriodo !== null && (
                  <p className="rounded-lg border border-[#e6c071]/30 bg-[#e6c071]/10 px-3 py-2 text-[10px] text-[var(--text-secondary)]">
                    Vendas totais da empresa no período: <strong>{moeda.format(campanhaSelecionada.vendasEmpresaPeriodo)}</strong>. Esse valor é contexto e não receita atribuída à campanha.
                  </p>
                )}
                <Campo label="Status"><select name="status" defaultValue={campanhaSelecionada.status} className={campoClass}><option value="PLANEJAMENTO">Planejamento</option><option value="ATIVA">Ativa</option><option value="PAUSADA">Pausada</option><option value="ENCERRADA">Encerrada</option></select></Campo>
                <Campo label="Diagnóstico"><textarea name="diagnostico" rows={3} defaultValue={campanhaSelecionada.diagnostico ?? ""} className={campoClass} /></Campo>
                <Campo label="Recomendação"><textarea name="recomendacao" rows={3} defaultValue={campanhaSelecionada.recomendacao ?? ""} className={campoClass} /></Campo>
                <Campo label="Próxima ação"><textarea name="proximaAcao" rows={3} defaultValue={campanhaSelecionada.proximaAcao ?? ""} className={campoClass} /></Campo>
                <div className="flex gap-2">
                  <button disabled={salvando} className="flex-1 bg-[#b9f0ce] px-4 py-3 font-extrabold text-[#07161a]">Salvar estratégia</button>
                  <button type="button" className="border border-[var(--accent)] px-4 py-3 font-extrabold text-[var(--accent)]" onClick={() => void executar("gerar_card")}>Gerar card</button>
                </div>
              </form>
            )}

            {modal === "card" && cardAtual && (
              <div className="space-y-4 p-5">
                <CardPerformance card={cardAtual} />
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" className="border border-[var(--border-col)] px-4 py-2 text-xs font-extrabold" onClick={() => void copiarCard()}>Copiar resumo</button>
                  <button type="button" className="bg-[#b9f0ce] px-4 py-2 text-xs font-extrabold text-[#07161a]" onClick={baixarCard}>Baixar PNG</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
