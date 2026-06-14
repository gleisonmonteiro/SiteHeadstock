"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/DashboardLayout";

type Severidade = "CRITICO" | "ATENCAO" | "INFO";

interface ResumoAgencia {
  periodo: {
    referencia: string;
    inicioMes: string;
    inicioSemana: string;
  };
  indicadores: {
    receitaContratada: number;
    ticketMedio: number;
    margemContribuicao: number | null;
    coberturaCustos: number;
    custoApontado: number;
    concentracaoMaiorCliente: number;
    clientesAtivos: number;
    projetosAtivos: number;
    projetosEmRisco: number;
    alertasCriticos: number;
    colaboradores: number;
    horasMes: number;
    horasContratadas: number;
    consumoContratos: number;
    horasSemana: number;
    capacidadeSemanal: number;
    ocupacaoSemanal: number;
    variacaoHorasSemana: number | null;
    faturabilidade: number;
    receitaPorHoraContratada: number;
  };
  carteira: Array<{
    id: string;
    nome: string;
    responsavel: string;
    contratoValor: number;
    participacaoReceita: number;
    horasContratadas: number;
    horasConsumidas: number;
    consumoContrato: number;
    projetosAtivos: number;
    riscos: number;
    statusEconomico: "SAUDAVEL" | "ATENCAO" | "ESTOURADO" | "SEM_FRANQUIA";
    conectado: boolean;
  }>;
  equipes: Array<{
    id: string;
    nome: string;
    gestor: string;
    pessoas: number;
    capacidade: number;
    horas: number;
    ocupacao: number;
    status: "SOBRECARGA" | "ATENCAO" | "NORMAL";
  }>;
  alertas: Array<{
    id: string;
    severidade: Severidade;
    categoria: "PROJETO" | "CONTRATO" | "EQUIPE" | "DADO";
    titulo: string;
    detalhe: string;
    acao: string;
  }>;
  proximasEntregas: Array<{
    id: string;
    nome: string;
    projeto: string;
    cliente: string;
    responsavel: string;
    data: string | null;
    progresso: number;
    saude: string;
  }>;
}

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function classeStatus(status: string) {
  if (["CRITICO", "ESTOURADO", "SOBRECARGA"].includes(status)) {
    return "border-[#ef8e78]/30 bg-[#ef8e78]/10 text-[#ef8e78]";
  }
  if (status === "ATENCAO") {
    return "border-[#e6c071]/30 bg-[#e6c071]/10 text-[#d9aa4f] dark:text-[#e6c071]";
  }
  if (status === "INFO") {
    return "border-sky-400/25 bg-sky-400/10 text-sky-600 dark:text-sky-300";
  }
  return "border-[#73d9cb]/25 bg-[#73d9cb]/10 text-[var(--accent)]";
}

function Barra({
  valor,
  status = "NORMAL",
}: {
  valor: number;
  status?: string;
}) {
  const cor =
    ["CRITICO", "ESTOURADO", "SOBRECARGA"].includes(status) || valor > 100
      ? "bg-[#ef8e78]"
      : status === "ATENCAO"
        ? "bg-[#e6c071]"
        : "bg-[#73d9cb]";

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/8">
      <div
        className={`h-full rounded-full ${cor}`}
        style={{ width: `${Math.min(valor, 100)}%` }}
      />
    </div>
  );
}

function Kpi({
  rotulo,
  valor,
  contexto,
  destaque,
}: {
  rotulo: string;
  valor: string;
  contexto: string;
  destaque?: "perigo" | "atencao";
}) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] px-3 py-3 shadow-[var(--shadow-panel)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.07em] text-[var(--text-secondary)]">
          {rotulo}
        </p>
        {destaque && (
          <span
            className={`mt-0.5 h-2 w-2 rounded-full ${
              destaque === "perigo" ? "bg-[#ef8e78]" : "bg-[#e6c071]"
            }`}
          />
        )}
      </div>
      <strong className="mt-1 block truncate text-xl tracking-tight text-[var(--text-primary)]">
        {valor}
      </strong>
      <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">
        {contexto}
      </p>
    </article>
  );
}

