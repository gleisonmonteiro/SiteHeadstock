import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { exigirAcessoDecisao } from "@/lib/access";
import { salvarMetaVendedor } from "@/services/metaService";

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const { vendedor, mes, ano, valorMeta } = await request.json();

    if (!vendedor || !mes || !ano || !valorMeta) {
      return NextResponse.json(
        { erro: "Dados obrigatórios faltando" },
        { status: 400 }
      );
    }

    const meta = await salvarMetaVendedor(
      empresaId,
      vendedor,
      mes,
      ano,
      valorMeta
    );
    return NextResponse.json({ sucesso: true, meta });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao salvar meta de vendedor");
  }
}
