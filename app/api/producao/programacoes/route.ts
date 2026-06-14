import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { listarProgramacoes, criarProgramacao } from "@/services/producaoService";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.papel === "DATA_OPERATOR") {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }
    const programacoes = await listarProgramacoes(usuario.empresaId);
    return NextResponse.json({ programacoes });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao listar programações");
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.papel !== "COMPANY_OWNER" && usuario.papel !== "COMPANY_MANAGER") {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }
    const { nome, etapas } = await request.json();
    if (!nome || !Array.isArray(etapas) || etapas.length === 0) {
      return NextResponse.json({ erro: "Nome e etapas são obrigatórios" }, { status: 400 });
    }
    const programacao = await criarProgramacao(usuario.empresaId, nome, etapas);
    return NextResponse.json({ programacao }, { status: 201 });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao criar programação");
  }
}
