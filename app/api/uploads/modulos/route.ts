import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import {
  importarProdutos,
  importarEstoque,
  importarContasPagar,
  importarContasReceber,
  normalizarLinhaVendaTotvs,
} from "@/services/importModulosService";
import { importarVendas } from "@/services/importVendasService";

// Mapeamento de nomes de aba para módulo
const ABA_MODULO: Record<string, string> = {
  vendas: "vendas",
  venda: "vendas",
  "faturamento": "vendas",
  produtos: "produtos",
  produto: "produtos",
  "bi_produto": "produtos",
  "catálogo": "produtos",
  "catalogo": "produtos",
  estoque: "estoque",
  estoques: "estoque",
  "contas a pagar": "pagar",
  "contaspagar": "pagar",
  "contas_pagar": "pagar",
  "a pagar": "pagar",
  "pagar": "pagar",
  "contas a receber": "receber",
  "contasreceber": "receber",
  "contas_receber": "receber",
  "a receber": "receber",
  "receber": "receber",
};

function identificarModulo(nomeAba: string): string | null {
  const normalizado = nomeAba.toLowerCase().trim();
  return ABA_MODULO[normalizado] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await exigirUsuarioSessao(request);
    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File;

    if (!arquivo) {
      return NextResponse.json({ erro: "Arquivo é obrigatório" }, { status: 400 });
    }

    const nomeArquivo = arquivo.name.toLowerCase();
    if (!nomeArquivo.endsWith(".xlsx")) {
      return NextResponse.json(
        { erro: "Upload multi-módulo aceita apenas .xlsx com abas nomeadas" },
        { status: 400 }
      );
    }

    const buffer = await arquivo.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const resultados: Record<string, { importados: number; erros: number; ignorado?: boolean }> = {};
    let uploadId: string | null = null;

    for (const nomeAba of workbook.SheetNames) {
      const modulo = identificarModulo(nomeAba);
      if (!modulo) {
        resultados[nomeAba] = { importados: 0, erros: 0, ignorado: true };
        continue;
      }

      const ws = workbook.Sheets[nomeAba];
      const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      if (linhas.length === 0) {
        resultados[nomeAba] = { importados: 0, erros: 0 };
        continue;
      }

      if (modulo === "vendas") {
        // Reutiliza lógica existente de vendas
        if (!uploadId) {
          const up = await prisma.upload.create({
            data: {
              empresaId,
              nomeArquivo: arquivo.name,
              tipo: "excel-modulos",
              status: "processando",
              totalLinhas: linhas.length,
              linhasImportadas: 0,
              linhasErro: 0,
            },
          });
          uploadId = up.id;
        }

        const vendasValidas = [];
        let errosVendas = 0;
        for (const row of linhas) {
          const v = normalizarLinhaVendaTotvs(row);
          if (!v) { errosVendas++; continue; }
          vendasValidas.push({
            data_venda: v.dataVenda.toISOString(),
            valor_venda: v.valorVenda,
            produto: v.produto,
            quantidade: v.quantidade,
            vendedor: v.vendedor,
            cliente: v.cliente,
            forma_pagamento: v.formaPagamento,
            categoria: v.categoria,
            marca: v.marca,
            custo: v.custo,
            loja: v.loja,
            desconto: v.desconto,
          });
        }
        const r = await importarVendas(empresaId, uploadId, vendasValidas);
        resultados[nomeAba] = { importados: r.importadas, erros: r.erros.length + errosVendas };

      } else if (modulo === "produtos") {
        const r = await importarProdutos(empresaId, linhas);
        resultados[nomeAba] = { importados: r.importados, erros: r.erros.length };

      } else if (modulo === "estoque") {
        const r = await importarEstoque(empresaId, linhas);
        resultados[nomeAba] = { importados: r.importados, erros: r.erros.length };

      } else if (modulo === "pagar") {
        const r = await importarContasPagar(empresaId, linhas);
        resultados[nomeAba] = { importados: r.importados, erros: r.erros.length };

      } else if (modulo === "receber") {
        const r = await importarContasReceber(empresaId, linhas);
        resultados[nomeAba] = { importados: r.importados, erros: r.erros.length };
      }
    }

    if (uploadId) {
      const totalImportados = Object.values(resultados).reduce((s, r) => s + r.importados, 0);
      const totalErros = Object.values(resultados).reduce((s, r) => s + r.erros, 0);
      await prisma.upload.update({
        where: { id: uploadId },
        data: { status: "sucesso", linhasImportadas: totalImportados, linhasErro: totalErros },
      });
    }

    return NextResponse.json({ sucesso: true, abas: resultados });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao processar arquivo multi-módulo");
  }
}
