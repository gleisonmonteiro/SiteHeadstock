import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { exigirAcessoDecisao } from "@/lib/access";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    exigirAcessoDecisao(usuario.papel);

    const isMaster = ["MASTER_PLATFORM", "MASTER_CONSULTANT"].includes(usuario.papel);

    if (!isMaster && usuario.empresa.tipo !== "AGENCIA") {
      return NextResponse.json({ erro: "Acesso negado" }, { status: 403 });
    }

    const clientes = await prisma.clienteAgencia.findMany({
      where: {
        ...(isMaster ? {} : { agenciaId: usuario.empresaId }),
        status: "ativo",
        empresaConectadaId: { not: null },
      },
      include: {
        empresaConectada: { select: { id: true, nome: true, nomeFantasia: true } },
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(
      clientes.map((c) => ({
        clienteAgenciaId: c.id,
        empresaId: c.empresaConectadaId,
        nome: c.nome,
        nomeEmpresa: c.empresaConectada?.nomeFantasia || c.empresaConectada?.nome || c.nome,
      }))
    );
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao listar clientes conectados");
  }
}
