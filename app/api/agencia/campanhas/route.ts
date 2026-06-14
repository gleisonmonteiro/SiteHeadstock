import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import {
  atualizarEstrategiaCampanha,
  criarCampanha,
  gerarCardCampanha,
  obterPerformanceCampanhas,
  registrarMetricaCampanha,
} from "@/services/campanhaService";

function podeVer(papel: string) {
  return ["AGENCY_CEO", "AGENCY_MANAGER"].includes(papel);
}

function podeGerir(papel: string) {
  return ["AGENCY_CEO", "AGENCY_MANAGER"].includes(papel);
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.empresa.tipo !== "AGENCIA" || !podeVer(usuario.papel)) {
      return NextResponse.json(
        { erro: "Acesso restrito a gestao da agencia" },
        { status: 403 },
      );
    }
    const clienteId = request.nextUrl.searchParams.get("clienteId") || undefined;
    return NextResponse.json(
      await obterPerformanceCampanhas(usuario.empresaId, clienteId),
    );
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao carregar performance de campanhas");
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (
      usuario.empresa.tipo !== "AGENCIA" ||
      !podeGerir(usuario.papel)
    ) {
      return NextResponse.json(
        { erro: "Acesso restrito a gestao da agencia" },
        { status: 403 },
      );
    }
    const corpo = await request.json();
    switch (corpo.acao) {
      case "criar_campanha":
        return NextResponse.json(
          await criarCampanha(usuario.empresaId, corpo.dados),
          { status: 201 },
        );
      case "registrar_metrica":
        return NextResponse.json(
          await registrarMetricaCampanha(usuario.empresaId, corpo.dados),
          { status: 201 },
        );
      case "atualizar_estrategia":
        return NextResponse.json(
          await atualizarEstrategiaCampanha(usuario.empresaId, corpo.dados),
        );
      case "gerar_card":
        return NextResponse.json(
          await gerarCardCampanha(usuario.empresaId, corpo.dados.campanhaId),
          { status: 201 },
        );
      default:
        return NextResponse.json({ erro: "Acao invalida" }, { status: 400 });
    }
  } catch (erro) {
    if (
      erro instanceof Error &&
      ["CLIENTE_INVALIDO", "CAMPANHA_INVALIDA", "DADOS_OBRIGATORIOS"].includes(
        erro.message,
      )
    ) {
      return NextResponse.json(
        { erro: "Confira os dados informados e tente novamente." },
        { status: 400 },
      );
    }
    return respostaErroApi(erro, "Erro ao salvar performance de campanhas");
  }
}
