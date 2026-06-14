import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterEquipeDetalhe } from "@/services/equipeService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const { id } = await params;
    const agenciaId =
      request.nextUrl.searchParams.get("agenciaId") ?? usuario.empresaId;
    const dados = await obterEquipeDetalhe(agenciaId, id);
    if (!dados) return NextResponse.json({ erro: "Equipe não encontrada" }, { status: 404 });
    return NextResponse.json(dados);
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao buscar detalhe da equipe");
  }
}
