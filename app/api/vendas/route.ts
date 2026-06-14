import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterVendasPorEmpresa } from "@/services/importVendasService";

export async function GET(request: NextRequest) {
  try {
    const { empresaId } = await exigirUsuarioSessao(request);
    const vendas = await obterVendasPorEmpresa(empresaId);
    return NextResponse.json({ vendas });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter vendas");
  }
}
