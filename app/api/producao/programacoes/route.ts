import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { criarProgramacao, listarProgramacoes } from "@/services/producaoService";

const PAPEIS_PRODUCAO = ["COMPANY_OWNER", "COMPANY_MANAGER", "DATA_OPERATOR"];

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (!PAPEIS_PRODUCAO.includes(usuario.papel)) {
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
    if (!PAPEIS_PRODUCAO.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }
    const { nome, etapas } = await request.json();
    if (!nome || !Array.isArray(etapas)) {
      return NextResponse.json(
        { erro: "Nome e etapas são obrigatórios" },
        { status: 400 },
      );
    }
    const programacao = await criarProgramacao(usuario.empresaId, nome, etapas);
    return NextResponse.json({ programacao }, { status: 201 });
  } catch (erro) {
    if (erro instanceof Error) {
      const mensagens: Record<string, string> = {
        LIMITE_PROGRAMACOES: "A empresa pode ter no máximo 5 programações",
        PROGRAMACAO_INVALIDA: "Informe um nome e pelo menos duas etapas",
        ETAPAS_DUPLICADAS: "As etapas da programação não podem se repetir",
      };
      if (mensagens[erro.message]) {
        return NextResponse.json({ erro: mensagens[erro.message] }, { status: 400 });
      }
    }
    if (
      typeof erro === "object" &&
      erro !== null &&
      "code" in erro &&
      erro.code === "P2002"
    ) {
      return NextResponse.json(
        { erro: "Já existe uma programação com esse nome" },
        { status: 409 },
      );
    }
    return respostaErroApi(erro, "Erro ao criar programação");
  }
}
