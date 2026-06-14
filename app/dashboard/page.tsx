"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { EstoqueDashboard } from "@/components/bi/EstoqueDashboard";
import {
  dashboardModules,
  getDashboardModule,
  type DashboardModuleId,
} from "@/lib/dashboardModules";

interface Usuario {
  nome: string;
  empresa?: {
    nome?: string;
    tipo?: string;
  };
}

interface KPIs {
  faturamentoMes: number;
  vendasDia: number;
  quantidadeVendasMes: number;
  ticketMedioMes: number;
  metaMensal: number;
  percentualMetaBatida: number;
  faltaVender: number;
  vendaDiariaAteFinsMes: number;
  melhorVendedorMes: { vendedor: string; valor: number } | null;
  vendedoresAbaixoMeta: Array<{
    vendedor: string;
    meta: number;
    realizado: number;
    percentual: number;
  }>;
}

interface Graficos {
  vendasPorDia: Array<{ data: string; valor: number }> | null;
  top10Produtos: Array<{ produto: string; valor: number }> | null;
  vendasPorVendedor: Array<{ vendedor: string; valor: number }> | null;
  vendasPorFormaPagamento: Array<{ forma: string; valor: number }> | null;
  vendasPorCategoria: Array<{ categoria: string; valor: number }> | null;
}

type DashboardData = {
  kpis: KPIs;
  graficos: Graficos;
};

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const inteiro = new Intl.NumberFormat("pt-BR");
const cores = ["#73d9cb", "#e6c071", "#8bb8ff", "#ef8e78", "#a78bfa"];
const MODULOS_COM_API = ["produtos", "estoque", "pagar", "receber"] as const;

const subscribeStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getUsuarioStorage = () => localStorage.getItem("usuario") || "";

function Kpi({
  rotulo,
  valor,
  contexto,
  alerta,
}: {
  rotulo: string;
  valor: string;
  contexto: string;
  alerta?: boolean;
}) {
  return (
    <article className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] px-3 py-3 shadow-[var(--shadow-panel)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
          {rotulo}
        </p>
        <span
          className={`mt-0.5 h-2 w-2 rounded-full ${
            alerta ? "bg-[#ef8e78]" : "bg-[#73d9cb]"
          }`}
        />
      </div>
      <strong className="mt-1 block truncate text-xl tracking-tight">{valor}</strong>
      <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">
        {contexto}
      </p>
    </article>
  );
}

