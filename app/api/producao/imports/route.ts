import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { importarProducaoExcel } from "@/services/importProducaoService";

export async function POST(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const papeis = ["COMPANY_OWNER", "COMPANY_MANAGER", "DATA_OPERATOR"];
    if (!papeis.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }

    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File;
    const programacaoId = String(formData.get("programacaoId") ?? "").trim() || undefined;

    if (!arquivo) {
      return NextResponse.json({ erro: "Arquivo é obrigatório" }, { status: 400 });
    }
    if (!arquivo.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ erro: "Apenas arquivos .xlsx são aceitos" }, { status: 400 });
    }

    const buffer = await arquivo.arrayBuffer();
    const resultado = await importarProducaoExcel(
      usuario.empresaId,
      buffer,
      usuario.id,
      programacaoId,
    );

    return NextResponse.json({ sucesso: true, ...resultado });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao importar produção");
  }
}
