import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const p = new PrismaClient({ adapter });

async function main() {
  const fcm = await p.empresa.findFirst({ where: { slug: "fcm" } });
  console.log("FCM empresa id:", fcm?.id, "| nome:", fcm?.nome);

  if (!fcm) { console.log("FCM não encontrada!"); return; }

  const prods   = await p.produtoCatalogo.count({ where: { empresaId: fcm.id } });
  const est     = await p.itemEstoque.count({ where: { empresaId: fcm.id } });
  const pagar   = await p.contaPagar.count({ where: { empresaId: fcm.id } });
  const receber = await p.contaReceber.count({ where: { empresaId: fcm.id } });

  const usuario = await p.usuario.findFirst({ where: { email: "raphael@fcm.com" } });
  console.log("Raphael empresaId:", usuario?.empresaId);
  console.log("IDs iguais:", fcm.id === usuario?.empresaId);
  console.log("Produtos:", prods, "| Estoque:", est, "| Pagar:", pagar, "| Receber:", receber);
}

main().catch(console.error).finally(() => p.$disconnect());
