/**
 * Popula a gestao de equipes da Radiola WiFi com um cenario demonstrativo.
 * Pode ser executado novamente sem duplicar colaboradores, projetos ou horas.
 *
 * Execute: npm run db:seed-radiolawifi-equipes
 */

import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEMO_EMAIL_DOMAIN = "@demo.radiolawifi.local";
const DEMO_PROJECT_PREFIX = "demo-radiola-projeto-";
const DEMO_HOURS_PREFIX = "demo-radiola-horas-";

function dateAtNoon(offsetDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

function currentWeekDays() {
  const now = new Date();
  const monday = new Date(now);
  const day = monday.getDay();
  monday.setDate(monday.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(12, 0, 0, 0);

  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

const people = [
  { key: "mariana", nome: "Mariana Costa", papel: "AGENCY_MANAGER" as const, funcao: "Diretora de Operacoes", capacity: 40 },
  { key: "rafael", nome: "Rafael Nunes", papel: "COLLABORATOR" as const, funcao: "Executivo de Contas", capacity: 40 },
  { key: "bianca", nome: "Bianca Lima", papel: "COLLABORATOR" as const, funcao: "Gerente de Projetos", capacity: 40 },
  { key: "lucas", nome: "Lucas Melo", papel: "AGENCY_MANAGER" as const, funcao: "Diretor de Criacao", capacity: 40 },
  { key: "camila", nome: "Camila Rocha", papel: "COLLABORATOR" as const, funcao: "Designer Senior", capacity: 40 },
  { key: "pedro", nome: "Pedro Alves", papel: "COLLABORATOR" as const, funcao: "Designer", capacity: 40 },
  { key: "ana", nome: "Ana Clara", papel: "COLLABORATOR" as const, funcao: "Copywriter", capacity: 40 },
  { key: "joao", nome: "Joao Vitor", papel: "COLLABORATOR" as const, funcao: "Motion Designer", capacity: 40 },
  { key: "fernanda", nome: "Fernanda Souza", papel: "AGENCY_MANAGER" as const, funcao: "Coordenadora de Performance", capacity: 40 },
  { key: "diego", nome: "Diego Martins", papel: "COLLABORATOR" as const, funcao: "Gestor de Trafego", capacity: 40 },
  { key: "bruna", nome: "Bruna Teles", papel: "COLLABORATOR" as const, funcao: "Analista de Midia", capacity: 40 },
  { key: "caio", nome: "Caio Ribeiro", papel: "COLLABORATOR" as const, funcao: "Analista de Dados", capacity: 40 },
  { key: "juliana", nome: "Juliana Freitas", papel: "AGENCY_MANAGER" as const, funcao: "Coordenadora de Conteudo", capacity: 40 },
  { key: "larissa", nome: "Larissa Gomes", papel: "COLLABORATOR" as const, funcao: "Social Media", capacity: 40 },
  { key: "renato", nome: "Renato Barros", papel: "COLLABORATOR" as const, funcao: "Redator", capacity: 40 },
  { key: "isabela", nome: "Isabela Moura", papel: "COLLABORATOR" as const, funcao: "Community Manager", capacity: 30 },
  { key: "thiago", nome: "Thiago Sales", papel: "AGENCY_MANAGER" as const, funcao: "Coordenador Audiovisual", capacity: 40 },
  { key: "gabriel", nome: "Gabriel Costa", papel: "COLLABORATOR" as const, funcao: "Videomaker", capacity: 40 },
  { key: "paula", nome: "Paula Mendes", papel: "COLLABORATOR" as const, funcao: "Produtora", capacity: 40 },
];

const teamConfigs = [
  { nome: "Diretoria e Atendimento", manager: "mariana", members: ["ceo", "mariana", "rafael", "bianca"] },
  { nome: "Criacao e Design", manager: "lucas", members: ["lucas", "camila", "pedro", "ana", "joao"] },
  { nome: "Performance e Dados", manager: "fernanda", members: ["fernanda", "diego", "bruna", "caio"] },
  { nome: "Conteudo e Comunidade", manager: "juliana", members: ["juliana", "larissa", "renato", "isabela"] },
  { nome: "Audiovisual e Projetos", manager: "thiago", members: ["thiago", "gabriel", "paula"] },
];

const clientConfigs = [
  { key: "cholet", nome: "Cholet Moda", value: 18500, hours: 150, owner: "rafael" },
  { key: "tolas", nome: "Tolas Moda Masculina", value: 12800, hours: 100, owner: "bianca" },
  { key: "madu", nome: "Madu Kids", value: 9800, hours: 80, owner: "rafael" },
  { key: "nordeste", nome: "Nordeste Fitness", value: 14500, hours: 110, owner: "bianca" },
  { key: "cafe", nome: "Cafe do Patio", value: 7600, hours: 55, owner: "rafael" },
  { key: "solar", nome: "Solar Engenharia", value: 11200, hours: 75, owner: "bianca" },
  { key: "clinica", nome: "Clinica Vitta", value: 8900, hours: 65, owner: "rafael" },
  { key: "porto", nome: "Porto Beach Hotel", value: 15400, hours: 120, owner: "bianca" },
];

const projectConfigs = [
  {
    key: "cholet-campanha",
    nome: "Campanha Colecao Alto Verao",
    client: "cholet",
    team: "Criacao e Design",
    owner: "lucas",
    members: ["camila", "ana", "joao", "larissa"],
    status: "EM_ANDAMENTO" as const,
    health: "ATENCAO" as const,
    progress: 58,
    planned: 120,
    deadline: 9,
    delivery: "Pecas finais e plano de lancamento",
    deliveryOffset: 2,
    blocker: "Aprovacao de fotos ainda pendente.",
  },
  {
    key: "cholet-performance",
    nome: "Performance E-commerce Junho",
    client: "cholet",
    team: "Performance e Dados",
    owner: "fernanda",
    members: ["diego", "bruna", "caio"],
    status: "EM_ANDAMENTO" as const,
    health: "NORMAL" as const,
    progress: 72,
    planned: 95,
    deadline: 16,
    delivery: "Relatorio de ROAS e plano de escala",
    deliveryOffset: 4,
  },
  {
    key: "tolas-rebranding",
    nome: "Reposicionamento de Marca",
    client: "tolas",
    team: "Criacao e Design",
    owner: "lucas",
    members: ["camila", "pedro", "ana", "gabriel"],
    status: "EM_ANDAMENTO" as const,
    health: "CRITICO" as const,
    progress: 43,
    planned: 150,
    deadline: -3,
    delivery: "Manual de identidade visual",
    deliveryOffset: -2,
    blocker: "Direcao visual voltou da aprovacao com mudanca de escopo.",
  },
  {
    key: "madu-social",
    nome: "Always On Redes Sociais",
    client: "madu",
    team: "Conteudo e Comunidade",
    owner: "juliana",
    members: ["larissa", "renato", "isabela", "camila"],
    status: "EM_ANDAMENTO" as const,
    health: "NORMAL" as const,
    progress: 81,
    planned: 85,
    deadline: 20,
    delivery: "Calendario editorial da proxima quinzena",
    deliveryOffset: 5,
  },
  {
    key: "fitness-leads",
    nome: "Maquina de Leads Franquias",
    client: "nordeste",
    team: "Performance e Dados",
    owner: "fernanda",
    members: ["diego", "caio", "ana", "rafael"],
    status: "EM_ANDAMENTO" as const,
    health: "ATENCAO" as const,
    progress: 48,
    planned: 110,
    deadline: 12,
    delivery: "Landing page e nova segmentacao",
    deliveryOffset: 1,
    blocker: "CPL acima da meta nos ultimos sete dias.",
  },
  {
    key: "cafe-video",
    nome: "Serie Sabores do Patio",
    client: "cafe",
    team: "Audiovisual e Projetos",
    owner: "thiago",
    members: ["gabriel", "paula", "larissa"],
    status: "EM_ANDAMENTO" as const,
    health: "NORMAL" as const,
    progress: 66,
    planned: 60,
    deadline: 8,
    delivery: "Edicao dos episodios 3 e 4",
    deliveryOffset: 3,
  },
  {
    key: "solar-site",
    nome: "Novo Site Institucional",
    client: "solar",
    team: "Criacao e Design",
    owner: "bianca",
    members: ["pedro", "ana", "caio"],
    status: "EM_ANDAMENTO" as const,
    health: "ATENCAO" as const,
    progress: 50,
    planned: 130,
    deadline: 18,
    delivery: "Prototipo navegavel para diretoria",
    deliveryOffset: -1,
    blocker: "Conteudo tecnico das obras nao foi entregue.",
  },
  {
    key: "clinica-conteudo",
    nome: "Autoridade Medica Digital",
    client: "clinica",
    team: "Conteudo e Comunidade",
    owner: "juliana",
    members: ["renato", "larissa", "gabriel"],
    status: "EM_ANDAMENTO" as const,
    health: "NORMAL" as const,
    progress: 37,
    planned: 70,
    deadline: 25,
    delivery: "Roteiros de videos educativos",
    deliveryOffset: 6,
  },
  {
    key: "porto-inverno",
    nome: "Campanha Ferias de Julho",
    client: "porto",
    team: "Diretoria e Atendimento",
    owner: "mariana",
    members: ["ceo", "rafael", "lucas", "diego", "gabriel", "paula"],
    status: "EM_ANDAMENTO" as const,
    health: "CRITICO" as const,
    progress: 31,
    planned: 145,
    deadline: 7,
    delivery: "Campanha completa para veiculacao",
    deliveryOffset: 0,
    blocker: "Producao externa depende de confirmacao do hotel.",
  },
  {
    key: "radiola-interno",
    nome: "Cases e Novo Site da Agencia",
    client: "porto",
    team: "Diretoria e Atendimento",
    owner: "mariana",
    members: ["ceo", "ana", "pedro", "caio"],
    status: "PAUSADO" as const,
    health: "ATENCAO" as const,
    progress: 24,
    planned: 70,
    deadline: 32,
    delivery: "Selecao dos cinco cases prioritarios",
    deliveryOffset: 12,
    blocker: "Prioridade reduzida por demandas de clientes.",
  },
  {
    key: "tolas-crm",
    nome: "Jornada de CRM e Recuperacao",
    client: "tolas",
    team: "Performance e Dados",
    owner: "caio",
    members: ["bruna", "renato", "isabela"],
    status: "PLANEJAMENTO" as const,
    health: "NORMAL" as const,
    progress: 12,
    planned: 65,
    deadline: 30,
    delivery: "Mapa de jornadas e segmentos",
    deliveryOffset: 9,
  },
  {
    key: "madu-catalogo",
    nome: "Catalogo Digital Primavera",
    client: "madu",
    team: "Audiovisual e Projetos",
    owner: "paula",
    members: ["gabriel", "camila", "larissa"],
    status: "EM_ANDAMENTO" as const,
    health: "NORMAL" as const,
    progress: 22,
    planned: 90,
    deadline: 28,
    delivery: "Plano de producao e casting",
    deliveryOffset: 7,
  },
];

async function main() {
  console.log("SEED RADIOLAWIFI - GESTAO DE EQUIPES\n");

  const agency = await prisma.empresa.findFirst({ where: { slug: "radiolawifi" } });
  if (!agency) {
    throw new Error("Agencia radiolawifi nao encontrada. Rode prisma/seed-radiolawifi.ts primeiro.");
  }

  const ceo = await prisma.usuario.findFirst({
    where: { empresaId: agency.id, papel: "AGENCY_CEO" },
  });
  if (!ceo) throw new Error("CEO da Radiola WiFi nao encontrado.");

  await prisma.apontamentoHora.deleteMany({
    where: { agenciaId: agency.id, idExterno: { startsWith: DEMO_HOURS_PREFIX } },
  });
  await prisma.projeto.deleteMany({
    where: { agenciaId: agency.id, idExterno: { startsWith: DEMO_PROJECT_PREFIX } },
  });

  const demoTeams = teamConfigs.map((team) => team.nome);
  await prisma.equipeMembro.deleteMany({
    where: { equipe: { empresaId: agency.id, nome: { in: demoTeams } } },
  });
  await prisma.equipe.deleteMany({
    where: { empresaId: agency.id, nome: { in: demoTeams } },
  });
  await prisma.usuario.deleteMany({
    where: { empresaId: agency.id, email: { endsWith: DEMO_EMAIL_DOMAIN } },
  });

  const passwordHash = await bcrypt.hash("123456", 10);
  const users = new Map<string, { id: string; nome: string }>();
  users.set("ceo", ceo);

  for (const person of people) {
    const user = await prisma.usuario.create({
      data: {
        nome: person.nome,
        email: `${person.key}${DEMO_EMAIL_DOMAIN}`,
        senhaHash: passwordHash,
        status: "sem_acesso",
        papel: person.papel,
        empresaId: agency.id,
      },
    });
    users.set(person.key, user);
  }

  const teams = new Map<string, { id: string }>();
  for (const config of teamConfigs) {
    const manager = users.get(config.manager)!;
    const team = await prisma.equipe.create({
      data: {
        empresaId: agency.id,
        nome: config.nome,
        gestorId: manager.id,
        membros: {
          create: config.members.map((key) => {
            const user = users.get(key)!;
            const person = people.find((item) => item.key === key);
            return {
              usuarioId: user.id,
              funcao: key === "ceo" ? "CEO e Estrategia" : person?.funcao,
              capacidadeSemanal: key === "ceo" ? 40 : person?.capacity ?? 40,
            };
          }),
        },
      },
    });
    teams.set(config.nome, team);
  }

  const clients = new Map<string, { id: string }>();
  for (const config of clientConfigs) {
    const existing = await prisma.clienteAgencia.findFirst({
      where: { agenciaId: agency.id, nome: config.nome },
    });
    const data = {
      status: "ativo",
      contratoValor: config.value,
      horasContratadas: config.hours,
      responsavelId: users.get(config.owner)!.id,
    };
    const client = existing
      ? await prisma.clienteAgencia.update({ where: { id: existing.id }, data })
      : await prisma.clienteAgencia.create({
          data: { agenciaId: agency.id, nome: config.nome, ...data },
        });
    clients.set(config.key, client);
  }

  const projects = new Map<string, { id: string; clienteId: string }>();
  for (const config of projectConfigs) {
    const project = await prisma.projeto.create({
      data: {
        agenciaId: agency.id,
        clienteId: clients.get(config.client)!.id,
        equipeId: teams.get(config.team)!.id,
        responsavelId: users.get(config.owner)!.id,
        nome: config.nome,
        status: config.status,
        saude: config.health,
        progresso: config.progress,
        dataInicio: dateAtNoon(-35),
        prazo: dateAtNoon(config.deadline),
        horasPrevistas: config.planned,
        proximaEntrega: config.delivery,
        dataProximaEntrega: dateAtNoon(config.deliveryOffset),
        impedimento: config.blocker ?? null,
        idExterno: `${DEMO_PROJECT_PREFIX}${config.key}`,
        fonteImportacao: "demo_manual",
        participantes: {
          create: config.members.map((key) => ({
            usuarioId: users.get(key)!.id,
            papel: people.find((person) => person.key === key)?.funcao ?? "Participante",
          })),
        },
        atualizacoes: {
          create: {
            autorId: users.get(config.owner)!.id,
            progresso: config.progress,
            saude: config.health,
            proximaEntrega: config.delivery,
            dataProximaEntrega: dateAtNoon(config.deliveryOffset),
            impedimento: config.blocker ?? null,
          },
        },
      },
    });
    projects.set(config.key, project);
  }

  const weeklyHours: Record<string, Array<[string, number, boolean]>> = {
    ceo: [["porto-inverno", 6, true], ["radiola-interno", 4, false]],
    mariana: [["porto-inverno", 18, true], ["radiola-interno", 8, false], ["cholet-campanha", 7, true]],
    rafael: [["cholet-campanha", 14, true], ["fitness-leads", 10, true], ["porto-inverno", 12, true]],
    bianca: [["solar-site", 16, true], ["tolas-rebranding", 12, true], ["madu-catalogo", 8, true]],
    lucas: [["tolas-rebranding", 22, true], ["cholet-campanha", 14, true], ["porto-inverno", 8, true]],
    camila: [["tolas-rebranding", 17, true], ["cholet-campanha", 14, true], ["madu-social", 8, true], ["madu-catalogo", 7, true]],
    pedro: [["solar-site", 18, true], ["tolas-rebranding", 14, true], ["radiola-interno", 6, false]],
    ana: [["cholet-campanha", 13, true], ["fitness-leads", 9, true], ["solar-site", 8, true], ["radiola-interno", 5, false]],
    joao: [["cholet-campanha", 24, true], ["tolas-rebranding", 12, true]],
    fernanda: [["cholet-performance", 18, true], ["fitness-leads", 17, true]],
    diego: [["cholet-performance", 21, true], ["fitness-leads", 20, true]],
    bruna: [["cholet-performance", 18, true], ["tolas-crm", 12, true], ["fitness-leads", 8, true]],
    caio: [["cholet-performance", 15, true], ["fitness-leads", 13, true], ["solar-site", 8, true], ["tolas-crm", 6, true]],
    juliana: [["madu-social", 21, true], ["clinica-conteudo", 14, true]],
    larissa: [["madu-social", 18, true], ["cafe-video", 8, true], ["clinica-conteudo", 8, true], ["madu-catalogo", 6, true]],
    renato: [["madu-social", 17, true], ["clinica-conteudo", 14, true], ["tolas-crm", 7, true]],
    isabela: [["madu-social", 18, true], ["tolas-crm", 8, true]],
    thiago: [["cafe-video", 19, true], ["porto-inverno", 17, true]],
    gabriel: [["cafe-video", 18, true], ["tolas-rebranding", 11, true], ["clinica-conteudo", 7, true], ["madu-catalogo", 8, true]],
    // Paula fica sem apontamento na semana para demonstrar o alerta.
  };

  const weekDays = currentWeekDays();
  let hourIndex = 0;
  for (const [userKey, allocations] of Object.entries(weeklyHours)) {
    const user = users.get(userKey)!;
    for (const [projectKey, totalHours, billable] of allocations) {
      const project = projects.get(projectKey)!;
      const entries = Math.min(weekDays.length, Math.max(1, Math.ceil(totalHours / 8)));
      const base = Math.floor((totalHours / entries) * 4) / 4;
      let allocated = 0;

      for (let index = 0; index < entries; index++) {
        const hours = index === entries - 1 ? totalHours - allocated : base;
        allocated += hours;
        await prisma.apontamentoHora.create({
          data: {
            agenciaId: agency.id,
            usuarioId: user.id,
            nomeColaborador: user.nome,
            clienteId: project.clienteId,
            projetoId: project.id,
            data: weekDays[index],
            horas: hours,
            tipoAtividade: billable ? "execucao_projeto" : "atividade_interna",
            faturavel: billable,
            observacao: "Apontamento ficticio para demonstracao do modulo.",
            status: "APROVADO",
            idExterno: `${DEMO_HOURS_PREFIX}${hourIndex++}`,
            fonteImportacao: "demo_manual",
          },
        });
      }
    }
  }

  console.log(`Agencia: ${agency.nomeFantasia ?? agency.nome}`);
  console.log("20 colaboradores no total");
  console.log(`${teamConfigs.length} equipes`);
  console.log(`${clientConfigs.length} clientes`);
  console.log(`${projectConfigs.length} projetos ativos`);
  console.log(`${hourIndex} apontamentos ficticios`);
  console.log("\nAcesse: http://localhost:3000/agencia/equipes");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
