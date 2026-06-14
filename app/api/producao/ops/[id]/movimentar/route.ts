import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { movimentarOP, concluirOP } from "@/services/producaoService";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const papeis = ["COMPANY_OWNER", "COMPANY_MANAGER", "DATA_OPERATOR"];
    if (!papeis.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { proximaEtapaId, concluir, observacao } = body;

    if (concluir) {
      await concluirOP(usuario.empresaId, id, usuario.id);
      return NextResponse.json({ sucesso: true, status: "CONCLUIDA" });
    }

    if (!proximaEtapaId) {
      return NextResponse.json({ erro: "proximaEtapaId é obrigatório" }, { status: 400 });
    }

    await movimentarOP(usuario.empresaId, id, proximaEtapaId, usuario.id, observacao);
    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao movimentar OP");
  }
}
