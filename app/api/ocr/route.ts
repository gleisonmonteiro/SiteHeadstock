import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { exigirAcessoDecisao } from "@/lib/access";
import {
  criarComprovanteOCR,
  obterComprovantesOCR,
  obterComprovantesOCRPendentes,
} from "@/services/ocrService";

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const formData = await request.formData();
    const imagem = formData.get("imagem") as File;

    if (!imagem) {
      return NextResponse.json(
        { erro: "Imagem é obrigatória" },
        { status: 400 }
      );
    }

    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(imagem.type)) {
      return NextResponse.json(
        { erro: "Apenas imagens .jpg, .png e .webp são aceitas" },
        { status: 400 }
      );
    }

    const buffer = await imagem.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const urlArquivo = `data:${imagem.type};base64,${base64}`;
    const textoExtraido = "[OCR Placeholder] Texto seria extraído aqui";

    const comprovante = await criarComprovanteOCR(
      empresaId,
      imagem.name,
      urlArquivo,
      textoExtraido
    );

    return NextResponse.json({
      sucesso: true,
      comprovante: {
        id: comprovante.id,
        nomeArquivo: comprovante.nomeArquivo,
        status: comprovante.status,
        urlArquivo: comprovante.urlArquivo,
        confianca: comprovante.confianca,
      },
    });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao processar imagem");
  }
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const tipo = request.nextUrl.searchParams.get("tipo");
    const comprovantes =
      tipo === "pendentes"
        ? await obterComprovantesOCRPendentes(empresaId)
        : await obterComprovantesOCR(empresaId);

    return NextResponse.json({ comprovantes });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter comprovantes");
  }
}
