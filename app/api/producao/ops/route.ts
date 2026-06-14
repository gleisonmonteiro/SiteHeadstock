import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { listarOPs } from "@/services/producaoService";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const papeis = ["COMPANY_OWNER", "COMPANY_MANAGER", "DATA_OPERATOR"];
    if (!papeis.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const ops = await listarOPs(usuario.empresaId, status);
    return NextResponse.json({ ops });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao listar OPs");
  }
}
