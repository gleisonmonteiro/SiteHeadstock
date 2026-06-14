import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterEquipes } from "@/services/equipeService";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.empresa.tipo !== "AGENCIA") {
      return NextResponse.json({ erro: "Acesso restrito a agências" }, { status: 403 });
    }
    const dados = await obterEquipes(usuario.empresaId);
    return NextResponse.json(dados);
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao buscar equipes");
  }
}
