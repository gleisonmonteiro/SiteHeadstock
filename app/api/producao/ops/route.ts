import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { criarOP, listarOPs } from "@/services/producaoService";

const PAPEIS_PRODUCAO = ["COMPANY_OWNER", "COMPANY_MANAGER", "DATA_OPERATOR"];

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (!PAPEIS_PRODUCAO.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const ops = await listarOPs(usuario.empresaId, status);
    return NextResponse.json({ ops });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao listar OPs");
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (!PAPEIS_PRODUCAO.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }

    const body = await request.json();
    const dataEnvio = body.dataEnvio ? new Date(`${body.dataEnvio}T12:00:00`) : null;
    const dataRetornoPrevista = body.dataRetornoPrevista
      ? new Date(`${body.dataRetornoPrevista}T12:00:00`)
      : null;
    if (!dataEnvio || Number.isNaN(dataEnvio.getTime())) {
      return NextResponse.json({ erro: "Data de envio é obrigatória" }, { status: 400 });
    }

    const op = await criarOP(usuario.empresaId, usuario.id, {
      numero: String(body.numero ?? ""),
      referencia: String(body.referencia ?? ""),
      descricao: String(body.descricao ?? ""),
      quantidade: Number(body.quantidade ?? 0),
      programacaoId: String(body.programacaoId ?? ""),
      dataEnvio,
      dataRetornoPrevista:
        dataRetornoPrevista && !Number.isNaN(dataRetornoPrevista.getTime())
          ? dataRetornoPrevista
          : null,
      localInicial: String(body.localInicial ?? ""),
    });
    return NextResponse.json({ op }, { status: 201 });
  } catch (erro) {
    if (erro instanceof Error) {
      const mensagens: Record<string, string> = {
        PROGRAMACAO_INVALIDA: "Programação inválida ou sem etapas",
        OP_INVALIDA: "Preencha OP, descrição e quantidade",
      };
      if (mensagens[erro.message]) {
        return NextResponse.json({ erro: mensagens[erro.message] }, { status: 400 });
      }
      if (erro.message.includes("Unique constraint")) {
        return NextResponse.json({ erro: "Já existe uma OP com esse número" }, { status: 409 });
      }
    }
    return respostaErroApi(erro, "Erro ao criar OP");
  }
}
