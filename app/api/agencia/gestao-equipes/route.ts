import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import {
  atualizarProjetoManual,
  criarClienteManual,
  criarColaborador,
  criarEquipe,
  criarProjetoManual,
  obterGestaoEquipes,
  registrarHorasManual,
} from "@/services/gestaoEquipeService";

function podeGerir(papel: string) {
  return ["AGENCY_CEO", "AGENCY_MANAGER"].includes(papel);
}

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.empresa.tipo !== "AGENCIA") {
      return NextResponse.json({ erro: "Acesso restrito a agências" }, { status: 403 });
    }
    return NextResponse.json(await obterGestaoEquipes(usuario.empresaId));
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao carregar gestão de equipes");
  }
}

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.empresa.tipo !== "AGENCIA") {
      return NextResponse.json({ erro: "Acesso restrito à gestão da agência" }, { status: 403 });
    }
    const corpo = await request.json();
    const gestor = podeGerir(usuario.papel);
    if (!gestor && corpo.acao !== "registrar_horas") {
      return NextResponse.json({ erro: "Acesso restrito à gestão da agência" }, { status: 403 });
    }
    if (
      !gestor &&
      corpo.acao === "registrar_horas" &&
      corpo.dados?.usuarioId !== usuario.id
    ) {
      return NextResponse.json(
        { erro: "O colaborador pode registrar apenas as próprias horas" },
        { status: 403 },
      );
    }
    switch (corpo.acao) {
      case "criar_colaborador":
        return NextResponse.json(
          await criarColaborador(usuario.empresaId, corpo.dados),
          { status: 201 },
        );
      case "criar_equipe":
        return NextResponse.json(
          await criarEquipe(usuario.empresaId, corpo.dados),
          { status: 201 },
        );
      case "criar_cliente":
        return NextResponse.json(
          await criarClienteManual(usuario.empresaId, corpo.dados),
          { status: 201 },
        );
      case "criar_projeto":
        return NextResponse.json(
          await criarProjetoManual(usuario.empresaId, corpo.dados),
          { status: 201 },
        );
      case "registrar_horas":
        return NextResponse.json(
          await registrarHorasManual(usuario.empresaId, corpo.dados),
          { status: 201 },
        );
      case "atualizar_projeto":
        return NextResponse.json(
          await atualizarProjetoManual(usuario.empresaId, usuario.id, corpo.dados),
        );
      default:
        return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
    }
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao salvar gestão de equipes");
  }
}
