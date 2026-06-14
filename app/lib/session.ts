import { NextRequest, NextResponse } from "next/server";
import { lerTokenSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function obterUsuarioSessao(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const usuarioId = lerTokenSessao(token);
  if (!usuarioId) return null;

  return prisma.usuario.findFirst({
    where: {
      id: usuarioId,
      status: "ativo",
      empresa: { status: "ativo" },
    },
    include: { empresa: true },
  });
}

export async function exigirUsuarioSessao(request: NextRequest) {
  const usuario = await obterUsuarioSessao(request);
  if (!usuario) throw new Error("NAO_AUTORIZADO");
  return usuario;
}

export function respostaErroApi(erro: unknown, mensagem: string) {
  if (erro instanceof Error && erro.message === "NAO_AUTORIZADO") {
    return NextResponse.json(
      { erro: "Sessão inválida ou expirada" },
      { status: 401 }
    );
  }
  if (erro instanceof Error && erro.message === "ACESSO_RESTRITO") {
    return NextResponse.json(
      { erro: "Acesso restrito ao seu perfil" },
      { status: 403 }
    );
  }

  console.error(mensagem, erro);
  return NextResponse.json({ erro: mensagem }, { status: 500 });
}