function isMasterUser() {
  try {
    const u = JSON.parse(localStorage.getItem("usuario") || "{}");
    return u.papel === "MASTER_PLATFORM" || u.papel === "MASTER_CONSULTANT";
  } catch { return false; }
}

export default function AgenciaPage() {
  const [resumo, setResumo] = useState<ResumoAgencia | null>(null);
  const [erro, setErro] = useState("");
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => { setIsMaster(isMasterUser()); }, []);

  useEffect(() => {
    async function carregar() {
      try {
        const response = await fetch("/api/agencia/resumo");
        const data = await response.json();
        if (!response.ok) {
          setErro(data.erro || "Não foi possível carregar a agência");
          return;
        }
        setResumo(data);
      } catch {
        setErro("Não foi possível conectar ao painel da agência");
      }
    }

    void carregar();
  }, []);

  return (
    <DashboardLayout
      titulo="Painel Executivo da Agência"
      descricao="Receita, rentabilidade, capacidade e riscos que exigem decisão"
    >
      {isMaster && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#73d9cb]/20 bg-[#73d9cb]/5 px-4 py-2.5">
          <Link
            href="/master"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#73d9cb] hover:underline"
          >
            ← Voltar ao Painel Master
          </Link>
          <span className="text-[11px] text-[#94A3B8]">— você está visualizando esta agência como administrador da plataforma</span>
        </div>
      )}
      {erro && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
          {erro}
        </div>
      )}

      {!resumo && !erro && (
        <div className="grid animate-pulse grid-cols-2 gap-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-24 rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)]"
            />
          ))}
        </div>
      )}

      {resumo && (
        <div className="space-y-3">
          <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <Kpi
              rotulo="Receita contratada"
              valor={moeda.format(resumo.indicadores.receitaContratada)}
              contexto={`${resumo.indicadores.clientesAtivos} clientes · ticket ${moeda.format(resumo.indicadores.ticketMedio)}`}
            />
            <Kpi
              rotulo="Margem de contribuição"
              valor={
                resumo.indicadores.margemContribuicao === null
                  ? "Configurar custos"
                  : `${resumo.indicadores.margemContribuicao}%`
              }
              contexto={
                resumo.indicadores.margemContribuicao === null
                  ? `${resumo.indicadores.coberturaCustos}% das horas com custo-hora`
                  : `${moeda.format(resumo.indicadores.custoApontado)} em custo direto apontado`
              }
              destaque={
                resumo.indicadores.margemContribuicao !== null &&
                resumo.indicadores.margemContribuicao < 30
                  ? "perigo"
                  : undefined
              }
            />
            <Kpi
              rotulo="Ocupação da semana"
              valor={`${resumo.indicadores.ocupacaoSemanal}%`}
              contexto={`${decimal.format(resumo.indicadores.horasSemana)}h de ${decimal.format(resumo.indicadores.capacidadeSemanal)}h disponíveis`}
              destaque={
                resumo.indicadores.ocupacaoSemanal > 100
                  ? "perigo"
                  : resumo.indicadores.ocupacaoSemanal >= 85
                    ? "atencao"
                    : undefined
              }
            />
            <Kpi
              rotulo="Decisões críticas"
              valor={String(resumo.indicadores.alertasCriticos)}
              contexto={`${resumo.indicadores.projetosEmRisco} de ${resumo.indicadores.projetosAtivos} projetos em risco`}
              destaque={
                resumo.indicadores.alertasCriticos > 0 ? "perigo" : undefined
              }
            />
          </section>

          <section className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border-col)] px-4 py-3">
                <div>
                  <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                    Pulso financeiro e operacional
                  </h2>
                  <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                    Contratos no mês e capacidade da semana atual
                  </p>
                </div>
                <span className="rounded border border-[var(--border-col)] bg-[var(--bg-panel-soft)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                  {new Date(resumo.periodo.referencia).toLocaleDateString(
                    "pt-BR",
                    { month: "long", year: "numeric" }
                  )}
                </span>
              </div>
              <div className="grid gap-px bg-[var(--border-col)] sm:grid-cols-2">
                <div className="bg-[var(--bg-panel)] px-4 py-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                        Consumo das franquias
                      </p>
                      <strong className="mt-1 block text-lg">
                        {resumo.indicadores.consumoContratos}%
                      </strong>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {decimal.format(resumo.indicadores.horasMes)}h /{" "}
                      {decimal.format(resumo.indicadores.horasContratadas)}h
                    </span>
                  </div>
                  <div className="mt-2">
                    <Barra valor={resumo.indicadores.consumoContratos} />
                  </div>
                </div>
                <div className="bg-[var(--bg-panel)] px-4 py-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                        Horas faturáveis
                      </p>
                      <strong className="mt-1 block text-lg">
                        {resumo.indicadores.faturabilidade}%
                      </strong>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      meta sugerida ≥ 75%
                    </span>
                  </div>
                  <div className="mt-2">
                    <Barra
                      valor={resumo.indicadores.faturabilidade}
                      status={
                        resumo.indicadores.faturabilidade < 65
                          ? "ATENCAO"
                          : "NORMAL"
                      }
                    />
                  </div>
                </div>
                <div className="bg-[var(--bg-panel)] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                    Receita por hora contratada
                  </p>
                  <strong className="mt-1 block text-lg">
                    {moeda.format(
                      resumo.indicadores.receitaPorHoraContratada
                    )}
                  </strong>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    referência para precificação e escopo
                  </p>
                </div>
                <div className="bg-[var(--bg-panel)] px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">
                    Concentração da receita
                  </p>
                  <strong className="mt-1 block text-lg">
                    {resumo.indicadores.concentracaoMaiorCliente}%
                  </strong>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    participação do maior contrato
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
              <div className="border-b border-[var(--border-col)] px-4 py-3">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                  Capacidade por equipe
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Onde existe folga ou risco de sobrecarga nesta semana
                </p>
              </div>
              <div className="divide-y divide-[var(--border-col)]">
                {resumo.equipes.map((equipe) => (
                  <article key={equipe.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{equipe.nome}</p>
                        <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                          {equipe.gestor} · {equipe.pessoas} pessoas
                        </p>
                      </div>
                      <strong
                        className={
                          equipe.status === "SOBRECARGA"
                            ? "text-[#ef8e78]"
                            : equipe.status === "ATENCAO"
                              ? "text-[#d9aa4f] dark:text-[#e6c071]"
                              : "text-[var(--accent)]"
                        }
                      >
                        {equipe.ocupacao}%
                      </strong>
                    </div>
                    <div className="mt-2">
                      <Barra valor={equipe.ocupacao} status={equipe.status} />
                    </div>
                    <p className="mt-1.5 text-right text-[10px] text-[var(--text-secondary)]">
                      {decimal.format(equipe.horas)}h de{" "}
                      {decimal.format(equipe.capacidade)}h
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-[minmax(0,1fr)] gap-3 2xl:grid-cols-[1.45fr_0.55fr]">
            <div className="overflow-hidden rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
              <div className="flex items-end justify-between gap-3 border-b border-[var(--border-col)] px-4 py-3">
                <div>
                  <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                    Rentabilidade da carteira
                  </h2>
                  <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                    Receita, peso na carteira e consumo mensal de cada contrato
                  </p>
                </div>
                <span className="hidden text-[10px] text-[var(--text-secondary)] sm:block">
                  franquia mensal
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left">
                  <thead>
                    <tr>
                      <th className="px-3">Cliente</th>
                      <th className="px-3">Responsável</th>
                      <th className="px-3 text-right">Receita</th>
                      <th className="px-3 text-center">% carteira</th>
                      <th className="w-52 px-3">Horas do mês</th>
                      <th className="px-3 text-center">Projetos</th>
                      <th className="px-3 text-center">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.carteira.map((cliente) => (
                      <tr
                        key={cliente.id}
                        className="border-t border-[var(--border-col)]"
                      >
                        <td className="px-3 font-semibold">
                          {cliente.nome}
                          {cliente.conectado && (
                            <span className="ml-2 rounded bg-[#73d9cb]/12 px-1.5 py-0.5 text-[9px] font-extrabold text-[var(--accent)]">
                              CONECTADO
                            </span>
                          )}
                        </td>
                        <td className="px-3 text-[var(--text-secondary)]">
                          {cliente.responsavel}
                        </td>
                        <td className="px-3 text-right font-semibold">
                          {moeda.format(cliente.contratoValor)}
                        </td>
                        <td className="px-3 text-center">
                          {cliente.participacaoReceita}%
                        </td>
                        <td className="px-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span>
                              {decimal.format(cliente.horasConsumidas)}h /{" "}
                              {decimal.format(cliente.horasContratadas)}h
                            </span>
                            <strong>{cliente.consumoContrato}%</strong>
                          </div>
                          <div className="mt-1.5">
                            <Barra
                              valor={cliente.consumoContrato}
                              status={cliente.statusEconomico}
                            />
                          </div>
                        </td>
                        <td className="px-3 text-center">
                          {cliente.projetosAtivos}
                          {cliente.riscos > 0 && (
                            <span className="ml-1 text-[#ef8e78]">
                              · {cliente.riscos} risco
                            </span>
                          )}
                        </td>
                        <td className="px-3 text-center">
                          <span
                            className={`inline-flex rounded border px-2 py-1 text-[9px] font-extrabold ${classeStatus(
                              cliente.statusEconomico
                            )}`}
                          >
                            {cliente.statusEconomico.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
              <div className="border-b border-[var(--border-col)] px-4 py-3">
                <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                  Próximas entregas
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Compromissos mais próximos da carteira
                </p>
              </div>
              <div className="divide-y divide-[var(--border-col)]">
                {resumo.proximasEntregas.map((entrega) => (
                  <article key={entrega.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{entrega.nome}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                          {entrega.cliente} · {entrega.responsavel}
                        </p>
                      </div>
                      <time
                        className={`whitespace-nowrap text-[10px] font-bold ${
                          entrega.saude === "CRITICO"
                            ? "text-[#ef8e78]"
                            : "text-[var(--accent)]"
                        }`}
                      >
                        {entrega.data
                          ? new Date(entrega.data).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "Sem data"}
                      </time>
                    </div>
                    <div className="mt-2">
                      <Barra valor={entrega.progresso} status={entrega.saude} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)]">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-col)] px-4 py-3">
              <div>
                <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                  Fila de decisões
                </h2>
                <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                  Riscos priorizados com causa e próxima ação
                </p>
              </div>
              <span className="rounded-full border border-[var(--border-col)] bg-[var(--bg-panel-soft)] px-2 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                {resumo.alertas.length} itens
              </span>
            </div>
            <div className="grid gap-px bg-[var(--border-col)] md:grid-cols-2">
              {resumo.alertas.map((alerta) => (
                <article
                  key={alerta.id}
                  className="bg-[var(--bg-panel)] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">{alerta.titulo}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {alerta.detalhe}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded border px-2 py-1 text-[9px] font-extrabold ${classeStatus(
                        alerta.severidade
                      )}`}
                    >
                      {alerta.severidade}
                    </span>
                  </div>
                  <p className="mt-2 border-l-2 border-[var(--accent)] pl-2 text-[11px]">
                    <span className="font-bold text-[var(--accent)]">Ação: </span>
                    {alerta.acao}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}
