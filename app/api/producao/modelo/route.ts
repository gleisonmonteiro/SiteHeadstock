import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const usuario = await exigirUsuarioSessao(request);
    const papeis = ["COMPANY_OWNER", "COMPANY_MANAGER", "DATA_OPERATOR"];
    if (!papeis.includes(usuario.papel)) {
      return NextResponse.json({ erro: "Acesso restrito" }, { status: 403 });
    }

    const planilha = XLSX.utils.json_to_sheet([
      {
        OP: "OP-1001",
        Referencia: "REF-001",
        "Descrição": "Camiseta básica",
        Quantidade: 60,
        "Data de Envio": "15/06/2026",
        "Data de Retorno": "25/06/2026",
      },
    ]);
    planilha["!cols"] = [
      { wch: 16 },
      { wch: 18 },
      { wch: 32 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, planilha, "OPs");
    const arquivo = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(arquivo, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="modelo-importacao-ops.xlsx"',
      },
    });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao gerar modelo de OPs");
  }
}
