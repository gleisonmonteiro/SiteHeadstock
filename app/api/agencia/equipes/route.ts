import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterEquipes } from "@/services/equipeService";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const agenciaId =
      request.nextUrl.searchParams.get("agenciaId") ?? usuario.empresaId;
    const dados = await obterEquipes(agenciaId);
    return NextResponse.json(dados);
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao buscar equipes");
  }
}
