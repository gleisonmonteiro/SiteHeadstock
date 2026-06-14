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

type Aba = "visao" | "projetos" | "horas" | "cadastros";
type Modal =
  | "colaborador"
  | "equipe"
  | "cliente"
  | "projeto"
  | "horas"
  | "atualizacao"
  | null;

type Colaborador = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  status: string;
  equipe: { id: string; nome: string; funcao: string | null } | null;
  capacidadeSemanal: number;
  horasSemana: number;
  horasMes: number;
  utilizacao: number;
  faturabilidade: number;
  projetos: string[];
  semApontamento: boolean;
};

type Equipe = {
  id: string;
  nome: string;
  gestor: { id: string; nome: string } | null;
  membros: Array<{
    id: string;
    nome: string;
    funcao: string | null;
    capacidadeSemanal: number;
  }>;
};

type Projeto = {
  id: string;
  nome: string;
  cliente: { id: string; nome: string };
  equipe: { id: string; nome: string } | null;
  responsavel: { id: string; nome: string } | null;
  participantes: Array<{ id: string; nome: string; papel: string | null }>;
  status: string;
  saude: "NORMAL" | "ATENCAO" | "CRITICO";
  progresso: number;
  prazo: string | null;
  horasPrevistas: number;
  horasRealizadas: number;
  consumoHoras: number;
  proximaEntrega: string | null;
  dataProximaEntrega: string | null;
  impedimento: string | null;
  atrasado: boolean;
  entregaAtrasada: boolean;
  ultimaAtualizacao: string;
};

type Gestao = {
  resumo: {
    colaboradores: number;
    equipes: number;
    projetosAtivos: number;
    projetosEmRisco: number;
    entregasAtrasadas: number;
    semApontamento: number;
    capacidadeSemanal: number;
    horasSemana: number;
    ocupacao: number;
  };
  colaboradores: Colaborador[];
  equipes: Equipe[];
  clientes: Array<{
    id: string;
    nome: string;
    horasContratadas: number | null;
    contratoValor: number | null;
  }>;
  projetos: Projeto[];
};

const inteiro = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[9px] font-extrabold uppercase tracking-wide text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

const campoClass =
  "w-full rounded-lg border border-[var(--border-col)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[#102c29] outline-none focus:border-[var(--accent)]";

