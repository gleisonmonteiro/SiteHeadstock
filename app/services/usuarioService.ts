import { prisma } from "@/lib/prisma";
import { hashSenha, gerarToken, gerarTokenExpirado } from "@/lib/auth";

export async function criarEmpresa(nome: string) {
  return prisma.empresa.create({
    data: { nome },
  });
}

export async function obterEmpresaPorId(id: string) {
  return prisma.empresa.findUnique({
    where: { id },
  });
}

export async function criarUsuario(
  nome: string,
  email: string,
  empresaId: string
) {
  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash: "", // Será definida quando o usuário criar a senha
      empresaId,
      status: "pendente_senha",
    },
  });

  const token = gerarToken();
  await prisma.tokenSenha.create({
    data: {
      usuarioId: usuario.id,
      token,
      expiraEm: gerarTokenExpirado(1440), // 24 horas
    },
  });

  return { usuario, token };
}

export async function definirSenha(token: string, novaSenha: string) {
  const tokenRecord = await prisma.tokenSenha.findUnique({
    where: { token },
  });

  if (!tokenRecord || tokenRecord.usado || tokenRecord.expiraEm < new Date()) {
    throw new Error("Token inválido ou expirado");
  }

  const senhaHash = await hashSenha(novaSenha);

  await prisma.usuario.update({
    where: { id: tokenRecord.usuarioId },
    data: {
      senhaHash,
      status: "ativo",
    },
  });

  await prisma.tokenSenha.update({
    where: { id: tokenRecord.id },
    data: { usado: true },
  });

  return true;
}

export async function obterUsuarioPorEmail(email: string) {
  return prisma.usuario.findUnique({
    where: { email },
    include: { empresa: true },
  });
}

export async function obterUsuarioPorId(id: string) {
  return prisma.usuario.findUnique({
    where: { id },
    include: { empresa: true },
  });
}
