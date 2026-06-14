/**
 * Popula Performance de Campanhas da Radiola WiFi para apresentacao.
 * Pode ser executado novamente sem duplicar campanhas ou metricas.
 *
 * Execute: npm run db:seed-radiolawifi-campanhas
 */

import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type CampanhaDemo = {
  key: string;
  cliente: string;
  nome: string;
  objetivo: string;
  canal: string;
  orcamento: number;
  custoOperacional: number;
  investimento: number;
  receita: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  leads: number;
  conversoes: number;
  modelo: string;
  fonte: string;
  diagnostico: string;
  recomendacao: string;
  proximaAcao: string;
};

const campanhas: CampanhaDemo[] = [
  {
    key: "cholet-alto-verao-meta",
    cliente: "Cholet Moda",
    nome: "Alto Verao | Conversao Meta",
    objetivo: "Venda da nova colecao no e-commerce",
    canal: "Meta Ads",
    orcamento: 18000,
    custoOperacional: 3200,
    investimento: 12640,
    receita: 68420,
    impressoes: 912000,
    alcance: 338000,
    cliques: 21480,
    leads: 1860,
    conversoes: 284,
    modelo: "Ultimo clique por UTM",
    fonte: "Meta Ads + checkout Cholet",
    diagnostico: "Criativos de produto em video concentram 61% da receita atribuida.",
    recomendacao: "Escalar os conjuntos vencedores preservando limite de frequencia.",
    proximaAcao: "Aumentar 20% do orcamento nos videos e renovar os dois anuncios saturados.",
  },
  {
    key: "cholet-google-shopping",
    cliente: "Cholet Moda",
    nome: "Shopping | Produtos de Giro",
    objetivo: "Capturar demanda por produtos com estoque",
    canal: "Google Ads",
    orcamento: 8000,
    custoOperacional: 1400,
    investimento: 6180,
    receita: 17840,
    impressoes: 228000,
    alcance: 141000,
    cliques: 8840,
    leads: 720,
    conversoes: 91,
    modelo: "Ultimo clique por UTM",
    fonte: "Google Ads + checkout Cholet",
    diagnostico: "A campanha vende, mas produtos sem grade completa elevam o custo por compra.",
    recomendacao: "Manter a campanha e excluir itens com ruptura ou baixa margem.",
    proximaAcao: "Sincronizar lista de estoque e separar campanha por margem.",
  },
  {
    key: "tolas-reposicionamento",
    cliente: "Tolas Moda Masculina",
    nome: "Reposicionamento | Nova Identidade",
    objetivo: "Apresentar a nova marca e gerar visitas qualificadas",
    canal: "Meta Ads",
    orcamento: 14000,
    custoOperacional: 4800,
    investimento: 9860,
    receita: 7240,
    impressoes: 1480000,
    alcance: 624000,
    cliques: 11300,
    leads: 410,
    conversoes: 34,
    modelo: "Cupom da campanha",
    fonte: "Meta Ads + cupons do PDV",
    diagnostico: "O alcance esta forte, mas a oferta nao conduz o publico para compra.",
    recomendacao: "Mudar de rota: reduzir verba de alcance e testar oferta por categoria.",
    proximaAcao: "Lancar teste de 7 dias com kits e cupom por grupo de produto.",
  },
  {
    key: "madu-volta-aulas",
    cliente: "Madu Kids",
    nome: "Volta as Aulas | Leads e Loja",
    objetivo: "Gerar conversas no WhatsApp e vendas na loja",
    canal: "Meta Ads + WhatsApp",
    orcamento: 7500,
    custoOperacional: 1800,
    investimento: 5120,
    receita: 3940,
    impressoes: 402000,
    alcance: 176000,
    cliques: 6860,
    leads: 522,
    conversoes: 29,
    modelo: "Cupom informado no atendimento",
    fonte: "Meta Ads + planilha de atendimento",
    diagnostico: "Ha volume de conversas, mas a passagem de lead para venda esta baixa.",
    recomendacao: "Mudar de rota no atendimento antes de aumentar a midia.",
    proximaAcao: "Criar roteiro comercial e medir tempo de primeira resposta por atendente.",
  },
  {
    key: "nordeste-franquias",
    cliente: "Nordeste Fitness",
    nome: "Expansao | Leads de Franquia",
    objetivo: "Captar candidatos qualificados a franqueado",
    canal: "Google + LinkedIn",
    orcamento: 12000,
    custoOperacional: 2600,
    investimento: 7420,
    receita: 14200,
    impressoes: 316000,
    alcance: 204000,
    cliques: 5260,
    leads: 184,
    conversoes: 11,
    modelo: "CRM por origem do lead",
    fonte: "Plataformas de midia + CRM comercial",
    diagnostico: "O CPL esta controlado, mas poucos leads chegam a reuniao de diagnostico.",
    recomendacao: "Continuar o teste com qualificacao mais forte no formulario.",
    proximaAcao: "Adicionar faixa de investimento e prazo de abertura ao formulario.",
  },
  {
    key: "cafe-almoco",
    cliente: "Cafe do Patio",
    nome: "Almoco Executivo | Raio Local",
    objetivo: "Aumentar movimento no almoco de segunda a quinta",
    canal: "Meta Ads + Google Maps",
    orcamento: 5000,
    custoOperacional: 900,
    investimento: 3780,
    receita: 18640,
    impressoes: 194000,
    alcance: 82000,
    cliques: 7140,
    leads: 960,
    conversoes: 346,
    modelo: "Cupom no caixa",
    fonte: "Midia + fechamento diario do caixa",
    diagnostico: "O combo de quarta-feira tem melhor custo e maior recorrencia.",
    recomendacao: "Escalar mantendo foco geografico e replicar a oferta na quinta.",
    proximaAcao: "Criar variacao do combo para quinta e aumentar verba em 15%.",
  },
  {
    key: "porto-ferias",
    cliente: "Porto Beach Hotel",
    nome: "Ferias | Reservas Diretas",
    objetivo: "Aumentar reservas diretas para julho",
    canal: "Google Ads + Meta Ads",
    orcamento: 16000,
    custoOperacional: 2800,
    investimento: 10240,
    receita: 31100,
    impressoes: 568000,
    alcance: 286000,
    cliques: 12400,
    leads: 638,
    conversoes: 47,
    modelo: "Reserva com origem UTM",
    fonte: "Midia + motor de reservas",
    diagnostico: "Google captura a demanda pronta; Meta assiste a decisao, mas converte menos.",
    recomendacao: "Manter a estrategia e redistribuir verba para termos de maior intencao.",
    proximaAcao: "Mover 10% de Meta para Google e testar pacote familia.",
  },
];

