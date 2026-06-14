import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.papel !== "MASTER_PLATFORM" && usuario.papel !== "MASTER_CONSULTANT") {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }

    const { agenciaId, mensagem, titulo } = await request.json();
    if (!agenciaId || !mensagem) {
      return NextResponse.json({ erro: "agenciaId e mensagem são obrigatórios" }, { status: 400 });
    }

    const agencia = await prisma.empresa.findFirst({
      where: { id: agenciaId, tipo: "AGENCIA" },
      select: { id: true, nome: true },
    });
    if (!agencia) {
      return NextResponse.json({ erro: "Agência não encontrada" }, { status: 404 });
    }

    const card = await prisma.cardExecutivo.create({
      data: {
        empresaId: agenciaId,
        tipo: "ALERTA_MASTER",
        dataReferencia: new Date(),
        mensagem: `[${titulo ?? "Aviso Headstock"}]\n\n${mensagem}`,
      },
    });

    return NextResponse.json({ sucesso: true, cardId: card.id, agencia: agencia.nome });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao enviar card");
  }
}
