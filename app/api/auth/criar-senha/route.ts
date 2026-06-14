import { NextRequest, NextResponse } from "next/server";
import { definirSenha } from "@/services/usuarioService";

export async function POST(request: NextRequest) {
  try {
    const { token, senha, confirmacaoSenha } = await request.json();

    if (!token || !senha || !confirmacaoSenha) {
      return NextResponse.json(
        { erro: "Todos os campos são obrigatórios" },
        { status: 400 }
      );
    }

    if (senha !== confirmacaoSenha) {
      return NextResponse.json(
        { erro: "Senhas não conferem" },
        { status: 400 }
      );
    }

    if (senha.length < 6) {
      return NextResponse.json(
        { erro: "Senha deve ter no mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    await definirSenha(token, senha);

    return NextResponse.json({
      sucesso: true,
      mensagem: "Senha criada com sucesso",
    });
  } catch (erro) {
    console.error("Erro ao criar senha:", erro);
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Erro interno do servidor" },
      { status: 400 }
    );
  }
}
