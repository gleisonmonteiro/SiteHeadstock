import { NextRequest, NextResponse } from "next/server";
import { criarTokenSessao, verificarSenha } from "@/lib/auth";
import { obterUsuarioPorEmail } from "@/services/usuarioService";

export async function POST(request: NextRequest) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { erro: "E-mail e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const usuario = await obterUsuarioPorEmail(email);

    if (
      !usuario ||
      usuario.status !== "ativo" ||
      usuario.empresa.status !== "ativo"
    ) {
      return NextResponse.json(
        { erro: "E-mail ou senha inválidos" },
        { status: 401 }
      );
    }

    const senhaValida = await verificarSenha(senha, usuario.senhaHash);
    if (!senhaValida) {
      return NextResponse.json(
        { erro: "E-mail ou senha inválidos" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      sucesso: true,
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

    response.cookies.set("auth_token", criarTokenSessao(usuario.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (erro) {
    console.error("Erro no login:", erro);
    return NextResponse.json(
      { erro: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
