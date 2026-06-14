import { prisma } from "@/lib/prisma";

export interface DadosOCRExtraidos {
  data?: string;
  valor?: number;
  fornecedor?: string;
  documento?: string;
  descricao?: string;
  formaPagamento?: string;
  categoria?: string;
  confianca?: number;
}

export async function processarImagemOCR(
  empresaId: string,
  nomeArquivo: string,
  urlArquivo: string,
  textoExtraido: string
): Promise<DadosOCRExtraidos> {
  // Este é um placeholder para integração com OCR real
  // Pode ser implementado com Tesseract.js, Google Vision API, etc.
  
  const dadosExtraidos: DadosOCRExtraidos = {
    confianca: 0.5, // Placeholder
  };

  // Tentar extrair informações simples do texto
  const textoMin = textoExtraido.toLowerCase();

  // Procurar por valores (simplificado)
  const regexValor = /r?\$?\s*(\d+[.,]\d{2})/gi;
  const matches = textoMin.match(regexValor);
  if (matches && matches.length > 0) {
    const valorStr = matches[0].replace(/[^0-9,.-]/g, "").replace(",", ".");
    dadosExtraidos.valor = parseFloat(valorStr);
  }

  // Procurar por datas
  const regexData = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
  const matchData = textoExtraido.match(regexData);
  if (matchData) {
    dadosExtraidos.data = matchData[0];
  }

  return dadosExtraidos;
}

export async function criarComprovanteOCR(
  empresaId: string,
  nomeArquivo: string,
  urlArquivo: string,
  textoExtraido: string
) {
  const dados = await processarImagemOCR(empresaId, nomeArquivo, urlArquivo, textoExtraido);

  return prisma.comprovanteOCR.create({
    data: {
      empresaId,
      nomeArquivo,
      urlArquivo,
      textoExtraido,
      status: "pendente_confirmacao",
      confianca: dados.confianca,
    },
  });
}

export async function confirmarComprovanteOCR(
  comprovanteOCRId: string,
  dados: {
    dataMovimento: Date;
    valor: number;
    fornecedor: string;
    documento?: string;
    descricao?: string;
    formaPagamento?: string;
    categoria?: string;
  }
) {
  const comprovante = await prisma.comprovanteOCR.findUnique({
    where: { id: comprovanteOCRId },
  });

  if (!comprovante) {
    throw new Error("Comprovante não encontrado");
  }

  // Criar movimento
  const movimento = await prisma.movimentoOCR.create({
    data: {
      empresaId: comprovante.empresaId,
      comprovanteOCRId,
      dataMovimento: dados.dataMovimento,
      valor: dados.valor,
      fornecedor: dados.fornecedor,
      documento: dados.documento,
      descricao: dados.descricao,
      formaPagamento: dados.formaPagamento,
      categoria: dados.categoria,
      status: "confirmado",
    },
  });

  // Atualizar comprovante
  await prisma.comprovanteOCR.update({
    where: { id: comprovanteOCRId },
    data: { status: "confirmado" },
  });

  return movimento;
}

export async function descartarComprovanteOCR(comprovanteOCRId: string) {
  return prisma.comprovanteOCR.update({
    where: { id: comprovanteOCRId },
    data: { status: "descartado" },
  });
}

export async function obterComprovantesOCRPendentes(empresaId: string) {
  return prisma.comprovanteOCR.findMany({
    where: {
      empresaId,
      status: "pendente_confirmacao",
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function obterComprovantesOCR(empresaId: string) {
  return prisma.comprovanteOCR.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
    include: { movimentos: true },
  });
}

export async function obterMovimentosOCR(empresaId: string) {
  return prisma.movimentoOCR.findMany({
    where: { empresaId },
    orderBy: { dataMovimento: "desc" },
  });
}
