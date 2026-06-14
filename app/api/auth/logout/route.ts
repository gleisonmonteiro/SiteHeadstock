import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    sucesso: true,
    mensagem: "Logout realizado",
  });

  response.cookies.delete("auth_token");

  return response;
}
