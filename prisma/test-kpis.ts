import "dotenv/config";
import { PrismaClient } from "../.generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const p = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const hoje = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const daqui = (dias: number) => { const d = hoje(); d.setDate(d.getDate() + dias); return d; };
function arred(v: number, casas = 2) { return Math.round(v * 10**casas) / 10**casas; }
function pct(p: number, t: number) { return t > 0 ? arred((p/t)*100) : 0; }

async function main() {
  const fcm = await p.empresa.findFirst({ where: { slug: "fcm" } });
  const empresaId = fcm!.id;
  console.log("Testando kpisProdutos para", fcm?.nome);

  const [total, semClasse, comPreco, recentes] = await Promise.all([
    p.produtoCatalogo.count({ where: { empresaId } }),
    p.produtoCatalogo.count({ where: { empresaId, OR: [{ marca: null }, { grupo: null }] } }),
    p.produtoCatalogo.findMany({ where: { empresaId, vlVenda: { not: null }, vlCusto: { not: null } }, select: { vlVenda: true, vlCusto: true } }),
    p.produtoCatalogo.count({ where: { empresaId, createdAt: { gte: daqui(-30) } } }),
  ]);

  let markupTotal = 0;
  let margemPotencial = 0;
  for (const prod of comPreco) {
    markupTotal += ((prod.vlVenda! - prod.vlCusto!) / prod.vlCusto!) * 100;
    margemPotencial += prod.vlVenda! - prod.vlCusto!;
  }

  const comGrade = await p.produtoCatalogo.count({ where: { empresaId, cor: { not: null }, tamanho: { not: null } } });

  const resultado = {
    skusAtivos: total,
    semClassificacao: semClasse,
    markupMedio: comPreco.length > 0 ? arred(markupTotal / comPreco.length) : 0,
    margemPotencial: arred(margemPotencial),
    coberturaGrade: pct(comGrade, total),
    cadastrosRecentes: recentes,
    temDados: total > 0,
  };

  console.log("Resultado:", JSON.stringify(resultado, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
