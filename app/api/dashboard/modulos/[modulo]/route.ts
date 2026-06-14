import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { kpisProdutos, kpisEstoque, kpisContasPagar, kpisContasReceber } from "@/services/modulosService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modulo: string }> }
) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const { modulo } = await params;

    const param = request.nextUrl.searchParams.get("empresaId");
    let empresaId = usuario.empresaId;

    if (param && param !== usuario.empresaId) {
      const isMaster = ["MASTER_PLATFORM", "MASTER_CONSULTANT"].includes(usuario.papel);
      if (isMaster) {
        empresaId = param;
      } else if (usuario.empresa.tipo === "AGENCIA") {
        const acesso = await prisma.clienteAgencia.findFirst({
          where: { agenciaId: usuario.empresaId, empresaConectadaId: param, status: "ativo" },
        });
        if (!acesso) {
          return NextResponse.json({ erro: "Acesso não autorizado a esta empresa" }, { status: 403 });
        }
        empresaId = param;
      } else {
        return NextResponse.json({ erro: "Acesso não autorizado" }, { status: 403 });
      }
    }

    switch (modulo) {
      case "produtos":
        return NextResponse.json(await kpisProdutos(empresaId));
      case "estoque":
        return NextResponse.json(await kpisEstoque(empresaId));
      case "pagar":
        return NextResponse.json(await kpisContasPagar(empresaId));
      case "receber":
        return NextResponse.json(await kpisContasReceber(empresaId));
      default:
        return NextResponse.json({ erro: "Módulo desconhecido" }, { status: 404 });
    }
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter KPIs do módulo");
  }
}