function diasDoMes(quantidade: number) {
  const hoje = new Date();
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1, 12);
  return Array.from({ length: quantidade }, (_, indice) => {
    const data = new Date(primeiro);
    data.setDate(1 + indice * 2);
    return data;
  });
}

function parcela(total: number, indice: number, quantidade: number) {
  const pesos = [0.09, 0.11, 0.12, 0.13, 0.14, 0.14, 0.13, 0.14];
  if (indice === quantidade - 1) {
    const anteriores = pesos
      .slice(0, quantidade - 1)
      .reduce((soma, peso) => soma + Math.round(total * peso), 0);
    return Math.max(0, total - anteriores);
  }
  return Math.round(total * pesos[indice]);
}

async function main() {
  const agencia = await prisma.empresa.findFirst({
    where: { slug: "radiolawifi", tipo: "AGENCIA" },
  });
  if (!agencia) throw new Error("Radiola WiFi nao encontrada.");

  const clientes = await prisma.clienteAgencia.findMany({
    where: { agenciaId: agencia.id },
  });
  const clientesPorNome = new Map(clientes.map((cliente) => [cliente.nome, cliente]));
  const datas = diasDoMes(8);

  for (const item of campanhas) {
    const cliente = clientesPorNome.get(item.cliente);
    if (!cliente) {
      console.warn(`Cliente ignorado: ${item.cliente}`);
      continue;
    }

    const campanha = await prisma.campanhaMarketing.upsert({
      where: {
        agenciaId_idExterno: {
          agenciaId: agencia.id,
          idExterno: `demo-radiola-${item.key}`,
        },
      },
      update: {
        clienteId: cliente.id,
        nome: item.nome,
        objetivo: item.objetivo,
        canal: item.canal,
        status: "ATIVA",
        dataInicio: datas[0],
        dataFim: null,
        orcamento: item.orcamento,
        custoOperacional: item.custoOperacional,
        modeloAtribuicao: item.modelo,
        fonteDados: item.fonte,
        diagnostico: item.diagnostico,
        recomendacao: item.recomendacao,
        proximaAcao: item.proximaAcao,
      },
      create: {
        agenciaId: agencia.id,
        clienteId: cliente.id,
        idExterno: `demo-radiola-${item.key}`,
        nome: item.nome,
        objetivo: item.objetivo,
        canal: item.canal,
        status: "ATIVA",
        dataInicio: datas[0],
        orcamento: item.orcamento,
        custoOperacional: item.custoOperacional,
        modeloAtribuicao: item.modelo,
        fonteDados: item.fonte,
        diagnostico: item.diagnostico,
        recomendacao: item.recomendacao,
        proximaAcao: item.proximaAcao,
      },
    });

    for (const [indice, data] of datas.entries()) {
      await prisma.metricaCampanha.upsert({
        where: { campanhaId_data: { campanhaId: campanha.id, data } },
        update: {
          investimento: parcela(item.investimento, indice, datas.length),
          receitaAtribuida: parcela(item.receita, indice, datas.length),
          impressoes: parcela(item.impressoes, indice, datas.length),
          alcance: parcela(item.alcance, indice, datas.length),
          cliques: parcela(item.cliques, indice, datas.length),
          leads: parcela(item.leads, indice, datas.length),
          conversoes: parcela(item.conversoes, indice, datas.length),
        },
        create: {
          campanhaId: campanha.id,
          data,
          investimento: parcela(item.investimento, indice, datas.length),
          receitaAtribuida: parcela(item.receita, indice, datas.length),
          impressoes: parcela(item.impressoes, indice, datas.length),
          alcance: parcela(item.alcance, indice, datas.length),
          cliques: parcela(item.cliques, indice, datas.length),
          leads: parcela(item.leads, indice, datas.length),
          conversoes: parcela(item.conversoes, indice, datas.length),
        },
      });
    }
  }

  console.log(`${campanhas.length} campanhas demonstrativas preparadas para a Radiola WiFi.`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
