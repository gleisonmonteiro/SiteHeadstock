import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { estornarMovimentacao } from "@/services/producaoService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    if (usuario.papel !== "COMPANY_OWNER") {
      return NextResponse.json(
        { erro: "Somente o responsável pela empresa pode estornar movimentações" },
        { status: 403 },
      );
    }
    const { id } = await params;
    const { motivo } = await request.json();
    const op = await estornarMovimentacao(
      usuario.empresaId,
      id,
      usuario.id,
      String(motivo ?? ""),
    );
    return NextResponse.json({ sucesso: true, op });
  } catch (erro) {
    if (erro instanceof Error) {
      const mensagens: Record<string, string> = {
        MOVIMENTACAO_NAO_ENCONTRADA: "Movimentação não encontrada",
        MOVIMENTACAO_ESTORNADA: "Essa movimentação já foi estornada",
        ESTORNO_FORA_DE_ORDEM:
          "Estorne primeiro a movimentação mais recente desta OP",
        MOTIVO_OBRIGATORIO: "Informe o motivo do estorno",
      };
      if (mensagens[erro.message]) {
        return NextResponse.json({ erro: mensagens[erro.message] }, { status: 400 });
      }
    }
    return respostaErroApi(erro, "Erro ao estornar movimentação");
  }
}
