export type DashboardModuleId =
  | "vendas"
  | "produtos"
  | "estoque"
  | "receber"
  | "pagar"
  | "lojas";

export interface DashboardModule {
  id: DashboardModuleId;
  titulo: string;
  tituloCurto: string;
  descricao: string;
  consultaTotvs: string;
  dominioCanonico: string;
  kpis: string[];
  visuais: Array<{
    titulo: string;
    descricao: string;
  }>;
  filtros: string[];
  usoAgencia: string;
}

export const dashboardModules: DashboardModule[] = [
  {
    id: "vendas",
    titulo: "Faturamento e Vendas",
    tituloCurto: "Vendas",
    descricao:
      "Receita, volume, ticket, desempenho comercial e comportamento das vendas.",
    consultaTotvs: "venda.txt",
    dominioCanonico: "Venda, item, cliente, vendedor, unidade e produto",
    kpis: [
      "Faturamento líquido",
      "Quantidade vendida",
      "Ticket médio",
      "Margem estimada",
      "Meta atingida",
      "Clientes ativos",
    ],
    visuais: [
      {
        titulo: "Evolução e projeção",
        descricao: "Vendas por dia, tendência, comparação e projeção do período.",
      },
      {
        titulo: "Mix comercial",
        descricao: "Produtos, categorias, vendedores, clientes, canais e lojas.",
      },
      {
        titulo: "Descontos e devoluções",
        descricao: "Impacto financeiro, frequência e pontos fora do padrão.",
      },
    ],
    filtros: ["Período", "Loja", "Produto", "Categoria", "Vendedor", "Cliente"],
    usoAgencia:
      "Medir resultado comercial antes e depois de campanhas e identificar quedas por produto, loja ou público.",
  },
  {
    id: "produtos",
    titulo: "Produtos e Mix",
    tituloCurto: "Produtos",
    descricao:
      "Estrutura do catálogo, preços, custos, coleções, grades e qualidade cadastral.",
    consultaTotvs: "bi_produto.txt",
    dominioCanonico: "Produto, SKU, categoria, marca, coleção, cor e tamanho",
    kpis: [
      "SKUs ativos",
      "Produtos sem classificação",
      "Markup médio",
      "Margem potencial",
      "Cobertura de grade",
      "Cadastros recentes",
    ],
    visuais: [
      {
        titulo: "Árvore do mix",
        descricao: "Setor, departamento, grupo, subgrupo, linha, marca e coleção.",
      },
      {
        titulo: "Preço e custo",
        descricao: "Distribuição de preço, custo, markup e divergências cadastrais.",
      },
      {
        titulo: "Grade e coleção",
        descricao: "Cobertura por referência, cor, tamanho, gênero e coleção.",
      },
    ],
    filtros: ["Setor", "Departamento", "Marca", "Coleção", "Referência", "Grade"],
    usoAgencia:
      "Selecionar produtos e coleções para campanhas com base no mix real e na prioridade comercial.",
  },
  {
    id: "estoque",
    titulo: "Estoque e Abastecimento",
    tituloCurto: "Estoque",
    descricao:
      "Valor imobilizado, cobertura, ruptura, excesso, giro e oportunidade de reposição.",
    consultaTotvs: "estoque.txt",
    dominioCanonico: "Posição de estoque por produto, unidade e data",
    kpis: [
      "Valor em estoque",
      "Unidades disponíveis",
      "Cobertura em dias",
      "Rupturas",
      "Estoque parado",
      "Excesso de estoque",
    ],
    visuais: [
      {
        titulo: "Risco de ruptura",
        descricao: "Produtos sem saldo ou com cobertura abaixo da demanda esperada.",
      },
      {
        titulo: "Capital imobilizado",
        descricao: "Valor de estoque por loja, categoria, marca e coleção.",
      },
      {
        titulo: "Giro e envelhecimento",
        descricao: "Curva ABC, dias sem venda, excesso e sugestão de ação.",
      },
    ],
    filtros: ["Data", "Loja", "Produto", "Categoria", "Marca", "Coleção"],
    usoAgencia:
      "Direcionar campanhas para excesso e estoque parado sem promover itens em ruptura.",
  },
  {
    id: "receber",
    titulo: "Contas a Receber",
    tituloCurto: "A Receber",
    descricao:
      "Carteira de recebíveis, vencimentos, inadimplência e previsibilidade de caixa.",
    consultaTotvs: "contas a receber.txt",
    dominioCanonico: "Título a receber, cliente, vencimento, baixa e valores",
    kpis: [
      "Saldo a receber",
      "Vencido",
      "A vencer em 30 dias",
      "Inadimplência",
      "Prazo médio de recebimento",
      "Concentração por cliente",
    ],
    visuais: [
      {
        titulo: "Aging da carteira",
        descricao: "A vencer, vencido por faixa e evolução da inadimplência.",
      },
      {
        titulo: "Fluxo esperado",
        descricao: "Calendário de recebimentos e comparação entre previsto e realizado.",
      },
      {
        titulo: "Risco por cliente",
        descricao: "Concentração, atrasos recorrentes e maiores exposições.",
      },
    ],
    filtros: ["Vencimento", "Cliente", "Loja", "Situação", "Tipo de cobrança"],
    usoAgencia:
      "Contextualizar capacidade de investimento do cliente sem expor dados além do escopo autorizado.",
  },
  {
    id: "pagar",
    titulo: "Contas a Pagar",
    tituloCurto: "A Pagar",
    descricao:
      "Compromissos financeiros, vencimentos, fornecedores e pressão futura no caixa.",
    consultaTotvs: "contas a pagar.txt",
    dominioCanonico: "Título a pagar, fornecedor, vencimento, baixa e valores",
    kpis: [
      "Saldo a pagar",
      "Vencido",
      "A vencer em 30 dias",
      "Juros e multas",
      "Prazo médio de pagamento",
      "Concentração por fornecedor",
    ],
    visuais: [
      {
        titulo: "Agenda financeira",
        descricao: "Vencimentos por dia, semana e mês com pressão acumulada.",
      },
      {
        titulo: "Fornecedores",
        descricao: "Concentração, recorrência, atrasos e condições financeiras.",
      },
      {
        titulo: "Custo do atraso",
        descricao: "Multas, juros, descontos perdidos e pagamentos fora do prazo.",
      },
    ],
    filtros: ["Vencimento", "Fornecedor", "Loja", "Situação", "Documento"],
    usoAgencia:
      "Apoiar leitura de momento financeiro apenas quando esse escopo tiver sido autorizado pelo cliente.",
  },
  {
    id: "lojas",
    titulo: "Lojas e Unidades",
    tituloCurto: "Lojas",
    descricao:
      "Desempenho comparável por unidade, região e grupo empresarial.",
    consultaTotvs: "empresa.txt",
    dominioCanonico: "Empresa proprietária, unidade, região e grupo",
    kpis: [
      "Lojas ativas",
      "Receita por loja",
      "Ticket por loja",
      "Meta por loja",
      "Estoque por loja",
      "Participação regional",
    ],
    visuais: [
      {
        titulo: "Ranking de unidades",
        descricao: "Receita, crescimento, meta, margem e participação no grupo.",
      },
      {
        titulo: "Mapa regional",
        descricao: "Comparação entre regiões e concentração dos resultados.",
      },
      {
        titulo: "Diagnóstico da loja",
        descricao: "Vendas, estoque, financeiro e alertas reunidos por unidade.",
      },
    ],
    filtros: ["Região", "Grupo", "Loja", "Período"],
    usoAgencia:
      "Comparar resposta das campanhas por praça e priorizar lojas com maior oportunidade.",
  },
];

export function getDashboardModule(id: DashboardModuleId) {
  return dashboardModules.find((module) => module.id === id);
}