export default function EquipesPage() {
  const [aba, setAba] = useState<Aba>("visao");
  const [dados, setDados] = useState<Gestao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [projetoSelecionado, setProjetoSelecionado] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/agencia/gestao-equipes");
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro);
      setDados(resultado);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao carregar equipes");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(carregar);
  }, []);

  async function executar(acao: string, formulario: HTMLFormElement) {
    setSalvando(true);
    setErro("");
    setMensagem("");
    const form = new FormData(formulario);
    const get = (nome: string) => String(form.get(nome) ?? "").trim();
    const getNumero = (nome: string) => {
      const valor = Number(form.get(nome));
      return Number.isFinite(valor) ? valor : 0;
    };
    const selecionados = (nome: string) =>
      form.getAll(nome).map(String).filter(Boolean);

    let payload: Record<string, unknown> = {};
    if (acao === "criar_colaborador") {
      payload = {
        nome: get("nome"),
        email: get("email") || undefined,
        funcao: get("funcao") || undefined,
        capacidadeSemanal: getNumero("capacidadeSemanal") || 40,
        equipeId: get("equipeId") || undefined,
      };
    } else if (acao === "criar_equipe") {
      payload = {
        nome: get("nome"),
        gestorId: get("gestorId") || undefined,
        membrosIds: selecionados("membrosIds"),
      };
    } else if (acao === "criar_cliente") {
      payload = {
        nome: get("nome"),
        documento: get("documento") || undefined,
        responsavelId: get("responsavelId") || undefined,
        contratoValor: getNumero("contratoValor") || undefined,
        horasContratadas: getNumero("horasContratadas") || undefined,
      };
    } else if (acao === "criar_projeto") {
      payload = {
        nome: get("nome"),
        clienteId: get("clienteId"),
        equipeId: get("equipeId") || undefined,
        responsavelId: get("responsavelId") || undefined,
        participantesIds: selecionados("participantesIds"),
        horasPrevistas: getNumero("horasPrevistas") || undefined,
        prazo: get("prazo") || undefined,
        proximaEntrega: get("proximaEntrega") || undefined,
        dataProximaEntrega: get("dataProximaEntrega") || undefined,
      };
    } else if (acao === "registrar_horas") {
      payload = {
        usuarioId: get("usuarioId"),
        projetoId: get("projetoId"),
        data: get("data"),
        horas: getNumero("horas"),
        tipoAtividade: get("tipoAtividade"),
        faturavel: form.get("faturavel") === "on",
        observacao: get("observacao") || undefined,
      };
    } else {
      payload = {
        projetoId: get("projetoId"),
        progresso: getNumero("progresso"),
        saude: get("saude"),
        proximaEntrega: get("proximaEntrega") || undefined,
        dataProximaEntrega: get("dataProximaEntrega") || undefined,
        impedimento: get("impedimento") || undefined,
      };
    }

    try {
      const resposta = await fetch("/api/agencia/gestao-equipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, dados: payload }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro ?? "Não foi possível salvar");
      setMensagem("Informações salvas com sucesso.");
      setModal(null);
      setProjetoSelecionado("");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function importarOperand(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setSalvando(true);
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    try {
      const resposta = await fetch("/api/agencia/imports/operand", {
        method: "POST",
        body: formData,
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro);
      setMensagem("Dados do Operand incorporados à gestão da agência.");
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao importar Operand");
    } finally {
      setSalvando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const projetosRisco = useMemo(
    () =>
      dados?.projetos.filter(
        (projeto) => projeto.saude !== "NORMAL" || projeto.atrasado || projeto.entregaAtrasada,
      ) ?? [],
    [dados],
  );

  return (
    <DashboardLayout
      titulo="Gestão de Equipes"
      descricao="Pessoas, projetos, horas, entregas e riscos da operação da agência"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto">
            <BITabs
              value={aba}
              onChange={setAba}
              items={[
                { id: "visao", label: "Visão CEO" },
                { id: "projetos", label: "Projetos e entregas" },
                { id: "horas", label: "Pessoas e horas" },
                { id: "cadastros", label: "Cadastros" },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModal("horas")}
              className="rounded-lg bg-[#73d9cb] px-3 py-2 text-[11px] font-extrabold text-[#06211f]"
            >
              Registrar horas
            </button>
            <button
              type="button"
              onClick={() => setModal("atualizacao")}
              className="rounded-lg border border-[#73d9cb]/35 bg-[#73d9cb]/8 px-3 py-2 text-[11px] font-extrabold text-[var(--accent)]"
            >
              Atualizar projeto
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(evento) => void importarOperand(evento)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-lg border border-[var(--border-col)] bg-[var(--bg-panel)] px-3 py-2 text-[10px] font-bold text-[var(--text-secondary)]"
            >
              Integração opcional: Operand
            </button>
          </div>
        </div>

        {mensagem && (
          <div className="rounded-lg border border-[#73d9cb]/30 bg-[#73d9cb]/8 p-3 text-xs text-[var(--accent)]">
            {mensagem}
          </div>
        )}
        {erro && (
          <div className="rounded-lg border border-[#ef8e78]/30 bg-[#ef8e78]/8 p-3 text-xs text-[#ef8e78]">
            {erro}
          </div>
        )}

        {carregando || !dados ? (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, indice) => (
              <div
                key={indice}
                className="h-24 animate-pulse rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)]"
              />
            ))}
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              <BIKpi
                label="Colaboradores"
                value={inteiro.format(dados.resumo.colaboradores)}
                detail={`${dados.resumo.equipes} equipes`}
                tone="accent"
              />
              <BIKpi
                label="Projetos ativos"
                value={inteiro.format(dados.resumo.projetosAtivos)}
                detail={`${dados.resumo.projetosEmRisco} exigem atenção`}
                tone={dados.resumo.projetosEmRisco ? "warning" : "success"}
              />
              <BIKpi
                label="Entregas atrasadas"
                value={inteiro.format(dados.resumo.entregasAtrasadas)}
                detail="próximas entregas vencidas"
                tone={dados.resumo.entregasAtrasadas ? "danger" : "success"}
              />
              <BIKpi
                label="Horas da semana"
                value={`${decimal.format(dados.resumo.horasSemana)}h`}
                detail={`de ${decimal.format(dados.resumo.capacidadeSemanal)}h`}
              />
              <BIKpi
                label="Ocupação"
                value={`${dados.resumo.ocupacao}%`}
                detail="capacidade utilizada"
                tone={dados.resumo.ocupacao > 100 ? "danger" : dados.resumo.ocupacao >= 85 ? "warning" : "success"}
              />
              <BIKpi
                label="Sem apontamento"
                value={inteiro.format(dados.resumo.semApontamento)}
                detail="na semana atual"
                tone={dados.resumo.semApontamento ? "warning" : "success"}
              />
            </section>

            {aba === "visao" && (
              <div className="space-y-3">
                <section className="grid gap-3 xl:grid-cols-[1fr_1.2fr]">
                  <BISection title="Onde a equipe está trabalhando" subtitle="Horas e projetos ativos por colaborador">
                    <BIDataTable
                      columns={[
                        { key: "nome", label: "Colaborador" },
                        { key: "equipe", label: "Equipe" },
                        { key: "projetos", label: "Projetos" },
                        { key: "semana", label: "Semana", align: "right" },
                        { key: "ocupacao", label: "Ocupação", align: "right" },
                      ]}
                      rows={dados.colaboradores.map((colaborador) => ({
                        id: colaborador.id,
                        nome: <span className="font-bold">{colaborador.nome}</span>,
                        equipe: colaborador.equipe?.nome ?? "Sem equipe",
                        projetos: colaborador.projetos.slice(0, 3).join(" · ") || "Sem projeto",
                        semana: `${decimal.format(colaborador.horasSemana)}h`,
                        ocupacao: (
                          <BIBadge
                            tone={
                              colaborador.utilizacao > 100
                                ? "danger"
                                : colaborador.utilizacao >= 85
                                  ? "warning"
                                  : colaborador.semApontamento
                                    ? "neutral"
                                    : "success"
                            }
                          >
                            {colaborador.utilizacao}%
                          </BIBadge>
                        ),
                      }))}
                    />
                  </BISection>
                  <BISection title="Riscos e entregas" subtitle="O que exige decisão do CEO">
                    <BIDataTable
                      columns={[
                        { key: "projeto", label: "Projeto" },
                        { key: "cliente", label: "Cliente" },
                        { key: "entrega", label: "Próxima entrega" },
                        { key: "progresso", label: "Progresso", align: "right" },
                        { key: "horas", label: "Horas", align: "right" },
                        { key: "risco", label: "Situação", align: "right" },
                      ]}
                      rows={projetosRisco.map((projeto) => ({
                        id: projeto.id,
                        projeto: <span className="font-bold">{projeto.nome}</span>,
                        cliente: projeto.cliente.nome,
                        entrega: projeto.proximaEntrega ?? "Não definida",
                        progresso: `${projeto.progresso}%`,
                        horas: `${projeto.consumoHoras}%`,
                        risco: (
                          <BIBadge
                            tone={
                              projeto.saude === "CRITICO" || projeto.atrasado
                                ? "danger"
                                : "warning"
                            }
                          >
                            {projeto.atrasado
                              ? "Atrasado"
                              : projeto.entregaAtrasada
                                ? "Entrega atrasada"
                                : projeto.saude}
                          </BIBadge>
                        ),
                      }))}
                    />
                  </BISection>
                </section>
                <section className="grid gap-3 lg:grid-cols-2">
                  <BISection title="Carga por colaborador" subtitle="Horas na semana atual">
                    <BIBarList
                      items={dados.colaboradores.map((colaborador) => ({
                        label: colaborador.nome,
                        value: colaborador.horasSemana,
                        detail: `${colaborador.utilizacao}% de ${colaborador.capacidadeSemanal}h`,
                      }))}
                      formatValue={(valor) => `${decimal.format(valor)}h`}
                      limit={20}
                      color="#1478ff"
                    />
                  </BISection>
                  <BISection title="Projetos por consumo de horas" subtitle="Previsto versus realizado">
                    <BIBarList
                      items={[...dados.projetos]
                        .sort((a, b) => b.consumoHoras - a.consumoHoras)
                        .map((projeto) => ({
                          label: projeto.nome,
                          value: projeto.consumoHoras,
                          detail: `${decimal.format(projeto.horasRealizadas)}h de ${decimal.format(projeto.horasPrevistas)}h`,
                        }))}
                      formatValue={(valor) => `${valor}%`}
                      limit={12}
                      color="#00a9a5"
                    />
                  </BISection>
                </section>
              </div>
            )}

            {aba === "projetos" && (
              <BISection title="Projetos e entregas" subtitle="Responsáveis, participantes, progresso, prazo e consumo">
                <BIDataTable
                  columns={[
                    { key: "projeto", label: "Projeto" },
                    { key: "cliente", label: "Cliente" },
                    { key: "pessoas", label: "Equipe envolvida" },
                    { key: "entrega", label: "Próxima entrega" },
                    { key: "prazo", label: "Prazo" },
                    { key: "progresso", label: "Progresso", align: "right" },
                    { key: "horas", label: "Horas", align: "right" },
                    { key: "saude", label: "Saúde", align: "right" },
                  ]}
                  rows={dados.projetos.map((projeto) => ({
                    id: projeto.id,
                    projeto: <span className="font-bold">{projeto.nome}</span>,
                    cliente: projeto.cliente.nome,
                    pessoas: [
                      projeto.responsavel?.nome,
                      ...projeto.participantes.map((item) => item.nome),
                    ]
                      .filter(Boolean)
                      .join(", ") || "Sem participantes",
                    entrega: projeto.proximaEntrega ?? "Não definida",
                    prazo: projeto.prazo
                      ? new Date(projeto.prazo).toLocaleDateString("pt-BR")
                      : "—",
                    progresso: `${projeto.progresso}%`,
                    horas: `${decimal.format(projeto.horasRealizadas)} / ${decimal.format(projeto.horasPrevistas)}h`,
                    saude: (
                      <BIBadge
                        tone={
                          projeto.saude === "CRITICO" || projeto.atrasado
                            ? "danger"
                            : projeto.saude === "ATENCAO"
                              ? "warning"
                              : "success"
                        }
                      >
                        {projeto.atrasado ? "ATRASADO" : projeto.saude}
                      </BIBadge>
                    ),
                  }))}
                />
              </BISection>
            )}

            {aba === "horas" && (
              <div className="space-y-3">
                <BISection title="Pessoas e capacidade" subtitle="Ocupação, faturabilidade e projetos atuais">
                  <BIDataTable
                    columns={[
                      { key: "nome", label: "Colaborador" },
                      { key: "funcao", label: "Função / equipe" },
                      { key: "projetos", label: "Projetos ativos" },
                      { key: "semana", label: "Semana", align: "right" },
                      { key: "mes", label: "Mês", align: "right" },
                      { key: "utilizacao", label: "Utilização", align: "right" },
                      { key: "faturabilidade", label: "Faturável", align: "right" },
                    ]}
                    rows={dados.colaboradores.map((colaborador) => ({
                      id: colaborador.id,
                      nome: <span className="font-bold">{colaborador.nome}</span>,
                      funcao: `${colaborador.equipe?.funcao ?? "Colaborador"} · ${colaborador.equipe?.nome ?? "Sem equipe"}`,
                      projetos: colaborador.projetos.join(", ") || "—",
                      semana: `${decimal.format(colaborador.horasSemana)}h`,
                      mes: `${decimal.format(colaborador.horasMes)}h`,
                      utilizacao: `${colaborador.utilizacao}%`,
                      faturabilidade: `${colaborador.faturabilidade}%`,
                    }))}
                  />
                </BISection>
              </div>
            )}

            {aba === "cadastros" && (
              <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                {[
                  {
                    titulo: "Colaboradores",
                    texto: "Cadastre os funcionários, função, capacidade semanal e equipe.",
                    acao: "Novo colaborador",
                    modal: "colaborador" as Modal,
                  },
                  {
                    titulo: "Equipes",
                    texto: "Organize atendimento, criação, mídia, conteúdo, financeiro ou outros times.",
                    acao: "Nova equipe",
                    modal: "equipe" as Modal,
                  },
                  {
                    titulo: "Clientes",
                    texto: "Cadastre contas atendidas, responsável, contrato e banco de horas.",
                    acao: "Novo cliente",
                    modal: "cliente" as Modal,
                  },
                  {
                    titulo: "Projetos",
                    texto: "Defina cliente, responsáveis, participantes, prazo, horas e próxima entrega.",
                    acao: "Novo projeto",
                    modal: "projeto" as Modal,
                  },
                  {
                    titulo: "Operação semanal",
                    texto: "Registre horas e atualize progresso, saúde, entregas e impedimentos.",
                    acao: "Registrar horas",
                    modal: "horas" as Modal,
                  },
                ].map((item) => (
                  <BISection key={item.titulo} title={item.titulo}>
                    <p className="min-h-16 text-xs leading-5 text-[var(--text-secondary)]">
                      {item.texto}
                    </p>
                    <button
                      type="button"
                      onClick={() => setModal(item.modal)}
                      className="mt-3 w-full rounded-lg border border-[#73d9cb]/35 bg-[#73d9cb]/8 px-3 py-2 text-xs font-extrabold text-[var(--accent)]"
                    >
                      {item.acao}
                    </button>
                  </BISection>
                ))}
              </section>
            )}
          </>
        )}
      </div>

      {modal && dados && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-xl border border-[var(--border-col)] bg-[var(--bg-panel)] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold">
                  {
                    {
                      colaborador: "Novo colaborador",
                      equipe: "Nova equipe",
                      cliente: "Novo cliente",
                      projeto: "Novo projeto",
                      horas: "Registrar horas",
                      atualizacao: "Atualizar projeto",
                    }[modal]
                  }
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Preenchimento nativo do Headstock. Nenhuma importação é necessária.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-[var(--border-col)] px-3 py-1.5 text-xs"
              >
                Fechar
              </button>
            </div>

            {modal === "colaborador" && (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void executar("criar_colaborador", evento.currentTarget);
                }}
              >
                <Campo label="Nome"><input name="nome" required className={campoClass} /></Campo>
                <Campo label="E-mail para acesso (opcional)"><input name="email" type="email" className={campoClass} /></Campo>
                <Campo label="Função"><input name="funcao" placeholder="Designer, atendimento, tráfego..." className={campoClass} /></Campo>
                <Campo label="Capacidade semanal"><input name="capacidadeSemanal" type="number" min="1" defaultValue="40" className={campoClass} /></Campo>
                <Campo label="Equipe">
                  <select name="equipeId" className={campoClass}>
                    <option value="">Cadastrar sem equipe</option>
                    {dados.equipes.map((equipe) => <option key={equipe.id} value={equipe.id}>{equipe.nome}</option>)}
                  </select>
                </Campo>
                <div className="md:col-span-2"><BotaoSalvar salvando={salvando} /></div>
              </form>
            )}

            {modal === "equipe" && (
              <form
                className="space-y-3"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void executar("criar_equipe", evento.currentTarget);
                }}
              >
                <Campo label="Nome da equipe"><input name="nome" required className={campoClass} /></Campo>
                <Campo label="Gestor">
                  <select name="gestorId" className={campoClass}>
                    <option value="">Sem gestor definido</option>
                    {dados.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Membros">
                  <select name="membrosIds" multiple className={`${campoClass} min-h-36`}>
                    {dados.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <BotaoSalvar salvando={salvando} />
              </form>
            )}

            {modal === "cliente" && (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void executar("criar_cliente", evento.currentTarget);
                }}
              >
                <Campo label="Nome do cliente">
                  <input name="nome" required className={campoClass} />
                </Campo>
                <Campo label="Documento (opcional)">
                  <input name="documento" className={campoClass} />
                </Campo>
                <Campo label="Responsável pela conta">
                  <select name="responsavelId" className={campoClass}>
                    <option value="">Sem responsável definido</option>
                    {dados.colaboradores.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Valor mensal do contrato">
                  <input
                    name="contratoValor"
                    type="number"
                    min="0"
                    step="0.01"
                    className={campoClass}
                  />
                </Campo>
                <Campo label="Horas contratadas por mês">
                  <input
                    name="horasContratadas"
                    type="number"
                    min="0"
                    step="0.5"
                    className={campoClass}
                  />
                </Campo>
                <div className="md:col-span-2">
                  <BotaoSalvar salvando={salvando} />
                </div>
              </form>
            )}

            {modal === "projeto" && (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void executar("criar_projeto", evento.currentTarget);
                }}
              >
                <Campo label="Nome do projeto"><input name="nome" required className={campoClass} /></Campo>
                <Campo label="Cliente">
                  <select name="clienteId" required className={campoClass}>
                    <option value="">Selecione</option>
                    {dados.clientes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Equipe">
                  <select name="equipeId" className={campoClass}>
                    <option value="">Sem equipe</option>
                    {dados.equipes.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Responsável principal">
                  <select name="responsavelId" className={campoClass}>
                    <option value="">Sem responsável</option>
                    {dados.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Participantes">
                  <select name="participantesIds" multiple className={`${campoClass} min-h-28`}>
                    {dados.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Horas previstas"><input name="horasPrevistas" type="number" min="0" step="0.5" className={campoClass} /></Campo>
                <Campo label="Prazo do projeto"><input name="prazo" type="date" className={campoClass} /></Campo>
                <Campo label="Próxima entrega"><input name="proximaEntrega" className={campoClass} /></Campo>
                <Campo label="Data da entrega"><input name="dataProximaEntrega" type="date" className={campoClass} /></Campo>
                <div className="md:col-span-2"><BotaoSalvar salvando={salvando} /></div>
              </form>
            )}

            {modal === "horas" && (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void executar("registrar_horas", evento.currentTarget);
                }}
              >
                <Campo label="Colaborador">
                  <select name="usuarioId" required className={campoClass}>
                    <option value="">Selecione</option>
                    {dados.colaboradores.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Projeto">
                  <select name="projetoId" required className={campoClass}>
                    <option value="">Selecione</option>
                    {dados.projetos.map((item) => <option key={item.id} value={item.id}>{item.nome} · {item.cliente.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Data"><input name="data" type="date" defaultValue={hojeISO()} required className={campoClass} /></Campo>
                <Campo label="Horas"><input name="horas" type="number" min="0.1" max="24" step="0.25" required className={campoClass} /></Campo>
                <Campo label="Atividade"><input name="tipoAtividade" placeholder="Criação, reunião, mídia..." className={campoClass} /></Campo>
                <Campo label="Observação"><input name="observacao" className={campoClass} /></Campo>
                <label className="flex items-center gap-2 text-xs"><input name="faturavel" type="checkbox" defaultChecked /> Hora faturável / cliente</label>
                <div className="md:col-span-2"><BotaoSalvar salvando={salvando} /></div>
              </form>
            )}

            {modal === "atualizacao" && (
              <form
                className="grid gap-3 md:grid-cols-2"
                onSubmit={(evento) => {
                  evento.preventDefault();
                  void executar("atualizar_projeto", evento.currentTarget);
                }}
              >
                <Campo label="Projeto">
                  <select
                    name="projetoId"
                    required
                    value={projetoSelecionado}
                    onChange={(evento) => setProjetoSelecionado(evento.target.value)}
                    className={campoClass}
                  >
                    <option value="">Selecione</option>
                    {dados.projetos.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                  </select>
                </Campo>
                <Campo label="Progresso (%)"><input name="progresso" type="number" min="0" max="100" required className={campoClass} /></Campo>
                <Campo label="Saúde">
                  <select name="saude" className={campoClass}>
                    <option value="NORMAL">Normal</option>
                    <option value="ATENCAO">Atenção</option>
                    <option value="CRITICO">Crítico</option>
                  </select>
                </Campo>
                <Campo label="Próxima entrega"><input name="proximaEntrega" className={campoClass} /></Campo>
                <Campo label="Data da entrega"><input name="dataProximaEntrega" type="date" className={campoClass} /></Campo>
                <Campo label="Impedimento"><input name="impedimento" className={campoClass} /></Campo>
                <div className="md:col-span-2"><BotaoSalvar salvando={salvando} /></div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function BotaoSalvar({ salvando }: { salvando: boolean }) {
  return (
    <button
      type="submit"
      disabled={salvando}
      className="w-full rounded-lg bg-[#73d9cb] px-4 py-2.5 text-sm font-extrabold text-[#06211f] disabled:opacity-50"
    >
      {salvando ? "Salvando..." : "Salvar"}
    </button>
  );
}
