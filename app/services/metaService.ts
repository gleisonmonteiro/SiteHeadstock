import { prisma } from "@/lib/prisma";

export async function obterMeta(empresaId: string, mes: number, ano: number) {
  return prisma.meta.findFirst({
    where: { empresaId, mes, ano },
  });
}

export async function salvarMeta(
  empresaId: string,
  mes: number,
  ano: number,
  valorMeta: number
) {
  const existente = await obterMeta(empresaId, mes, ano);

  if (existente) {
    return prisma.meta.update({
      where: { id: existente.id },
      data: { valorMeta },
    });
  }

  return prisma.meta.create({
    data: {
      empresaId,
      mes,
      ano,
      valorMeta,
    },
  });
}

export async function obterMetaVendedor(
  empresaId: string,
  vendedor: string,
  mes: number,
  ano: number
) {
  return prisma.metaVendedor.findFirst({
    where: { empresaId, vendedor, mes, ano },
  });
}

export async function salvarMetaVendedor(
  empresaId: string,
  vendedor: string,
  mes: number,
  ano: number,
  valorMeta: number
) {
  const existente = await obterMetaVendedor(empresaId, vendedor, mes, ano);

  if (existente) {
    return prisma.metaVendedor.update({
      where: { id: existente.id },
      data: { valorMeta },
    });
  }

  return prisma.metaVendedor.create({
    data: {
      empresaId,
      vendedor,
      mes,
      ano,
      valorMeta,
    },
  });
}

export async function obterVendedoresUnicos(empresaId: string) {
  const vendas = await prisma.venda.findMany({
    where: { empresaId },
    select: { vendedor: true },
    distinct: ["vendedor"],
  });

  return vendas.map((v) => v.vendedor).sort();
}

export async function obterMetasVendedorMesAno(
  empresaId: string,
  mes: number,
  ano: number
) {
  return prisma.metaVendedor.findMany({
    where: { empresaId, mes, ano },
    orderBy: { vendedor: "asc" },
  });
}
