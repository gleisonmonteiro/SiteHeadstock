import { NextRequest, NextResponse } from "next/server";
import { obterUsuarioSessao } from "@/lib/session";

export async function GET(request: NextRequest) {
  const usuario = await obterUsuarioSessao(request);

  if (!usuario) {
    return NextResponse.json(
      { erro: "Sessão inválida ou expirada" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      empresaId: usuario.empresaId,
      papel: usuario.papel,
      empresa: {
        nome: usuario.empresa.nome,
        tipo: usuario.empresa.tipo,
      },
    },
  });
}
