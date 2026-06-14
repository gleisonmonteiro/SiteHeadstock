import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterAlertasMaster } from "@/services/masterService";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.papel !== "MASTER_PLATFORM" && usuario.papel !== "MASTER_CONSULTANT") {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }
    const data = await obterAlertasMaster();
    return NextResponse.json(data);
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter alertas");
  }
}
