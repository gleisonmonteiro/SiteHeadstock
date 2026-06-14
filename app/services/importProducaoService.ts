import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

function excelParaData(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function ehSerialExcel(val: unknown): val is number {
  return typeof val === "number" && val > 40000 && val < 60000;
}

interface LinhaProducao {
  documento: string;
  oficina: string;
  referencia: string;
  produto: string;
  genero: string;
  cor: string;
  tamanho: string;
  quantidade: number;
  custoUnit: number;
  custoTotal: number;
  dataSaida: Date;
  dataPrevisaoRetorno: Date | null;
}

function normalizarLinha(row: Record<string, unknown>): LinhaProducao | null {
  try {
    const dataSaidaRaw = row["Data de saída"] ?? row["Data de saida"];
    const dataRetornoRaw = row["Data de previsão do retorno"] ?? row["Data de previsao do retorno"];
    const documento = String(row["Documento de saida de mão de obra"] ?? row["Documento de saida de mao de obra"] ?? "").trim();
    const oficina = String(row["Oficina"] ?? "").trim();
    const referencia = String(row["Referência"] ?? row["Referencia"] ?? "").trim();
    const produto = String(row["Produto"] ?? "").trim();

    if (!documento || !oficina || !produto) return null;

    const dataSaida = ehSerialExcel(dataSaidaRaw)
      ? excelParaData(dataSaidaRaw)
      : new Date(String(dataSaidaRaw));
    if (isNaN(dataSaida.getTime())) return null;

    const dataPrevisaoRetorno =
      dataRetornoRaw && ehSerialExcel(dataRetornoRaw)
        ? excelParaData(dataRetornoRaw)
        : dataRetornoRaw
        ? new Date(String(dataRetornoRaw))
        : null;

    return {
      documento,
      oficina,
      referencia,
      produto,
      genero: String(row["Gênero"] ?? row["Genero"] ?? "").trim(),
      cor: String(row["Cor"] ?? "").trim(),
      tamanho: String(row["Tamanho"] ?? "").trim(),
      quantidade: Number(row["Quantidade de saída"] ?? row["Quantidade de saida"] ?? 0),
      custoUnit: Number(row["Custo unitário saída"] ?? row["Custo unitario saida"] ?? 0),
      custoTotal: Number(row["Custo total saída"] ?? row["Custo total saida"] ?? 0),
      dataSaida,
      dataPrevisaoRetorno: dataPrevisaoRetorno && !isNaN(dataPrevisaoRetorno.getTime()) ? dataPrevisaoRetorno : null,
    };
  } catch {
    return null;
  }
}

async function obterOuCriarProgramacaoPadrao(empresaId: string): Promise<{ programacaoId: string; etapas: { id: string; nome: string; ordem: number }[] }> {
  const NOME_PADRAO = "Fluxo Padrão";
  const ETAPAS_PADRAO = [
    { nome: "CORTE", ordem: 1 },
    { nome: "COST. EXT.", ordem: 2 },
    { nome: "COST. INT.", ordem: 3 },
    { nome: "LIMPEZA", ordem: 4 },
    { nome: "ACABAMENTO", ordem: 5 },
    { nome: "DPA", ordem: 6 },
  ];

  let programacao = await prisma.programacaoOP.findFirst({
    where: { empresaId, nome: NOME_PADRAO },
    include: { etapas: { orderBy: { ordem: "asc" } } },
  });

  if (!programacao) {
    programacao = await prisma.programacaoOP.create({
      data: {
        empresaId,
        nome: NOME_PADRAO,
        etapas: { create: ETAPAS_PADRAO },
      },
      include: { etapas: { orderBy: { ordem: "asc" } } },
    });
  }

  return {
    programacaoId: programacao.id,
    etapas: programacao.etapas,
  };
}

export async function importarProducaoExcel(
  empresaId: string,
  buffer: ArrayBuffer,
  usuarioId: string
): Promise<{ importadas: number; atualizadas: number; erros: number }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  // Agrupar por documento
  const porDocumento = new Map<string, { cabecalho: LinhaProducao; itens: LinhaProducao[] }>();

  for (const row of linhas) {
    const linha = normalizarLinha(row);
    if (!linha) continue;

    if (!porDocumento.has(linha.documento)) {
      porDocumento.set(linha.documento, { cabecalho: linha, itens: [] });
    }
    porDocumento.get(linha.documento)!.itens.push(linha);
  }

  const { programacaoId, etapas } = await obterOuCriarProgramacaoPadrao(empresaId);
  const etapaCostExt = etapas.find((e) => e.nome === "COST. EXT.");
  if (!etapaCostExt) throw new Error("Etapa COST. EXT. não encontrada na programação padrão");

  let importadas = 0;
  let atualizadas = 0;
  let erros = 0;

  for (const [numero, { cabecalho, itens }] of porDocumento) {
    try {
      const qtdTotal = itens.reduce((s, i) => s + i.quantidade, 0);
      const custoTotal = itens.reduce((s, i) => s + i.custoTotal, 0);

      const opExistente = await prisma.ordemProducao.findUnique({
        where: { empresaId_numero: { empresaId, numero } },
      });

      if (opExistente) {
        atualizadas++;
        continue;
      }

      const op = await prisma.ordemProducao.create({
        data: {
          empresaId,
          programacaoId,
          numero,
          referencia: cabecalho.referencia || null,
          produto: cabecalho.produto,
          genero: cabecalho.genero || null,
          oficina: cabecalho.oficina || null,
          qtdTotal,
          custoTotal,
          status: "EM_ANDAMENTO",
          etapaAtualId: etapaCostExt.id,
          criadoPorId: usuarioId,
          itens: {
            create: itens.map((i) => ({
              cor: i.cor || null,
              tamanho: i.tamanho || null,
              quantidade: i.quantidade,
              custoUnit: i.custoUnit,
              custoTotal: i.custoTotal,
            })),
          },
          movimentacoes: {
            create: {
              etapaId: etapaCostExt.id,
              dataEntrada: cabecalho.dataSaida,
              dataPrevisaoRetorno: cabecalho.dataPrevisaoRetorno,
              usuarioId,
            },
          },
        },
      });

      if (op) importadas++;
    } catch {
      erros++;
    }
  }

  return { importadas, atualizadas, erros };
}
