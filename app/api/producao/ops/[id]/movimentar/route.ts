import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { movimentarOP } from "@/services/producaoService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const papeis = ["COMPANY_OWNER", "COMPANY_MANAGER", "DATA_OPERATOR"];
    if (!papeis.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    if (!body.etapaOrigemId || !body.quantidade) {
      return NextResponse.json(
        { erro: "Origem e quantidade são obrigatórias" },
        { status: 400 },
      );
    }

    const op = await movimentarOP(usuario.empresaId, id, usuario.id, {
      etapaOrigemId: String(body.etapaOrigemId),
      localOrigem: body.localOrigem ? String(body.localOrigem) : null,
      etapaDestinoId: body.etapaDestinoId ? String(body.etapaDestinoId) : null,
      localDestino: body.localDestino ? String(body.localDestino) : null,
      quantidade: Number(body.quantidade),
      quantidadeDefeito: Number(body.quantidadeDefeito ?? 0),
      dataPrevisaoRetorno: body.dataPrevisaoRetorno
        ? new Date(`${body.dataPrevisaoRetorno}T12:00:00`)
        : null,
      observacao: body.observacao ? String(body.observacao) : undefined,
      concluir: Boolean(body.concluir),
    });
    return NextResponse.json({ sucesso: true, op });
  } catch (erro) {
    if (erro instanceof Error) {
      const mensagens: Record<string, string> = {
        OP_NAO_ENCONTRADA: "OP não encontrada",
        OP_FINALIZADA: "A OP já foi finalizada",
        QUANTIDADE_INVALIDA: "A quantidade supera o saldo disponível na origem",
        DEFEITOS_INVALIDOS: "A quantidade de defeitos é inválida",
        ETAPA_INVALIDA: "A movimentação deve seguir a próxima etapa da programação",
      };
      if (mensagens[erro.message]) {
        return NextResponse.json({ erro: mensagens[erro.message] }, { status: 400 });
      }
    }
    return respostaErroApi(erro, "Erro ao movimentar OP");
  }
}
