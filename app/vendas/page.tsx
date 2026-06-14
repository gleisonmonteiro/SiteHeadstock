"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const moedaDecimal = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const inteiro = new Intl.NumberFormat("pt-BR");

type LinhaAnalitica = {
  nome: string;
  valor: number;
  quantidade: number;
  transacoes: number;
  ticketMedio: number;
  precoMedio: number;
  clientes: number;
  custo: number;
  custoPct: number;
};

type ProdutoABC = LinhaAnalitica & {
  participacao: number;
  classe: "A" | "B" | "C";
};

type Vendedor = LinhaAnalitica & {
  meta: number;
  percentualMeta: number | null;
};

type Analytics = {
  periodo: string;
  atualizadoEm: string;
  resumo: {
    faturamento: number;
    faturamentoAnterior: number;
    variacaoFaturamento: number | null;
    quantidade: number;
    quantidadeAnterior: number;
    variacaoQuantidade: number | null;
    transacoes: number;
    clientes: number;
    ticketMedio: number;
    precoMedio: number;
    custo: number;
    custoPct: number;
    metaMensal: number;
    faturamentoMes: number;
    percentualMeta: number;
  };
  porLoja: LinhaAnalitica[];
  porMarca: LinhaAnalitica[];
  porCategoria: LinhaAnalitica[];
  produtosABC: ProdutoABC[];
  porVendedor: Vendedor[];
  porCliente: LinhaAnalitica[];
  historicoMensal: Array<{ mes: string; valor: number; quantidade: number; clientes: number }>;
  historicoDiario: Array<{ data: string; valor: number }>;
};

type Aba = "geral" | "filiais" | "vendedores" | "clientes" | "produtos";

function MetaGauge({ percentual }: { percentual: number }) {
  const valor = Math.min(Math.max(percentual, 0), 100);
  const graus = -90 + valor * 1.8;
  const cor =
    percentual >= 100
      ? "#C8F34D"
      : percentual >= 80
        ? "#73d9cb"
        : percentual >= 50
          ? "#e6c071"
          : "#ef8e78";

  return (
    <div className="relative mx-auto h-36 w-64 overflow-hidden">
      <div className="absolute left-5 top-5 h-52 w-52 rounded-full border-[20px] border-[var(--bg-panel-soft)]" />
      <div
        className="absolute left-1/2 top-[116px] h-1.5 w-[86px] origin-left rounded-full"
        style={{ backgroundColor: cor, transform: `rotate(${graus}deg)` }}
      />
      <div className="absolute left-[122px] top-[111px] h-4 w-4 rounded-full bg-[var(--text-primary)]" />
      <div className="absolute inset-x-0 top-16 text-center">
        <strong className="text-3xl font-black" style={{ color: cor }}>
          {percentual.toFixed(1)}%
        </strong>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          da meta mensal
        </p>
      </div>
    </div>
  );
}

function tabelaAnalitica(linhas: LinhaAnalitica[]) {
  return linhas.map((linha) => ({
    id: linha.nome,
    nome: <span className="font-bold text-[var(--text-primary)]">{linha.nome}</span>,
    valor: moedaDecimal.format(linha.valor),
    quantidade: inteiro.format(linha.quantidade),
    precoMedio: moedaDecimal.format(linha.precoMedio),
    ticketMedio: moedaDecimal.format(linha.ticketMedio),
    clientes: inteiro.format(linha.clientes),
    custo: moedaDecimal.format(linha.custo),
    custoPct: `${linha.custoPct.toFixed(1)}%`,
  }));
}

const colunasAnaliticas = [
  { key: "nome", label: "Descrição" },
  { key: "valor", label: "Valor", align: "right" as const },
  { key: "quantidade", label: "Qtde", align: "right" as const },
  { key: "precoMedio", label: "Preço médio", align: "right" as const },
  { key: "ticketMedio", label: "Ticket médio", align: "right" as const },
  { key: "clientes", label: "Clientes", align: "right" as const },
  { key: "custo", label: "Custo", align: "right" as const },
  { key: "custoPct", label: "% custo", align: "right" as const },
];

