import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import {
  gerarCardAbertura,
  gerarCardFechamento,
  obterCardsExecutivos,
} from "@/services/cardExecutivoService";
import { exigirAcessoDecisao } from "@/lib/access";

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const { tipo } = await request.json();

    if (!tipo) {
      return NextResponse.json(
        { erro: "Tipo é obrigatório" },
        { status: 400 }
      );
    }

    if (tipo === "abertura") {
      const card = await gerarCardAbertura(empresaId);
      return NextResponse.json({ sucesso: true, card });
    }
    if (tipo === "fechamento") {
      const card = await gerarCardFechamento(empresaId);
      return NextResponse.json({ sucesso: true, card });
    }

    return NextResponse.json(
      { erro: "Tipo de card inválido" },
      { status: 400 }
    );
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao gerar card");
  }
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const tipo = request.nextUrl.searchParams.get("tipo");
    const cards = await obterCardsExecutivos(empresaId, tipo || undefined);
    return NextResponse.json({ cards });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter cards");
  }
}
