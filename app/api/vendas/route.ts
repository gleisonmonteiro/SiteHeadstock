import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterVendasPorEmpresa } from "@/services/importVendasService";
import { exigirAcessoDecisao } from "@/lib/access";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);
    const { empresaId } = usuario;
    const vendas = await obterVendasPorEmpresa(empresaId);
    return NextResponse.json({ vendas });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter vendas");
  }
}
