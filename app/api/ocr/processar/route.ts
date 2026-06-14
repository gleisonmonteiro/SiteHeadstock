import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { exigirAcessoDecisao } from "@/lib/access";
import {
  confirmarComprovanteOCR,
  descartarComprovanteOCR,
} from "@/services/ocrService";

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const { comprovanteOCRId, acao, dados } = await request.json();

    if (!comprovanteOCRId || !acao) {
      return NextResponse.json(
        { erro: "Comprovante e ação são obrigatórios" },
        { status: 400 }
      );
    }

    const comprovante = await prisma.comprovanteOCR.findFirst({
      where: { id: comprovanteOCRId, empresaId },
      select: { id: true },
    });
    if (!comprovante) {
      return NextResponse.json(
        { erro: "Comprovante não encontrado" },
        { status: 404 }
      );
    }

    if (acao === "confirmar") {
      if (!dados?.valor || !dados?.fornecedor) {
        return NextResponse.json(
          { erro: "Valor e fornecedor são obrigatórios" },
          { status: 400 }
        );
      }

      const movimento = await confirmarComprovanteOCR(comprovanteOCRId, {
        dataMovimento: new Date(dados.dataMovimento),
        valor: Number(dados.valor),
        fornecedor: dados.fornecedor,
        documento: dados.documento,
        descricao: dados.descricao,
        formaPagamento: dados.formaPagamento,
        categoria: dados.categoria,
      });
      return NextResponse.json({ sucesso: true, movimento });
    }

    if (acao === "descartar") {
      await descartarComprovanteOCR(comprovanteOCRId);
      return NextResponse.json({ sucesso: true });
    }

    return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao processar comprovante");
  }
}
