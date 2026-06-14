import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import {
  importarVendas,
  normalizarLinha,
  validarColunas,
} from "@/services/importVendasService";
import { VendaInput } from "@/types";
import { exigirAcessoImportacao } from "@/lib/access";

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoImportacao(usuario.papel);
    const { empresaId } = usuario;
    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File;

    if (!arquivo) {
      return NextResponse.json(
        { erro: "Arquivo é obrigatório" },
        { status: 400 }
      );
    }

    const nomeArquivo = arquivo.name.toLowerCase();
    if (!nomeArquivo.endsWith(".xlsx") && !nomeArquivo.endsWith(".csv")) {
      return NextResponse.json(
        { erro: "Apenas arquivos .xlsx e .csv são aceitos" },
        { status: 400 }
      );
    }

    const buffer = await arquivo.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (dados.length < 2) {
      return NextResponse.json(
        { erro: "Arquivo vazio ou sem dados" },
        { status: 400 }
      );
    }

    const colunas = (dados[0] as string[]).map((coluna) =>
      String(coluna).toLowerCase().trim()
    );
    const validacao = validarColunas(colunas);
    if (!validacao.valido) {
      return NextResponse.json({ erro: validacao.erro }, { status: 400 });
    }

    const upload = await prisma.upload.create({
      data: {
        empresaId,
        nomeArquivo: arquivo.name,
        tipo: nomeArquivo.endsWith(".csv") ? "csv" : "excel",
        status: "processando",
        totalLinhas: dados.length - 1,
        linhasImportadas: 0,
        linhasErro: 0,
      },
    });

    const linhasValidas: VendaInput[] = [];
    for (let indice = 1; indice < dados.length; indice++) {
      const linha = normalizarLinha(dados[indice], colunas);
      if (linha) linhasValidas.push(linha);
    }

    const resultado = await importarVendas(
      empresaId,
      upload.id,
      linhasValidas
    );
    const valorTotal = linhasValidas.reduce(
      (total, venda) => total + venda.valor_venda,
      0
    );

    return NextResponse.json({
      sucesso: true,
      upload: {
        id: upload.id,
        nomeArquivo: arquivo.name,
        totalLinhas: resultado.totalProcessados,
        linhasImportadas: resultado.importadas,
        linhasErro: resultado.erros.length,
        valorTotal,
        vendedoresIdentificados: Array.from(
          new Set(linhasValidas.map((venda) => venda.vendedor))
        ),
      },
    });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao processar arquivo");
  }
}
