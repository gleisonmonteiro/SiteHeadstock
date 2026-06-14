import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import {
  obterMeta,
  obterMetasVendedorMesAno,
  obterVendedoresUnicos,
  salvarMeta,
} from "@/services/metaService";
import { exigirAcessoDecisao } from "@/lib/access";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const mes = request.nextUrl.searchParams.get("mes");
    const ano = request.nextUrl.searchParams.get("ano");

    if (!mes || !ano) {
      return NextResponse.json(
        { erro: "Mês e ano são obrigatórios" },
        { status: 400 }
      );
    }

    const [metaGeral, metasVendedor, vendedores] = await Promise.all([
      obterMeta(empresaId, Number(mes), Number(ano)),
      obterMetasVendedorMesAno(empresaId, Number(mes), Number(ano)),
      obterVendedoresUnicos(empresaId),
    ]);

    return NextResponse.json({ metaGeral, metasVendedor, vendedores });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter metas");
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const { mes, ano, valorMeta, tipo } = await request.json();

    if (!mes || !ano || !valorMeta) {
      return NextResponse.json(
        { erro: "Dados obrigatórios faltando" },
        { status: 400 }
      );
    }

    if (tipo !== "geral") {
      return NextResponse.json(
        { erro: "Tipo de meta inválido" },
        { status: 400 }
      );
    }

    const meta = await salvarMeta(empresaId, mes, ano, valorMeta);
    return NextResponse.json({ sucesso: true, meta });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao salvar meta");
  }
}
