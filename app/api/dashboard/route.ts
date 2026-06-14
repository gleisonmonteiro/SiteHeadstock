import { NextRequest, NextResponse } from "next/server";
import { exigirUsuarioSessao, respostaErroApi } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  obterKPIsDashboard,
  obterTop10Produtos,
  obterVendasPorCategoria,
  obterVendasPorDia,
  obterVendasPorFormaPagamento,
  obterVendasPorVendedor,
} from "@/services/dashboardService";

async function resolverEmpresaId(request: NextRequest): Promise<string | null> {
  const usuario = await exigirUsuarioSessao(request);
  const param = request.nextUrl.searchParams.get("empresaId");

  if (!param) return usuario.empresaId;

  if (param === usuario.empresaId) return param;

  const isMaster = ["MASTER_PLATFORM", "MASTER_CONSULTANT"].includes(usuario.papel);
  if (isMaster) return param;

  if (usuario.empresa.tipo === "AGENCIA") {
    const acesso = await prisma.clienteAgencia.findFirst({
      where: { agenciaId: usuario.empresaId, empresaConectadaId: param, status: "ativo" },
    });
    if (acesso) return param;
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const empresaId = await resolverEmpresaId(request);
    if (!empresaId) {
      return NextResponse.json({ erro: "Acesso não autorizado a esta empresa" }, { status: 403 });
    }
    const [
      kpis,
      vendasPorDia,
      top10Produtos,
      vendasPorVendedor,
      vendasPorFormaPagamento,
      vendasPorCategoria,
    ] = await Promise.all([
      obterKPIsDashboard(empresaId),
      obterVendasPorDia(empresaId),
      obterTop10Produtos(empresaId),
      obterVendasPorVendedor(empresaId),
      obterVendasPorFormaPagamento(empresaId),
      obterVendasPorCategoria(empresaId),
    ]);

    return NextResponse.json({
      kpis,
      graficos: {
        vendasPorDia: vendasPorDia.length > 0 ? vendasPorDia : null,
        top10Produtos: top10Produtos.length > 0 ? top10Produtos : null,
        vendasPorVendedor:
          vendasPorVendedor.length > 0 ? vendasPorVendedor : null,
        vendasPorFormaPagamento:
          vendasPorFormaPagamento.length > 0
            ? vendasPorFormaPagamento
            : null,
        vendasPorCategoria:
          vendasPorCategoria.length > 0 ? vendasPorCategoria : null,
      },
    });
  } catch (erro) {
    return respostaErroApi(erro, "Erro ao obter dados do dashboard");
  }
}