function Painel({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
      <header className="border-b border-[var(--border-col)] px-4 py-3">
        <h2 className="text-sm font-extrabold">{titulo}</h2>
        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
          {descricao}
        </p>
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

type DadosProdutos = { skusAtivos: number; semClassificacao: number; markupMedio: number; margemPotencial: number; coberturaGrade: number; cadastrosRecentes: number };
type DadosEstoque = { valorEstoque: number; unidades: number; rupturas: number; rupturasPct: number; excesso: number; totalPosicoes: number; dataRef: string };
type DadosPagar = { saldoPagar: number; vencido: number; vencidoPct: number; aVencer30: number; totalTitulos: number; titulosVencidos: number; maiorFornecedor: { nome: string; valor: number } | null };
type DadosReceber = { saldoReceber: number; vencido: number; inadimplenciaPct: number; aVencer30: number; totalTitulos: number; titulosVencidos: number; maiorCliente: { nome: string; valor: number } | null; totalRecebido: number };

function KpisModulo({ id, dados }: { id: string; dados: Record<string, unknown> }) {
  if (id === "produtos") {
    const d = dados as DadosProdutos;
    return (
      <>
        <Kpi rotulo="SKUs ativos" valor={inteiro.format(d.skusAtivos)} contexto="produtos no catálogo" />
        <Kpi rotulo="Sem classificação" valor={inteiro.format(d.semClassificacao)} contexto="sem marca ou grupo" alerta={d.semClassificacao > 0} />
        <Kpi rotulo="Markup médio" valor={`${d.markupMedio.toFixed(1)}%`} contexto="sobre o custo cadastrado" />
        <Kpi rotulo="Margem potencial" valor={moeda.format(d.margemPotencial)} contexto="venda − custo do catálogo" />
        <Kpi rotulo="Cobertura de grade" valor={`${d.coberturaGrade}%`} contexto="produtos com cor e tamanho" />
        <Kpi rotulo="Cadastros recentes" valor={inteiro.format(d.cadastrosRecentes)} contexto="últimos 30 dias" />
      </>
    );
  }
  if (id === "estoque") {
    const d = dados as DadosEstoque;
    return (
      <>
        <Kpi rotulo="Valor em estoque" valor={moeda.format(d.valorEstoque)} contexto={`posição de ${d.dataRef ? new Date(d.dataRef).toLocaleDateString("pt-BR") : "—"}`} />
        <Kpi rotulo="Unidades disponíveis" valor={inteiro.format(d.unidades)} contexto={`em ${d.totalPosicoes} posições`} />
        <Kpi rotulo="Rupturas" valor={inteiro.format(d.rupturas)} contexto={`${d.rupturasPct}% das posições zeradas`} alerta={d.rupturas > 0} />
        <Kpi rotulo="Excesso de estoque" valor={inteiro.format(d.excesso)} contexto="posições acima de 30 unidades" alerta={d.excesso > 0} />
      </>
    );
  }
  if (id === "pagar") {
    const d = dados as DadosPagar;
    return (
      <>
        <Kpi rotulo="Saldo a pagar" valor={moeda.format(d.saldoPagar)} contexto={`${d.totalTitulos} títulos em aberto`} />
        <Kpi rotulo="Vencido" valor={moeda.format(d.vencido)} contexto={`${d.vencidoPct}% do saldo em atraso`} alerta={d.vencido > 0} />
        <Kpi rotulo="A vencer em 30 dias" valor={moeda.format(d.aVencer30)} contexto="pressão financeira próxima" />
        <Kpi rotulo="Títulos vencidos" valor={inteiro.format(d.titulosVencidos)} contexto="requerem atenção imediata" alerta={d.titulosVencidos > 0} />
        <Kpi rotulo="Maior fornecedor" valor={d.maiorFornecedor?.nome ?? "—"} contexto={d.maiorFornecedor ? moeda.format(d.maiorFornecedor.valor) : "sem dados"} />
      </>
    );
  }
  if (id === "receber") {
    const d = dados as DadosReceber;
    return (
      <>
        <Kpi rotulo="Saldo a receber" valor={moeda.format(d.saldoReceber)} contexto={`${d.totalTitulos} títulos em aberto`} />
        <Kpi rotulo="Vencido" valor={moeda.format(d.vencido)} contexto={`inadimplência ${d.inadimplenciaPct}%`} alerta={d.vencido > 0} />
        <Kpi rotulo="A vencer em 30 dias" valor={moeda.format(d.aVencer30)} contexto="entradas esperadas" />
        <Kpi rotulo="Títulos vencidos" valor={inteiro.format(d.titulosVencidos)} contexto="em atraso para recebimento" alerta={d.titulosVencidos > 0} />
        <Kpi rotulo="Maior cliente" valor={d.maiorCliente?.nome ?? "—"} contexto={d.maiorCliente ? moeda.format(d.maiorCliente.valor) : "sem dados"} />
        <Kpi rotulo="Total recebido" valor={moeda.format(d.totalRecebido)} contexto="títulos baixados no período" />
      </>
    );
  }
  return null;
}

interface ClienteConectado {
  clienteAgenciaId: string;
  empresaId: string;
  nome: string;
  nomeEmpresa: string;
}

export default function DashboardPage() {
  const usuarioStorage = useSyncExternalStore(
    subscribeStorage,
    getUsuarioStorage,
    () => ""
  );
  const usuario = useMemo<Usuario | null>(() => {
    try {
      return JSON.parse(usuarioStorage || "null");
    } catch {
      return null;
    }
  }, [usuarioStorage]);
  const [moduloAtivo, setModuloAtivo] = useState<"resumo" | DashboardModuleId>(
    "resumo"
  );
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [dadosModulo, setDadosModulo] = useState<Record<string, unknown> | null>(null);
  const [carregandoModulo, setCarregandoModulo] = useState(false);
  const [clientesSelecionaveis, setClientesSelecionaveis] = useState<ClienteConectado[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteConectado | null>(null);

  const agencia = usuario?.empresa?.tipo === "AGENCIA";

  // Para agências: carrega lista de clientes conectados
  useEffect(() => {
    if (!agencia) return;
    fetch("/api/agencia/clientes")
      .then((r) => r.json())
      .then((lista: ClienteConectado[]) => {
        setClientesSelecionaveis(lista);
        if (lista.length === 1) setClienteSelecionado(lista[0]);
      })
      .catch(() => setClientesSelecionaveis([]));
  }, [agencia]);

  const empresaIdEfetivo = agencia ? clienteSelecionado?.empresaId : undefined;

  useEffect(() => {
    async function carregar() {
      if (agencia && !empresaIdEfetivo) {
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro("");
      try {
        const url = empresaIdEfetivo
          ? `/api/dashboard?empresaId=${empresaIdEfetivo}`
          : "/api/dashboard";
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) {
          setErro(data.erro || "Não foi possível carregar os dados de vendas");
          setDados(null);
          return;
        }
        setDados(data);
      } catch {
        setErro("Não foi possível conectar aos dados do dashboard");
      } finally {
        setCarregando(false);
      }
    }

    void carregar();
  }, [agencia, empresaIdEfetivo]);

  useEffect(() => {
    if (!MODULOS_COM_API.includes(moduloAtivo as never)) {
      return;
    }
    if (agencia && !empresaIdEfetivo) {
      return;
    }
    const carregar = async () => {
      setCarregandoModulo(true);
      const url = empresaIdEfetivo
        ? `/api/dashboard/modulos/${moduloAtivo}?empresaId=${empresaIdEfetivo}`
        : `/api/dashboard/modulos/${moduloAtivo}`;
      try {
        const resposta = await fetch(url);
        setDadosModulo(await resposta.json());
      } catch {
        setDadosModulo(null);
      } finally {
        setCarregandoModulo(false);
      }
    };
    void Promise.resolve().then(carregar);
  }, [moduloAtivo, agencia, empresaIdEfetivo]);
  const modulo = useMemo(
    () => (moduloAtivo === "resumo" ? null : getDashboardModule(moduloAtivo)),
    [moduloAtivo]
  );

  return (
    <DashboardLayout
      titulo={agencia ? "Inteligência dos Clientes" : "Central de Inteligência"}
      descricao={
        agencia
          ? "Indicadores comerciais dos clientes conectados, conforme autorização"
          : "Visão executiva organizada por domínio de negócio, independente do ERP"
      }
    >
      <div className="space-y-3">
        <section className="flex flex-col gap-3 rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] p-3 shadow-[var(--shadow-panel)] lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-[#73d9cb]/25 bg-[#73d9cb]/10 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-[var(--accent)]">
                Modelo canônico Headstock
              </span>
              <span className="rounded border border-[var(--border-col)] bg-[var(--bg-panel-soft)] px-2 py-1 text-[9px] font-bold text-[var(--text-secondary)]">
                Conectores configuráveis por empresa
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-xs text-[var(--text-secondary)]">
              {agencia
                ? "A agência não possui estoque ou contas comerciais próprias neste painel. Cada módulo é aberto no contexto de um cliente e somente nos escopos autorizados."
                : "Os módulos abaixo permanecem iguais para TOTVS, outros ERPs, planilhas ou entrada manual. Apenas o conector e o mapeamento de origem mudam."}
            </p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
              {agencia ? "Cliente visualizado" : "Contexto atual"}
            </p>
            {agencia ? (
              <select
                value={clienteSelecionado?.empresaId ?? ""}
                onChange={(e) => {
                  const found = clientesSelecionaveis.find((c) => c.empresaId === e.target.value) ?? null;
                  setClienteSelecionado(found);
                  setDados(null);
                  setDadosModulo(null);
                }}
                className="mt-1 w-full rounded border border-[var(--border-col)] bg-[var(--bg-panel)] px-2 py-1.5 text-sm font-extrabold text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#73d9cb] lg:w-auto"
              >
                <option value="">Selecionar cliente…</option>
                {clientesSelecionaveis.map((c) => (
                  <option key={c.empresaId} value={c.empresaId ?? ""}>
                    {c.nomeEmpresa}
                  </option>
                ))}
              </select>
            ) : (
              <p className="mt-1 text-sm font-extrabold">
                {usuario?.empresa?.nome || "Empresa"}
              </p>
            )}
          </div>
        </section>

        <nav className="flex gap-1 overflow-x-auto rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] p-1">
          <button
            type="button"
            onClick={() => setModuloAtivo("resumo")}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition ${
              moduloAtivo === "resumo"
                ? "bg-[#73d9cb]/15 text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-soft)]"
            }`}
          >
            Resumo
          </button>
          {dashboardModules.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setModuloAtivo(item.id)}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold transition ${
                moduloAtivo === item.id
                  ? "bg-[#73d9cb]/15 text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-panel-soft)]"
              }`}
            >
              {item.tituloCurto}
            </button>
          ))}
        </nav>

        {moduloAtivo === "resumo" && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dashboardModules.map((item) => {
              const conectado =
                !agencia && item.id === "vendas" && Boolean(dados);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setModuloAtivo(item.id)}
                  className="group text-left"
                >
                  <article className="h-full rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] p-4 shadow-[var(--shadow-panel)] transition hover:border-[#73d9cb]/45 hover:bg-[var(--bg-panel-soft)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--accent)]">
                          {item.consultaTotvs}
                        </p>
                        <h2 className="mt-1 text-base font-extrabold">{item.titulo}</h2>
                      </div>
                      <span
                        className={`rounded border px-2 py-1 text-[9px] font-extrabold ${
                          conectado
                            ? "border-[#73d9cb]/25 bg-[#73d9cb]/10 text-[var(--accent)]"
                            : "border-[#e6c071]/25 bg-[#e6c071]/10 text-[#c79535] dark:text-[#e6c071]"
                        }`}
                      >
                        {conectado ? "COM DADOS" : "MAPEADO"}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {item.descricao}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {item.kpis.slice(0, 4).map((kpi) => (
                        <span
                          key={kpi}
                          className="rounded bg-[var(--bg-panel-soft)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]"
                        >
                          {kpi}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] font-bold text-[var(--accent)]">
                      Abrir submódulo →
                    </p>
                  </article>
                </button>
              );
            })}
          </div>
        )}

        {moduloAtivo === "vendas" && (
          <>
            {agencia && (
              <section className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] p-6 text-center shadow-[var(--shadow-panel)]">
                <span className="rounded border border-[#73d9cb]/25 bg-[#73d9cb]/10 px-2 py-1 text-[9px] font-extrabold text-[var(--accent)]">
                  CONTEXTO OBRIGATÓRIO
                </span>
                <h2 className="mt-3 text-lg font-extrabold">
                  Selecione um cliente conectado
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-xs leading-5 text-[var(--text-secondary)]">
                  As vendas pertencem à empresa cliente. O Headstock só carregará
                  este submódulo quando houver relacionamento ativo e permissão
                  para o escopo comercial.
                </p>
              </section>
            )}
            {!agencia && erro && (
              <div className="rounded-lg border border-[#ef8e78]/30 bg-[#ef8e78]/10 p-3 text-sm text-[#ef8e78]">
                {erro}
              </div>
            )}
            {!agencia && carregando && (
              <div className="h-28 animate-pulse rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)]" />
            )}
            {!agencia && dados && (
              <div className="space-y-3">
                <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  <Kpi
                    rotulo="Faturamento do mês"
                    valor={moeda.format(dados.kpis.faturamentoMes)}
                    contexto={`${dados.kpis.percentualMetaBatida.toFixed(1)}% da meta mensal`}
                  />
                  <Kpi
                    rotulo="Vendas hoje"
                    valor={moeda.format(dados.kpis.vendasDia)}
                    contexto="movimento do dia atual"
                  />
                  <Kpi
                    rotulo="Quantidade de vendas"
                    valor={inteiro.format(dados.kpis.quantidadeVendasMes)}
                    contexto="transações no mês"
                  />
                  <Kpi
                    rotulo="Ticket médio"
                    valor={moeda.format(dados.kpis.ticketMedioMes)}
                    contexto="valor médio por venda"
                  />
                </section>

                <section className="grid gap-3 lg:grid-cols-2">
                  <Painel
                    titulo="Evolução diária"
                    descricao="Faturamento ao longo do período para leitura de tendência"
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={dados.graficos.vendasPorDia || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-col)" />
                        <XAxis dataKey="data" stroke="#789b96" fontSize={10} />
                        <YAxis stroke="#789b96" fontSize={10} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="valor"
                          stroke="#73d9cb"
                          strokeWidth={2.5}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Painel>

                  <Painel
                    titulo="Produtos líderes"
                    descricao="Produtos com maior contribuição para o faturamento"
                  >
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={dados.graficos.top10Produtos || []} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-col)" />
                        <XAxis type="number" stroke="#789b96" fontSize={10} />
                        <YAxis
                          type="category"
                          dataKey="produto"
                          width={110}
                          stroke="#789b96"
                          fontSize={10}
                        />
                        <Tooltip />
                        <Bar dataKey="valor" fill="#e6c071" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Painel>

                  <Painel
                    titulo="Desempenho por vendedor"
                    descricao="Comparação de receita entre vendedores"
                  >
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dados.graficos.vendasPorVendedor || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-col)" />
                        <XAxis dataKey="vendedor" stroke="#789b96" fontSize={10} />
                        <YAxis stroke="#789b96" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="valor" fill="#73d9cb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Painel>

                  <Painel
                    titulo="Formas de pagamento"
                    descricao="Participação financeira por modalidade"
                  >
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={dados.graficos.vendasPorFormaPagamento || []}
                          dataKey="valor"
                          nameKey="forma"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={2}
                        >
                          {(dados.graficos.vendasPorFormaPagamento || []).map(
                            (_, index) => (
                              <Cell
                                key={index}
                                fill={cores[index % cores.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Painel>
                </section>
              </div>
            )}
          </>
        )}

        {modulo && modulo.id !== "vendas" && (
          <div className="space-y-3">
            <section className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] p-4 shadow-[var(--shadow-panel)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[var(--accent)]">
                    {modulo.consultaTotvs} → {modulo.dominioCanonico}
                  </p>
                  <h2 className="mt-1 text-lg font-extrabold">{modulo.titulo}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--text-secondary)]">
                    {modulo.descricao}
                  </p>
                </div>
                <span className={`w-fit rounded border px-2 py-1 text-[9px] font-extrabold ${
                  dadosModulo && (dadosModulo as Record<string,unknown>).temDados
                    ? "border-[#73d9cb]/25 bg-[#73d9cb]/10 text-[var(--accent)]"
                    : "border-[#e6c071]/25 bg-[#e6c071]/10 text-[#c79535] dark:text-[#e6c071]"
                }`}>
                  {dadosModulo && (dadosModulo as Record<string,unknown>).temDados ? "COM DADOS" : "AGUARDANDO INGESTÃO"}
                </span>
              </div>
              {agencia && (
                <p className="mt-3 border-l-2 border-[var(--accent)] pl-3 text-[11px] text-[var(--text-secondary)]">
                  <strong className="text-[var(--accent)]">Uso pela agência: </strong>
                  {modulo.usoAgencia}
                </p>
              )}
            </section>

            {carregandoModulo && (
              <div className="h-24 animate-pulse rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)]" />
            )}

            {!carregandoModulo &&
              modulo.id === "estoque" &&
              dadosModulo &&
              !!(dadosModulo as Record<string, unknown>).temDados && (
                <EstoqueDashboard dados={dadosModulo as unknown as Parameters<typeof EstoqueDashboard>[0]["dados"]} />
              )}

            {!carregandoModulo &&
              modulo.id !== "estoque" &&
              dadosModulo &&
              !!(dadosModulo as Record<string, unknown>).temDados && (
              <section className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                <KpisModulo id={modulo.id} dados={dadosModulo} />
              </section>
            )}

            {!carregandoModulo && (!dadosModulo || !(dadosModulo as Record<string,unknown>).temDados) && (
              <section className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                {modulo.kpis.map((kpi) => (
                  <Kpi key={kpi} rotulo={kpi} valor="—" contexto="Faça upload da planilha para ver os dados" />
                ))}
              </section>
            )}


            <section className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
                Filtros previstos
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {modulo.filtros.map((filtro) => (
                  <span
                    key={filtro}
                    className="rounded border border-[var(--border-col)] bg-[var(--bg-panel-soft)] px-2 py-1 text-[10px] font-semibold"
                  >
                    {filtro}
                  </span>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
