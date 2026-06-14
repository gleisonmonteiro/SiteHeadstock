import bcrypt from "bcryptjs";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export async function hashSenha(senha: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(senha, salt);
}

export async function verificarSenha(
  senha: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export function gerarToken(): string {
  return randomBytes(32).toString("hex");
}

export function gerarTokenExpirado(minutosValidade: number = 60): Date {
  return new Date(Date.now() + minutosValidade * 60 * 1000);
}

function obterSegredoSessao(): string {
  const segredo = process.env.AUTH_SECRET;
  if (!segredo) throw new Error("AUTH_SECRET não configurado");
  return segredo;
}

export function criarTokenSessao(usuarioId: string): string {
  const assinatura = createHmac("sha256", obterSegredoSessao())
    .update(usuarioId)
    .digest("base64url");
  return `${usuarioId}.${assinatura}`;
}

export function lerTokenSessao(token?: string): string | null {
  if (!token) return null;

  const separador = token.lastIndexOf(".");
  if (separador <= 0) return null;

  const usuarioId = token.slice(0, separador);
  const assinaturaRecebida = Buffer.from(token.slice(separador + 1));
  const assinaturaEsperada = Buffer.from(
    createHmac("sha256", obterSegredoSessao())
      .update(usuarioId)
      .digest("base64url")
  );

  if (
    assinaturaRecebida.length !== assinaturaEsperada.length ||
    !timingSafeEqual(assinaturaRecebida, assinaturaEsperada)
  ) {
    return null;
  }

  return usuarioId;
}
