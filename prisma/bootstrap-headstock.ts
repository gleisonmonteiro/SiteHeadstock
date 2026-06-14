import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function adicionarDias(data: Date, dias: number) {
  const novaData = new Date(data);
  novaData.setDate(novaData.getDate() + dias);
  return novaData;
}

function inicioSemana(data: Date) {
  const inicio = new Date(data);
  const dia = inicio.getDay();
  inicio.setDate(inicio.getDate() - (dia === 0 ? 6 : dia - 1));
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

async function main() {
  const empresa = await prisma.empresa.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!empresa) throw new Error("Nenhuma empresa existente foi encontrada");

  const proprietario = await prisma.usuario.findFirst({
    where: { empresaId: empresa.id },
    orderBy: { createdAt: "asc" },
  });
  if (!proprietario) throw new Error("Nenhum usuário existente foi encontrado");

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: {
      nome: "Agência Piloto Headstock",
      nomeFantasia: "Agência Piloto",
      slug: "agencia-piloto-headstock",
      tipo: "AGENCIA",
      status: "ativo",
    },
  });

  await prisma.usuario.update({
    where: { id: proprietario.id },
    data: {
      nome: "Gleison Monteiro",
      email: "gleison@headstock.com",
      papel: "AGENCY_CEO",
      status: "ativo",
    },
  });

  await prisma.apontamentoHora.deleteMany({ where: { agenciaId: empresa.id } });
  await prisma.atualizacaoProjeto.deleteMany({
    where: { projeto: { agenciaId: empresa.id } },
  });
  await prisma.projeto.deleteMany({ where: { agenciaId: empresa.id } });
  await prisma.clienteAgencia.deleteMany({ where: { agenciaId: empresa.id } });
  await prisma.equipeMembro.deleteMany({
    where: { equipe: { empresaId: empresa.id } },
  });
  await prisma.equipe.deleteMany({ where: { empresaId: empresa.id } });
  await prisma.usuario.deleteMany({
    where: {
      empresaId: empresa.id,
      email: { endsWith: "@headstock.demo" },
    },
  });

  const senhaHash = await bcrypt.hash("123456", 10);
  const colaboradores = await Promise.all(
    [
      ["Celso Andrade", "celso@headstock.demo", "AGENCY_MANAGER"],
      ["Marina Costa", "marina@headstock.demo", "AGENCY_MANAGER"],
      ["João Lima", "joao@headstock.demo", "COLLABORATOR"],
      ["Camila Rocha", "camila@headstock.demo", "COLLABORATOR"],
      ["Rafael Alves", "rafael@headstock.demo", "COLLABORATOR"],
      ["Bianca Souza", "bianca@headstock.demo", "COLLABORATOR"],
    ].map(([nome, email, papel]) =>
      prisma.usuario.create({
        data: {
          nome,
          email,
          papel:
            papel === "AGENCY_MANAGER" ? "AGENCY_MANAGER" : "COLLABORATOR",
          senhaHash,
          status: "ativo",
          empresaId: empresa.id,
        },
      })
    )
  );

  const [celso, marina, joao, camila, rafael, bianca] = colaboradores;

  const criacao = await prisma.equipe.create({
    data: {
      empresaId: empresa.id,
      nome: "Criação e Conteúdo",
      gestorId: marina.id,
      membros: {
        create: [
          { usuarioId: marina.id, funcao: "Gestora", capacidadeSemanal: 40 },
          { usuarioId: camila.id, funcao: "Designer", capacidadeSemanal: 40 },
          { usuarioId: bianca.id, funcao: "Social Media", capacidadeSemanal: 40 },
        ],
      },
    },
  });

  const performance = await prisma.equipe.create({
    data: {
      empresaId: empresa.id,
      nome: "Performance e Estratégia",
      gestorId: celso.id,
      membros: {
        create: [
          { usuarioId: celso.id, funcao: "Gestor", capacidadeSemanal: 40 },
          { usuarioId: joao.id, funcao: "Tráfego Pago", capacidadeSemanal: 40 },
          { usuarioId: rafael.id, funcao: "Analista", capacidadeSemanal: 40 },
        ],
      },
    },
  });

  const clientes = await Promise.all([
    prisma.clienteAgencia.create({
      data: {
        agenciaId: empresa.id,
        nome: "Moda Viva",
        responsavelId: marina.id,
        contratoValor: 8500,
        horasContratadas: 90,
      },
    }),
    prisma.clienteAgencia.create({
      data: {
        agenciaId: empresa.id,
        nome: "Clínica Horizonte",
        responsavelId: celso.id,
        contratoValor: 6200,
        horasContratadas: 60,
      },
    }),
    prisma.clienteAgencia.create({
      data: {
        agenciaId: empresa.id,
        nome: "Depósito Central",
        responsavelId: celso.id,
        contratoValor: 7400,
        horasContratadas: 72,
      },
    }),
    prisma.clienteAgencia.create({
      data: {
        agenciaId: empresa.id,
        nome: "Gelato Norte",
        responsavelId: marina.id,
        contratoValor: 4800,
        horasContratadas: 48,
      },
    }),
    prisma.clienteAgencia.create({
      data: {
        agenciaId: empresa.id,
        nome: "Gás Fácil",
        responsavelId: celso.id,
        contratoValor: 5500,
        horasContratadas: 55,
      },
    }),
  ]);

  const [moda, clinica, deposito, gelato, gas] = clientes;
  const hoje = new Date();
  const semana = inicioSemana(hoje);

  const projetos = await Promise.all([
    prisma.projeto.create({
      data: {
        agenciaId: empresa.id,
        clienteId: moda.id,
        equipeId: criacao.id,
        responsavelId: marina.id,
        nome: "Campanha Coleção Inverno",
        status: "EM_ANDAMENTO",
        saude: "ATENCAO",
        progresso: 52,
        dataInicio: adicionarDias(hoje, -24),
        prazo: adicionarDias(hoje, 6),
        horasPrevistas: 72,
        proximaEntrega: "Criativos finais para mídia",
        dataProximaEntrega: adicionarDias(hoje, 2),
        impedimento: "Fotos de dois produtos ainda não foram aprovadas.",
      },
    }),
    prisma.projeto.create({
      data: {
        agenciaId: empresa.id,
        clienteId: clinica.id,
        equipeId: performance.id,
        responsavelId: joao.id,
        nome: "Aquisição de Pacientes",
        status: "EM_ANDAMENTO",
        saude: "NORMAL",
        progresso: 68,
        dataInicio: adicionarDias(hoje, -31),
        prazo: adicionarDias(hoje, 12),
        horasPrevistas: 58,
        proximaEntrega: "Relatório de conversões",
        dataProximaEntrega: adicionarDias(hoje, 4),
      },
    }),
    prisma.projeto.create({
      data: {
        agenciaId: empresa.id,
        clienteId: deposito.id,
        equipeId: performance.id,
        responsavelId: rafael.id,
        nome: "Giro de Estoque Parado",
        status: "EM_ANDAMENTO",
        saude: "CRITICO",
        progresso: 38,
        dataInicio: adicionarDias(hoje, -28),
        prazo: adicionarDias(hoje, 3),
        horasPrevistas: 64,
        proximaEntrega: "Plano promocional por categoria",
        dataProximaEntrega: adicionarDias(hoje, 1),
        impedimento: "Planilha de estoque recebida sem custo e data de entrada.",
      },
    }),
    prisma.projeto.create({
      data: {
        agenciaId: empresa.id,
        clienteId: gelato.id,
        equipeId: criacao.id,
        responsavelId: bianca.id,
        nome: "Calendário de Conteúdo Sazonal",
        status: "EM_ANDAMENTO",
        saude: "NORMAL",
        progresso: 74,
        dataInicio: adicionarDias(hoje, -18),
        prazo: adicionarDias(hoje, 9),
        horasPrevistas: 42,
        proximaEntrega: "Programação da próxima quinzena",
        dataProximaEntrega: adicionarDias(hoje, 5),
      },
    }),
    prisma.projeto.create({
      data: {
        agenciaId: empresa.id,
        clienteId: gas.id,
        equipeId: performance.id,
        responsavelId: celso.id,
        nome: "Expansão de Entregas por Bairro",
        status: "EM_ANDAMENTO",
        saude: "ATENCAO",
        progresso: 45,
        dataInicio: adicionarDias(hoje, -21),
        prazo: adicionarDias(hoje, 7),
        horasPrevistas: 50,
        proximaEntrega: "Mapa de demanda e campanha local",
        dataProximaEntrega: adicionarDias(hoje, 3),
        impedimento: "Faturamento por bairro ainda não foi consolidado.",
      },
    }),
  ]);

  const [projetoModa, projetoClinica, projetoDeposito, projetoGelato, projetoGas] =
    projetos;

  const apontamentos = [
    [marina.id, moda.id, projetoModa.id, 13, "Gestão e criação", true],
    [camila.id, moda.id, projetoModa.id, 18, "Design", true],
    [bianca.id, moda.id, projetoModa.id, 10, "Conteúdo", true],
    [joao.id, clinica.id, projetoClinica.id, 16, "Tráfego pago", true],
    [rafael.id, clinica.id, projetoClinica.id, 8, "Análise", true],
    [rafael.id, deposito.id, projetoDeposito.id, 31, "Estratégia comercial", true],
    [celso.id, deposito.id, projetoDeposito.id, 18, "Consultoria", true],
    [bianca.id, gelato.id, projetoGelato.id, 20, "Social media", true],
    [camila.id, gelato.id, projetoGelato.id, 12, "Design", true],
    [celso.id, gas.id, projetoGas.id, 15, "Estratégia", true],
    [joao.id, gas.id, projetoGas.id, 17, "Mídia local", true],
  ] as const;

  for (const [
    usuarioId,
    clienteId,
    projetoId,
    horas,
    tipoAtividade,
    faturavel,
  ] of apontamentos) {
    await prisma.apontamentoHora.create({
      data: {
        agenciaId: empresa.id,
        usuarioId,
        clienteId,
        projetoId,
        data: adicionarDias(semana, Math.floor(Math.random() * 5)),
        horas,
        tipoAtividade,
        faturavel,
        status: "APROVADO",
      },
    });
  }

  console.log("Headstock preparado com dados do Universo Agência.");
  console.log("Login: gleison@headstock.com");
  console.log("Senha: 123456");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
