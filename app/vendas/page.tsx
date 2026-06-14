"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Formatadores ───────────────────────────────────────────────────────────────

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const moedaDec = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const inteiro = new Intl.NumberFormat("pt-BR");

// ── Gauge semicircular ─────────────────────────────────────────────────────────

function GaugeMeta({
  pct,
  realizado,
  meta,
}: {
  pct: number;
  realizado: number;
  meta: number;
}) {
  const p = Math.min(Math.max(pct, 0.5), 100);
  const angle = (1 - p / 100) * Math.PI;
  const ex = (100 + 80 * Math.cos(angle)).toFixed(2);
  const ey = (100 - 80 * Math.sin(angle)).toFixed(2);
  const largeArc = p > 50 ? 1 : 0;
  const cor =
    pct >= 100
      ? "#C8F34D"
      : pct >= 80
        ? "#73d9cb"
        : pct >= 50
          ? "#e6c071"
          : "#ef8e78";
  const superou = realizado > meta;
  const diff = Math.abs(meta - realizado);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 108" className="w-full max-w-[260px]">
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#1F3A3A"
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d={`M 20 100 A 80 80 0 ${largeArc} 1 ${ex} ${ey}`}
          fill="none"
          stroke={cor}
          strokeWidth="18"
          strokeLinecap="round"
        />
        <text
          x="100"
          y="75"
          textAnchor="middle"
          fontSize="30"
          fontWeight="900"
          fill={cor}
        >
          {pct}%
        </text>
        <text x="100" y="93" textAnchor="middle" fontSize="10" fill="#789b96">
          da meta atingida
        </text>
      </svg>
      <div className="mt-3 grid w-full max-w-[260px] grid-cols-3 gap-2 text-center text-[11px]">
        <div className="rounded-lg border border-[#1F3A3A] p-2">
          <p className="text-sm font-extrabold text-white">
            {moeda.format(realizado)}
          </p>
          <p className="mt-0.5 text-[#789b96]">Realizado</p>
        </div>
        <div className="rounded-lg border border-[#1F3A3A] p-2">
          <p className="text-sm font-extrabold text-[#e6c071]">
            {moeda.format(meta)}
          </p>
          <p className="mt-0.5 text-[#789b96]">Meta</p>
        </div>
        <div className="rounded-lg border border-[#1F3A3A] p-2">
          <p
            className={`text-sm font-extrabold ${superou ? "text-[#C8F34D]" : "text-[#ef8e78]"}`}
          >
            {moeda.format(diff)}
          </p>
          <p className="mt-0.5 text-[#789b96]">{superou ? "Superou" : "Faltam"}</p>
        </div>
      </div>
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────────

function Kpi({
  rotulo,
  valor,
  delta,
  deltaLabel,
  highlight,
}: {
  rotulo: string;
  valor: string;
  delta?: number | null;
  deltaLabel?: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-[#73d9cb]/35 bg-[#73d9cb]/8"
          : "border-[#1F3A3A] bg-[#0F2A2A]"
      }`}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
        {rotulo}
      </p>
      <strong className="mt-2 block text-xl font-extrabold leading-tight text-white">
        {valor}
      </strong>
      {delta !== undefined && delta !== null && (
        <p
          className={`mt-1.5 flex items-center gap-1 text-[11px] font-semibold ${
            delta > 0
              ? "text-[#73d9cb]"
              : delta < 0
                ? "text-[#ef8e78]"
                : "text-[#789b96]"
          }`}
        >
          <span>{delta > 0 ? "▲" : delta < 0 ? "▼" : "—"}</span>
          <span>
            {Math.abs(delta).toFixed(1)}% {deltaLabel}
          </span>
        </p>
      )}
    </article>
  );
}

// ── Barra vendedor ─────────────────────────────────────────────────────────────

function BarraVendedor({
  vendedor,
  realizado,
  meta,
  pct,
  qtd,
}: {
  vendedor: string;
  realizado: number;
  meta: number;
  pct: number | null;
  qtd: number;
}) {
  const p = Math.min(pct ?? 0, 100);
  const cor =
    p >= 100
      ? "#C8F34D"
      : p >= 80
        ? "#73d9cb"
        : p >= 50
          ? "#e6c071"
          : "#ef8e78";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-white">{vendedor}</span>
        <span className="text-[#789b96]">
          {moeda.format(realizado)}{" "}
          {meta > 0 && (
            <span className="text-[#3a5a5a]">/ {moeda.format(meta)}</span>
          )}
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-[#1F3A3A]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${p}%`, backgroundColor: cor }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[#789b96]">
        <span style={{ color: cor }}>
          {pct !== null ? `${pct}% da meta` : "sem meta cadastrada"}
        </span>
        <span>{inteiro.format(qtd)} atendimentos</span>
      </div>
    </div>
  );
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Analytics {
  faturamentoMes: number;
  faturamentoMesAnoAnterior: number;
  variacaoAnual: number | null;
  ticketMedio: number;
  qtdVendas: number;
  qtdHoje: number;
  vendasHoje: number;
  vendasOntem: number;
  variacaoHoje: number | null;
  vendasSemana: number;
  vendasSemanaPassada: number;
  variacaoSemana: number | null;
  metaMensal: number;
  pctMeta: number;
  tendencia90Dias: { data: string; atual: number; anterior: number }[];
  faturamentoDiaSemana: { dia: string; valor: number; qtd: number }[];
  rankingClientes: {
    cliente: string;
    valor: number;
    qtd: number;
    diasSemVenda: number;
  }[];
  desempenhoVendedores: {
    vendedor: string;
    realizado: number;
    meta: number;
    pct: number | null;
    qtd: number;
  }[];
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function VendasPage() {
  const [dados, setDados] = useState<Analytics | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/vendas/analytics")
      .then((r) => r.json())
      .then((d: Analytics & { erro?: string }) => {
        if (d.erro) setErro(d.erro);
        else setDados(d);
      })
      .catch(() => setErro("Erro ao conectar com o servidor"))
      .finally(() => setCarregando(false));
  }, []);

  const maxDia = dados
    ? Math.max(...dados.faturamentoDiaSemana.map((d) => d.valor), 1)
    : 1;
  const maxCliente =
    dados && dados.rankingClientes.length > 0
      ? dados.rankingClientes[0].valor
      : 1;

  return (
    <DashboardLayout
      titulo="Inteligência Comercial"
      descricao="Análise estratégica de vendas · últimos 90 dias e mês atual"
    >
      {carregando && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl border border-[#1F3A3A] bg-[#0F2A2A]"
            />
          ))}
        </div>
      )}

      {erro && (
        <div className="rounded-lg border border-[#ef8e78]/30 bg-[#ef8e78]/10 p-4 text-sm text-[#ef8e78]">
          {erro}
        </div>
      )}

      {dados && (
        <div className="space-y-4">
          {/* ── KPI strip ─────────────────────────────────────────────────── */}
          <section className="grid grid-cols-2 gap-2 xl:grid-cols-6">
            <Kpi
              rotulo="Faturamento do mês"
              valor={moeda.format(dados.faturamentoMes)}
              delta={dados.variacaoAnual}
              deltaLabel="vs mesmo mês do ano anterior"
              highlight
            />
            <Kpi
              rotulo="Ticket médio"
              valor={moedaDec.format(dados.ticketMedio)}
            />
            <Kpi
              rotulo="Atendimentos no mês"
              valor={inteiro.format(dados.qtdVendas)}
            />
            <Kpi
              rotulo="Faturamento hoje"
              valor={moeda.format(dados.vendasHoje)}
              delta={dados.variacaoHoje}
              deltaLabel="vs ontem"
            />
            <Kpi
              rotulo="Esta semana"
              valor={moeda.format(dados.vendasSemana)}
              delta={dados.variacaoSemana}
              deltaLabel="vs semana passada"
            />
            <Kpi
              rotulo="Atendimentos hoje"
              valor={inteiro.format(dados.qtdHoje)}
            />
          </section>

          {/* ── Velocímetro + Dia da semana ───────────────────────────────── */}
          <section className="grid gap-3 lg:grid-cols-5">
            {/* Gauge */}
            <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-5 lg:col-span-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
                Velocímetro da Meta Mensal
              </p>
              <div className="mt-4">
                <GaugeMeta
                  pct={dados.pctMeta}
                  realizado={dados.faturamentoMes}
                  meta={dados.metaMensal}
                />
              </div>
            </div>

            {/* Faturamento por dia da semana */}
            <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-5 lg:col-span-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
                Faturamento por dia da semana
              </p>
              <p className="mb-4 mt-0.5 text-[11px] text-[#789b96]">
                Acumulado dos últimos 90 dias
              </p>
              <div className="space-y-2.5">
                {dados.faturamentoDiaSemana.map(({ dia, valor, qtd }) => {
                  const isMelhor = valor === maxDia;
                  return (
                    <div key={dia} className="flex items-center gap-3">
                      <span className="w-7 flex-shrink-0 text-right text-[11px] font-bold text-[#b3ceca]">
                        {dia}
                      </span>
                      <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-[#1F3A3A]">
                        <div
                          className="h-full rounded-md transition-all duration-700"
                          style={{
                            width: `${Math.max((valor / maxDia) * 100, 2)}%`,
                            backgroundColor: isMelhor ? "#C8F34D" : "#73d9cb",
                            opacity: isMelhor ? 1 : 0.7,
                          }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-[#0A1F1F]">
                          {isMelhor && "★ "}
                          {moeda.format(valor)}
                        </span>
                      </div>
                      <span className="w-16 flex-shrink-0 text-right text-[10px] text-[#789b96]">
                        {inteiro.format(qtd)} atend.
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ── Tendência 90 dias vs ano anterior ─────────────────────────── */}
          <section className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
              Evolução · últimos 90 dias
            </p>
            <p className="mb-4 mt-0.5 text-[11px] text-[#789b96]">
              Teal = período atual · Pontilhado amber = mesmo período do ano
              anterior
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={dados.tendencia90Dias}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="gradAtual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#73d9cb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#73d9cb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="gradAnterior"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#e6c071" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#e6c071" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F3A3A" />
                <XAxis
                  dataKey="data"
                  stroke="#789b96"
                  fontSize={10}
                  tick={{ fill: "#789b96" }}
                  tickLine={false}
                  interval={14}
                />
                <YAxis
                  stroke="#789b96"
                  fontSize={10}
                  tick={{ fill: "#789b96" }}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "#0F2A2A",
                    border: "1px solid #1F3A3A",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value: unknown, name: unknown) => [
                    moedaDec.format(Number(value)),
                    String(name) === "atual" ? "Período atual" : "Ano anterior",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="anterior"
                  stroke="#e6c071"
                  strokeWidth={1.5}
                  fill="url(#gradAnterior)"
                  strokeDasharray="4 2"
                  dot={false}
                  name="anterior"
                />
                <Area
                  type="monotone"
                  dataKey="atual"
                  stroke="#73d9cb"
                  strokeWidth={2.5}
                  fill="url(#gradAtual)"
                  dot={false}
                  name="atual"
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* ── Ranking clientes + Desempenho vendedores ──────────────────── */}
          <section className="grid gap-3 lg:grid-cols-2">
            {/* Ranking Clientes */}
            <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
                Ranking de Clientes
              </p>
              <p className="mb-4 mt-0.5 text-[11px] text-[#789b96]">
                Top 10 por faturamento · últimos 90 dias
              </p>
              <div className="space-y-3">
                {dados.rankingClientes.map(
                  ({ cliente, valor, qtd, diasSemVenda }, i) => (
                    <div key={cliente} className="flex items-center gap-3">
                      <span className="w-5 flex-shrink-0 text-center text-[11px] font-extrabold text-[#3a5a5a]">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-semibold text-white">
                            {cliente}
                          </span>
                          <div className="flex flex-shrink-0 items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                diasSemVenda === 0
                                  ? "bg-[#73d9cb]/20 text-[#73d9cb]"
                                  : diasSemVenda <= 7
                                    ? "bg-[#73d9cb]/10 text-[#73d9cb]"
                                    : diasSemVenda <= 30
                                      ? "bg-[#e6c071]/15 text-[#e6c071]"
                                      : "bg-[#ef8e78]/15 text-[#ef8e78]"
                              }`}
                            >
                              {diasSemVenda === 0
                                ? "hoje"
                                : `${diasSemVenda}d sem compra`}
                            </span>
                            <span className="text-[11px] font-extrabold text-white">
                              {moeda.format(valor)}
                            </span>
                          </div>
                        </div>
                        <div className="relative h-1 overflow-hidden rounded-full bg-[#1F3A3A]">
                          <div
                            className="h-full rounded-full bg-[#73d9cb]/60"
                            style={{
                              width: `${(valor / maxCliente) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="mt-0.5 text-[10px] text-[#789b96]">
                          {inteiro.format(qtd)} compras no período
                        </p>
                      </div>
                    </div>
                  )
                )}
                {dados.rankingClientes.length === 0 && (
                  <p className="py-4 text-center text-[11px] text-[#789b96]">
                    Sem clientes identificados nos dados importados
                  </p>
                )}
              </div>
            </div>

            {/* Desempenho Vendedores */}
            <div className="rounded-xl border border-[#1F3A3A] bg-[#0F2A2A] p-5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#789b96]">
                Desempenho dos Vendedores
              </p>
              <p className="mb-5 mt-0.5 text-[11px] text-[#789b96]">
                Realizado vs meta · mês atual
              </p>
              <div className="space-y-5">
                {dados.desempenhoVendedores.map((v) => (
                  <BarraVendedor key={v.vendedor} {...v} />
                ))}
                {dados.desempenhoVendedores.length === 0 && (
                  <p className="py-4 text-center text-[11px] text-[#789b96]">
                    Sem dados no mês atual
                  </p>
                )}
              </div>

              {/* Legenda de cores */}
              <div className="mt-6 flex flex-wrap gap-3 border-t border-[#1F3A3A] pt-4">
                {[
                  { cor: "#C8F34D", label: "≥ 100% meta" },
                  { cor: "#73d9cb", label: "80–99%" },
                  { cor: "#e6c071", label: "50–79%" },
                  { cor: "#ef8e78", label: "< 50%" },
                ].map(({ cor, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 text-[10px] text-[#789b96]"
                  >
                    <span
                      className="inline-block h-2 w-4 rounded-full"
                      style={{ backgroundColor: cor }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
