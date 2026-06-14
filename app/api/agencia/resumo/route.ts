import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterResumoAgencia } from "@/services/agenciaService";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);

    const isMaster = ["MASTER_PLATFORM", "MASTER_CONSULTANT"].includes(usuario.papel);

    if (!isMaster && usuario.empresa.tipo !== "AGENCIA") {
      return NextResponse.json(
        { erro: "Este módulo está disponível para agências" },
        { status: 403 }
      );
    }

    // MASTER_PLATFORM/CONSULTANT recebe null → sem filtro por empresa (vê tudo)
    const agenciaId = isMaster ? null : usuario.empresaId;
    const resumo = await obterResumoAgencia(agenciaId);
    return NextResponse.json(resumo);
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter visão da agência");
  }
}