export default function VendasPage() {
  const [aba, setAba] = useState<Aba>("geral");
  const [periodo, setPeriodo] = useState("90");
  const [dados, setDados] = useState<Analytics | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const resposta = await fetch(`/api/vendas/analytics?periodo=${periodo}`);
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro ?? "Erro ao carregar vendas");
        if (ativo) setDados(resultado);
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Erro ao carregar vendas");
      } finally {
        if (ativo) setCarregando(false);
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, [periodo]);

  const resumo = dados?.resumo;
  const maxHistorico = useMemo(
    () => Math.max(...(dados?.historicoDiario.map((item) => item.valor) ?? [1]), 1),
    [dados],
  );

  return (
    <DashboardLayout
      titulo="Faturamento e Análise Comercial"
      descricao="Receita, filiais, vendedores, clientes, mix e curva ABC"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto">
            <BITabs
              value={aba}
              onChange={setAba}
              items={[
                { id: "geral", label: "Geral" },
                { id: "filiais", label: "Filiais e marcas" },
                { id: "vendedores", label: "Vendedores" },
                { id: "clientes", label: "Clientes" },
                { id: "produtos", label: "Produtos e ABC" },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)] p-1 shadow-[var(--shadow-panel)]">
            {[
              ["30", "30 dias"],
              ["90", "90 dias"],
              ["365", "12 meses"],
              ["all", "Todo histórico"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriodo(id)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
                  periodo === id
                    ? "bg-[#73d9cb]/16 text-[var(--accent)]"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {carregando && (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)]"
              />
            ))}
          </div>
        )}

        {erro && (
          <div className="rounded-xl border border-[#ef8e78]/35 bg-[#ef8e78]/10 p-4 text-sm text-[#ef8e78]">
            {erro}
          </div>
        )}

        {dados && resumo && !carregando && (
          <>
            <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <BIKpi
                label="Valor faturado"
                value={moeda.format(resumo.faturamento)}
                delta={resumo.variacaoFaturamento}
                detail="vs período anterior"
                tone="accent"
              />
              <BIKpi
                label="Quantidade"
                value={inteiro.format(resumo.quantidade)}
                delta={resumo.variacaoQuantidade}
                detail="peças vendidas"
              />
              <BIKpi
                label="Transações"
                value={inteiro.format(resumo.transacoes)}
                detail="documentos de venda"
              />
              <BIKpi
                label="Clientes"
                value={inteiro.format(resumo.clientes)}
                detail="clientes identificados"
              />
              <BIKpi
                label="Preço médio"
                value={moedaDecimal.format(resumo.precoMedio)}
                detail="valor por peça"
              />
              <BIKpi
                label="Ticket médio"
                value={moedaDecimal.format(resumo.ticketMedio)}
                detail={`${resumo.custoPct.toFixed(1)}% de custo informado`}
              />
            </section>

            {aba === "geral" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-[320px_1fr_1fr]">
                  <BISection title="Meta do mês" subtitle="Realizado no mês atual">
                    <MetaGauge percentual={resumo.percentualMeta} />
                    <div className="grid grid-cols-2 gap-2 border-t border-[var(--border-col)] pt-3 text-center">
                      <div>
                        <p className="text-[9px] font-bold uppercase text-[var(--text-secondary)]">
                          Realizado
                        </p>
                        <strong className="text-sm">{moeda.format(resumo.faturamentoMes)}</strong>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase text-[var(--text-secondary)]">
                          Meta
                        </p>
                        <strong className="text-sm">{moeda.format(resumo.metaMensal)}</strong>
                      </div>
                    </div>
                  </BISection>
                  <BISection title="Faturamento por filial" subtitle="Participação no período">
                    <BIBarList
                      items={dados.porLoja.map((item) => ({
                        label: item.nome,
                        value: item.valor,
                        detail: `${item.transacoes} vendas`,
                      }))}
                      formatValue={moeda.format}
                      color="#1478ff"
                    />
                  </BISection>
                  <BISection title="Faturamento por marca" subtitle="Marcas com maior receita">
                    <BIBarList
                      items={dados.porMarca.map((item) => ({
                        label: item.nome,
                        value: item.valor,
                        detail: `${inteiro.format(item.quantidade)} peças`,
                      }))}
                      formatValue={moeda.format}
                      color="#00a9a5"
                    />
                  </BISection>
                </section>

                <BISection title="Histórico de faturamento" subtitle="Série diária do período selecionado">
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={dados.historicoDiario}>
                      <defs>
                        <linearGradient id="vendasArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1478ff" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#1478ff" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-col)" />
                      <XAxis
                        dataKey="data"
                        tickFormatter={(valor) => String(valor).slice(5)}
                        tick={{ fontSize: 9, fill: "var(--text-secondary)" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, maxHistorico]}
                        tickFormatter={(valor) => `${Math.round(Number(valor) / 1000)}k`}
                        tick={{ fontSize: 9, fill: "var(--text-secondary)" }}
                      />
                      <Tooltip
                        formatter={(valor) => moedaDecimal.format(Number(valor))}
                        labelFormatter={(valor) =>
                          new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR")
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="valor"
                        stroke="#1478ff"
                        strokeWidth={2}
                        fill="url(#vendasArea)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </BISection>

                <BISection title="Resumo por filial" subtitle="Visão sintética de faturamento e eficiência">
                  <BIDataTable columns={colunasAnaliticas} rows={tabelaAnalitica(dados.porLoja)} />
                </BISection>
              </div>
            )}

            {aba === "filiais" && (
              <div className="space-y-3">
                <section className="grid gap-3 lg:grid-cols-3">
                  <BISection title="Filiais" subtitle="Ranking por faturamento">
                    <BIBarList
                      items={dados.porLoja.map((item) => ({ label: item.nome, value: item.valor }))}
                      formatValue={moeda.format}
                    />
                  </BISection>
                  <BISection title="Marcas" subtitle="Receita por marca">
                    <BIBarList
                      items={dados.porMarca.map((item) => ({ label: item.nome, value: item.valor }))}
                      formatValue={moeda.format}
                      color="#00a9a5"
                    />
                  </BISection>
                  <BISection title="Grupos" subtitle="Receita por categoria">
                    <BIBarList
                      items={dados.porCategoria.map((item) => ({
                        label: item.nome,
                        value: item.valor,
                      }))}
                      formatValue={moeda.format}
                      color="#7f68d9"
                    />
                  </BISection>
                </section>
                <BISection title="Tabela de faturamento por filial" subtitle="Valor, volume, preço, ticket, clientes e custo">
                  <BIDataTable columns={colunasAnaliticas} rows={tabelaAnalitica(dados.porLoja)} />
                </BISection>
              </div>
            )}

            {aba === "vendedores" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-[420px_1fr]">
                  <BISection title="Ranking de vendedores" subtitle="Faturamento no período">
                    <BIBarList
                      items={dados.porVendedor.map((item) => ({
                        label: item.nome,
                        value: item.valor,
                        detail:
                          item.percentualMeta === null
                            ? "sem meta mensal"
                            : `${item.percentualMeta.toFixed(1)}% da meta`,
                      }))}
                      formatValue={moeda.format}
                      limit={12}
                    />
                  </BISection>
                  <BISection title="Tabela por vendedor" subtitle="Desempenho comercial e meta do mês">
                    <BIDataTable
                      columns={[
                        { key: "nome", label: "Vendedor" },
                        { key: "valor", label: "Valor", align: "right" },
                        { key: "participacao", label: "% valor", align: "right" },
                        { key: "quantidade", label: "Qtde", align: "right" },
                        { key: "precoMedio", label: "Preço médio", align: "right" },
                        { key: "ticketMedio", label: "Ticket médio", align: "right" },
                        { key: "clientes", label: "Clientes", align: "right" },
                        { key: "meta", label: "Meta", align: "right" },
                      ]}
                      rows={dados.porVendedor.map((item) => ({
                        id: item.nome,
                        nome: <span className="font-bold">{item.nome}</span>,
                        valor: moedaDecimal.format(item.valor),
                        participacao: `${((item.valor / Math.max(resumo.faturamento, 1)) * 100).toFixed(1)}%`,
                        quantidade: inteiro.format(item.quantidade),
                        precoMedio: moedaDecimal.format(item.precoMedio),
                        ticketMedio: moedaDecimal.format(item.ticketMedio),
                        clientes: inteiro.format(item.clientes),
                        meta:
                          item.percentualMeta === null ? (
                            <BIBadge>Sem meta</BIBadge>
                          ) : (
                            <BIBadge
                              tone={
                                item.percentualMeta >= 100
                                  ? "success"
                                  : item.percentualMeta >= 80
                                    ? "accent"
                                    : item.percentualMeta >= 50
                                      ? "warning"
                                      : "danger"
                              }
                            >
                              {item.percentualMeta.toFixed(1)}%
                            </BIBadge>
                          ),
                      }))}
                    />
                  </BISection>
                </section>
              </div>
            )}

            {aba === "clientes" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-[430px_1fr]">
                  <BISection title="Maiores clientes" subtitle="Ranking por faturamento">
                    <BIBarList
                      items={dados.porCliente.map((item) => ({
                        label: item.nome,
                        value: item.valor,
                        detail: `${item.transacoes} compras`,
                      }))}
                      formatValue={moeda.format}
                      limit={14}
                      color="#00a9a5"
                    />
                  </BISection>
                  <BISection title="Tabela por cliente" subtitle="Receita, volume e comportamento de compra">
                    <BIDataTable columns={colunasAnaliticas} rows={tabelaAnalitica(dados.porCliente)} />
                  </BISection>
                </section>
                <BISection title="Histórico mensal" subtitle="Faturamento, quantidade e clientes ativos">
                  <BIDataTable
                    columns={[
                      { key: "mes", label: "Mês" },
                      { key: "valor", label: "Faturamento", align: "right" },
                      { key: "quantidade", label: "Quantidade", align: "right" },
                      { key: "clientes", label: "Clientes", align: "right" },
                    ]}
                    rows={dados.historicoMensal.map((item) => ({
                      id: item.mes,
                      mes: item.mes.split("-").reverse().join("/"),
                      valor: moedaDecimal.format(item.valor),
                      quantidade: inteiro.format(item.quantidade),
                      clientes: inteiro.format(item.clientes),
                    }))}
                  />
                </BISection>
              </div>
            )}

            {aba === "produtos" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-[430px_1fr]">
                  <BISection title="Grupos de produto" subtitle="Categorias com maior faturamento">
                    <BIBarList
                      items={dados.porCategoria.map((item) => ({
                        label: item.nome,
                        value: item.valor,
                      }))}
                      formatValue={moeda.format}
                      limit={14}
                      color="#7f68d9"
                    />
                  </BISection>
                  <BISection title="Curva ABC por produto" subtitle="Classificação por participação acumulada">
                    <BIDataTable
                      columns={[
                        { key: "classe", label: "ABC" },
                        { key: "produto", label: "Produto" },
                        { key: "valor", label: "Valor", align: "right" },
                        { key: "participacao", label: "% valor", align: "right" },
                        { key: "quantidade", label: "Qtde", align: "right" },
                        { key: "precoMedio", label: "Preço médio", align: "right" },
                        { key: "clientes", label: "Clientes", align: "right" },
                        { key: "custoPct", label: "% custo", align: "right" },
                      ]}
                      rows={dados.produtosABC.map((item) => ({
                        id: item.nome,
                        classe: (
                          <BIBadge
                            tone={
                              item.classe === "A"
                                ? "success"
                                : item.classe === "B"
                                  ? "warning"
                                  : "neutral"
                            }
                          >
                            {item.classe}
                          </BIBadge>
                        ),
                        produto: <span className="font-bold">{item.nome}</span>,
                        valor: moedaDecimal.format(item.valor),
                        participacao: `${item.participacao.toFixed(1)}%`,
                        quantidade: inteiro.format(item.quantidade),
                        precoMedio: moedaDecimal.format(item.precoMedio),
                        clientes: inteiro.format(item.clientes),
                        custoPct: `${item.custoPct.toFixed(1)}%`,
                      }))}
                    />
                  </BISection>
                </section>
              </div>
            )}

            <p className="text-right text-[9px] text-[var(--text-secondary)]">
              Dados atualizados em {new Date(dados.atualizadoEm).toLocaleString("pt-BR")}
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
