import { prisma } from "@/lib/prisma";
import { VendaInput } from "@/types";

const COLUNAS_OBRIGATORIAS = [
  "data_venda",
  "valor_venda",
  "produto",
  "quantidade",
  "vendedor",
];

export function validarColunas(colunas: string[]): { valido: boolean; erro?: string } {
  const colunasMinusculas = colunas.map((c) => c.toLowerCase().trim());
  const faltam = COLUNAS_OBRIGATORIAS.filter(
    (col) => !colunasMinusculas.includes(col)
  );

  if (faltam.length > 0) {
    return {
      valido: false,
      erro: `Colunas obrigatórias faltando: ${faltam.join(", ")}`,
    };
  }

  return { valido: true };
}

export function normalizarLinha(linha: any, colunas: string[]): VendaInput | null {
  const colunasMinusculas = colunas.map((c) => c.toLowerCase().trim());

  try {
    const obj: any = {};
    colunas.forEach((col, idx) => {
      const colMin = col.toLowerCase().trim();
      obj[colMin] = linha[idx];
    });

    // Validar data
    const dataStr = String(obj.data_venda || "").trim();
    const dataObj = new Date(dataStr);
    if (isNaN(dataObj.getTime())) {
      return null;
    }

    // Converter números
    const valorVenda = parseFloat(obj.valor_venda);
    const quantidade = parseInt(obj.quantidade);

    if (isNaN(valorVenda) || isNaN(quantidade)) {
      return null;
    }

    return {
      data_venda: dataStr,
      valor_venda: valorVenda,
      produto: String(obj.produto).trim(),
      quantidade,
      vendedor: String(obj.vendedor).trim(),
      cliente: obj.cliente ? String(obj.cliente).trim() : undefined,
      forma_pagamento: obj.forma_pagamento ? String(obj.forma_pagamento).trim() : undefined,
      categoria: obj.categoria ? String(obj.categoria).trim() : undefined,
      marca: obj.marca ? String(obj.marca).trim() : undefined,
      custo: obj.custo ? parseFloat(obj.custo) : undefined,
      loja: obj.loja ? String(obj.loja).trim() : undefined,
      canal_venda: obj.canal_venda ? String(obj.canal_venda).trim() : undefined,
      desconto: obj.desconto ? parseFloat(obj.desconto) : undefined,
    };
  } catch {
    return null;
  }
}

export async function importarVendas(
  empresaId: string,
  uploadId: string,
  linhas: VendaInput[]
) {
  let importadas = 0;
  const erros = [];

  for (let i = 0; i < linhas.length; i++) {
    try {
      await prisma.venda.create({
        data: {
          empresaId,
          uploadId,
          dataVenda: new Date(linhas[i].data_venda),
          valorVenda: linhas[i].valor_venda,
          produto: linhas[i].produto,
          quantidade: linhas[i].quantidade,
          vendedor: linhas[i].vendedor,
          cliente: linhas[i].cliente,
          formaPagamento: linhas[i].forma_pagamento,
          categoria: linhas[i].categoria,
          marca: linhas[i].marca,
          custo: linhas[i].custo,
          loja: linhas[i].loja,
          canalVenda: linhas[i].canal_venda,
          desconto: linhas[i].desconto,
        },
      });
      importadas++;
    } catch (erro) {
      erros.push({ linha: i + 2, erro: String(erro) });
    }
  }

  await prisma.upload.update({
    where: { id: uploadId },
    data: {
      status: "sucesso",
      linhasImportadas: importadas,
      linhasErro: erros.length,
    },
  });

  return {
    importadas,
    erros,
    totalProcessados: linhas.length,
  };
}

export async function obterVendasPorEmpresa(empresaId: string) {
  return prisma.venda.findMany({
    where: { empresaId },
    orderBy: { dataVenda: "desc" },
  });
}

export async function obterUploadsPorEmpresa(empresaId: string) {
  return prisma.upload.findMany({
    where: { empresaId },
    orderBy: { createdAt: "desc" },
  });
}
