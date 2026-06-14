import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { obterEquipeDetalhe } from "@/services/equipeService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.empresa.tipo !== "AGENCIA") {
      return NextResponse.json({ erro: "Acesso restrito a agências" }, { status: 403 });
    }
    const { id } = await params;
    const dados = await obterEquipeDetalhe(usuario.empresaId, id);
    if (!dados) return NextResponse.json({ erro: "Equipe não encontrada" }, { status: 404 });
    return NextResponse.json(dados);
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao buscar detalhe da equipe");
  }
}
