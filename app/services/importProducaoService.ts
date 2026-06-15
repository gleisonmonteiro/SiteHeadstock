import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { criarOP } from "@/services/producaoService";

function excelParaData(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function ehSerialExcel(val: unknown): val is number {
  return typeof val === "number" && val > 40000 && val < 60000;
}

function converterData(valor: unknown): Date | null {
  if (ehSerialExcel(valor)) return excelParaData(valor);
  if (!valor) return null;
  const texto = String(valor).trim();
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const data = br
    ? new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
    : new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
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
    const primeiraExistente = await prisma.programacaoOP.findFirst({
      where: { empresaId, ativo: true },
      include: { etapas: { orderBy: { ordem: "asc" } } },
      orderBy: { createdAt: "asc" },
    });
    if (primeiraExistente) {
      return {
        programacaoId: primeiraExistente.id,
        etapas: primeiraExistente.etapas,
      };
    }
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
  usuarioId: string,
  programacaoSelecionadaId?: string,
): Promise<{ importadas: number; atualizadas: number; erros: number }> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const ws = workbook.Sheets[workbook.SheetNames[0]];
  const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  const formatoSimples = linhas.some(
    (linha) => "OP" in linha && ("Descrição" in linha || "Descricao" in linha),
  );
  if (formatoSimples) {
    const programacao =
      (programacaoSelecionadaId &&
        (await prisma.programacaoOP.findFirst({
          where: { id: programacaoSelecionadaId, empresaId, ativo: true },
        }))) ||
      (await prisma.programacaoOP.findFirst({
        where: { empresaId, ativo: true },
        orderBy: { createdAt: "asc" },
      }));
    if (!programacao) throw new Error("Crie uma programação antes de importar as OPs");

    let importadas = 0;
    let atualizadas = 0;
    let erros = 0;
    for (const linha of linhas) {
      try {
        const numero = String(linha.OP ?? "").trim();
        const descricao = String(linha["Descrição"] ?? linha.Descricao ?? "").trim();
        const quantidade = Number(linha.Quantidade ?? 0);
        const dataEnvio = converterData(linha["Data de Envio"]);
        const dataRetorno = converterData(
          linha["Data de Retorno"] ?? linha["Data de Retormo"],
        );
        if (!numero || !descricao || quantidade <= 0 || !dataEnvio) {
          erros++;
          continue;
        }
        const existente = await prisma.ordemProducao.findUnique({
          where: { empresaId_numero: { empresaId, numero } },
        });
        if (existente) {
          atualizadas++;
          continue;
        }
        await criarOP(empresaId, usuarioId, {
          numero,
          referencia: String(linha.Referencia ?? linha["Referência"] ?? "").trim(),
          descricao,
          quantidade,
          programacaoId: programacao.id,
          dataEnvio,
          dataRetornoPrevista: dataRetorno,
        });
        importadas++;
      } catch {
        erros++;
      }
    }
    return { importadas, atualizadas, erros };
  }

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

  const selecionada = programacaoSelecionadaId
    ? await prisma.programacaoOP.findFirst({
        where: { id: programacaoSelecionadaId, empresaId, ativo: true },
        include: { etapas: { orderBy: { ordem: "asc" } } },
      })
    : null;
  const { programacaoId, etapas } = selecionada
    ? { programacaoId: selecionada.id, etapas: selecionada.etapas }
    : await obterOuCriarProgramacaoPadrao(empresaId);
  const etapaCostExt = etapas.find((e) => e.nome === "COST. EXT.") ?? etapas[0];
  if (!etapaCostExt) throw new Error("A programação selecionada não possui etapas");

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
          dataEnvio: cabecalho.dataSaida,
          dataRetornoPrevista: cabecalho.dataPrevisaoRetorno,
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
              tipo: "ENTRADA",
              quantidade: qtdTotal,
              localDestino: cabecalho.oficina || null,
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
