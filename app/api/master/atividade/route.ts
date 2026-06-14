import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterAtividadeRecente } from "@/services/masterService";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.papel !== "MASTER_PLATFORM" && usuario.papel !== "MASTER_CONSULTANT") {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }
    const eventos = await obterAtividadeRecente();
    return NextResponse.json({ eventos });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter atividade");
  }
}
