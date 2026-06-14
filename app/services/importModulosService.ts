import { prisma } from "@/lib/prisma";

// ─── helpers ──────────────────────────────────────────────────────────────────

function norm(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function normFloat(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  const s = norm(row, ...keys);
  if (!s) return undefined;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? undefined : n;
}

function normInt(row: Record<string, unknown>, ...keys: string[]): number | undefined {
  const s = norm(row, ...keys);
  if (!s) return undefined;
  const n = parseInt(s.replace(",", "."), 10);
  return isNaN(n) ? undefined : n;
}

function normDate(row: Record<string, unknown>, ...keys: string[]): Date | undefined {
  const s = norm(row, ...keys);
  if (!s) return undefined;
  // aceita DD/MM/YYYY, YYYY-MM-DD, timestamps numéricos do Excel (dias desde 1900)
  if (/^\d{5,}$/.test(s)) {
    // Serial date do Excel
    const epoch = new Date(1900, 0, 1);
    epoch.setDate(epoch.getDate() + parseInt(s) - 2);
    return epoch;
  }
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) return new Date(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}

// ─── Módulo: Produtos ─────────────────────────────────────────────────────────

export async function importarProdutos(empresaId: string, linhas: Record<string, unknown>[]) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const cdProduto = norm(row, "cd_produto", "codigo", "cd");
    const descricao = norm(row, "descricao", "ds_produto", "nome_produto", "produto");

    if (!cdProduto || !descricao) {
      erros.push({ linha: i + 2, erro: "cd_produto e descricao são obrigatórios" });
      continue;
    }

    try {
      await prisma.produtoCatalogo.upsert({
        where: { empresaId_cdProduto: { empresaId, cdProduto } },
        update: {
          referencia: norm(row, "referencia", "ref"),
          descricao,
          descricaoSku: norm(row, "descricao_sku", "nm_produto", "sku"),
          cdCor: norm(row, "cd_cor"),
          cor: norm(row, "cor"),
          cdTam: norm(row, "cd_tam"),
          tamanho: norm(row, "tamanho"),
          setor: norm(row, "setor"),
          departamento: norm(row, "departamento"),
          genero: norm(row, "genero"),
          marca: norm(row, "marca"),
          grupo: norm(row, "grupo"),
          subgrupo: norm(row, "subgrupo"),
          linha: norm(row, "linha"),
          secao: norm(row, "secao"),
          reposicao: norm(row, "reposicao"),
          vlVenda: normFloat(row, "vl_pi", "vl_venda", "preco_venda", "vl_rr"),
          vlCusto: normFloat(row, "vl_custo", "custo", "vl_aquirr"),
        },
        create: {
          empresaId,
          cdProduto,
          referencia: norm(row, "referencia", "ref"),
          descricao,
          descricaoSku: norm(row, "descricao_sku", "nm_produto", "sku"),
          cdCor: norm(row, "cd_cor"),
          cor: norm(row, "cor"),
          cdTam: norm(row, "cd_tam"),
          tamanho: norm(row, "tamanho"),
          setor: norm(row, "setor"),
          departamento: norm(row, "departamento"),
          genero: norm(row, "genero"),
          marca: norm(row, "marca"),
          grupo: norm(row, "grupo"),
          subgrupo: norm(row, "subgrupo"),
          linha: norm(row, "linha"),
          secao: norm(row, "secao"),
          reposicao: norm(row, "reposicao"),
          vlVenda: normFloat(row, "vl_pi", "vl_venda", "preco_venda", "vl_rr"),
          vlCusto: normFloat(row, "vl_custo", "custo", "vl_aquirr"),
        },
      });
      importados++;
    } catch (e) {
      erros.push({ linha: i + 2, erro: String(e) });
    }
  }

  return { importados, erros };
}

// ─── Módulo: Estoque ──────────────────────────────────────────────────────────

export async function importarEstoque(empresaId: string, linhas: Record<string, unknown>[]) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const cdProduto = norm(row, "cd_produto", "codigo", "cd");
    const estoqueQtd = normFloat(row, "estoque", "saldo", "quantidade");
    const dataRef = normDate(row, "data", "data_ref", "dt_ref");

    if (!cdProduto || estoqueQtd === undefined) {
      erros.push({ linha: i + 2, erro: "cd_produto e estoque são obrigatórios" });
      continue;
    }

    const dataEfetiva = dataRef ?? new Date();
    dataEfetiva.setHours(0, 0, 0, 0);
    const loja = norm(row, "loja", "cd_empresa", "unidade") ?? "Sem loja";

    // Buscar produto para linkar
    const produto = await prisma.produtoCatalogo.findUnique({
      where: { empresaId_cdProduto: { empresaId, cdProduto } },
    });

    try {
      await prisma.itemEstoque.upsert({
        where: { empresaId_cdProduto_loja_dataRef: { empresaId, cdProduto, loja, dataRef: dataEfetiva } },
        update: {
          estoque: estoqueQtd,
          produtoId: produto?.id,
          vlVenda: normFloat(row, "vl_pi", "vl_venda", "preco_venda", "vl_rr"),
          vlCusto: normFloat(row, "vl_custo", "custo", "vl_aquirr", "vl_aquipi"),
        },
        create: {
          empresaId,
          cdProduto,
          produtoId: produto?.id,
          loja,
          dataRef: dataEfetiva,
          estoque: estoqueQtd,
          vlVenda: normFloat(row, "vl_pi", "vl_venda", "preco_venda", "vl_rr"),
          vlCusto: normFloat(row, "vl_custo", "custo", "vl_aquirr", "vl_aquipi"),
        },
      });
      importados++;
    } catch (e) {
      erros.push({ linha: i + 2, erro: String(e) });
    }
  }

  return { importados, erros };
}

// ─── Módulo: Contas a Pagar ───────────────────────────────────────────────────

export async function importarContasPagar(empresaId: string, linhas: Record<string, unknown>[]) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const fornecedor = norm(row, "fornecedor", "nm_fornecedor", "nome_fornecedor");
    const dtVencimento = normDate(row, "dt_vencimento", "vencimento", "data_vencimento");
    const vlDuplicata = normFloat(row, "vl_duplicata", "valor", "vl_titulo", "valor_titulo");

    if (!fornecedor || !dtVencimento || vlDuplicata === undefined) {
      erros.push({ linha: i + 2, erro: "fornecedor, dt_vencimento e vl_duplicata são obrigatórios" });
      continue;
    }

    try {
      await prisma.contaPagar.create({
        data: {
          empresaId,
          loja: norm(row, "loja", "cd_empresa", "unidade"),
          fornecedor,
          cdFornecedor: norm(row, "cd_fornecedor"),
          nrDuplicata: norm(row, "nr_duplicata", "numero", "nr_titulo"),
          nrParcela: norm(row, "nr_parcela", "parcela"),
          dtEmissao: normDate(row, "dt_emissao", "emissao", "data_emissao"),
          dtVencimento,
          dtBaixa: normDate(row, "dt_baixa", "data_baixa", "data_pagamento"),
          tpSituacao: norm(row, "tp_situacao", "situacao") ?? "N",
          tpDocumento: norm(row, "tp_documento", "documento", "tipo_doc"),
          tpBaixa: norm(row, "tp_baixa"),
          vlDuplicata,
          vlOriginal: normFloat(row, "vl_original", "valor_original"),
          vlPago: normFloat(row, "vl_pago", "valor_pago"),
          vlDesconto: normFloat(row, "vl_desconto", "desconto"),
        },
      });
      importados++;
    } catch (e) {
      erros.push({ linha: i + 2, erro: String(e) });
    }
  }

  return { importados, erros };
}

// ─── Módulo: Contas a Receber ────────────────────────────────────────────────

export async function importarContasReceber(empresaId: string, linhas: Record<string, unknown>[]) {
  let importados = 0;
  const erros: { linha: number; erro: string }[] = [];

  for (let i = 0; i < linhas.length; i++) {
    const row = linhas[i];
    const nmCliente = norm(row, "nm_cliente", "cliente", "nome_cliente");
    const dtVencimento = normDate(row, "dt_vencimento", "vencimento", "data_vencimento");
    const vlFatura = normFloat(row, "vl_fatura", "valor", "vl_titulo", "valor_titulo");

    if (!nmCliente || !dtVencimento || vlFatura === undefined) {
      erros.push({ linha: i + 2, erro: "nm_cliente, dt_vencimento e vl_fatura são obrigatórios" });
      continue;
    }

    try {
      await prisma.contaReceber.create({
        data: {
          empresaId,
          loja: norm(row, "loja", "cd_empresa", "unidade"),
          cdCliente: norm(row, "cd_cliente"),
          nmCliente,
          nrFat: norm(row, "nr_fat", "numero", "nr_titulo"),
          nrParcela: norm(row, "nr_parcela", "parcela"),
          dtEmissao: normDate(row, "dt_emissao", "emissao", "data_emissao"),
          dtVencimento,
          dtBaixa: normDate(row, "dt_baixa", "data_baixa", "data_recebimento"),
          tpSituacao: norm(row, "tp_situacao", "situacao") ?? "1",
          tpDocumento: norm(row, "tp_documento", "documento", "tipo_doc"),
          tpBaixa: norm(row, "tp_baixa"),
          vlFatura,
          vlOriginal: normFloat(row, "vl_original", "valor_original"),
          vlPago: normFloat(row, "vl_pago", "valor_pago"),
          vlDesconto: normFloat(row, "vl_desconto", "desconto"),
        },
      });
      importados++;
    } catch (e) {
      erros.push({ linha: i + 2, erro: String(e) });
    }
  }

  return { importados, erros };
}

// ─── Módulo: Vendas (campos extras do TOTVS) ──────────────────────────────────

export function normalizarLinhaVendaTotvs(row: Record<string, unknown>): {
  produto: string; cdProduto?: string; quantidade: number; valorVenda: number;
  vendedor: string; dataVenda: Date; loja?: string; cliente?: string;
  formaPagamento?: string; categoria?: string; marca?: string; custo?: number;
  desconto?: number; vlBruto?: number; nrTransacao?: string; tpSituacao?: string;
} | null {
  const produto = norm(row, "ds_produto", "produto", "descricao") ?? norm(row, "cd_produto");
  const dataVenda = normDate(row, "data", "dt_transacao", "data_venda");
  const valorVenda = normFloat(row, "vl_total_venda", "vl_totalliquido", "valor_venda", "vl_venda");
  const quantidade = normInt(row, "qt_venda", "qt_solicitada", "quantidade") ?? 1;
  const vendedor = norm(row, "nome_vendedor", "vendedor") ?? "Sem vendedor";

  if (!produto || !dataVenda || valorVenda === undefined) return null;

  return {
    produto,
    cdProduto: norm(row, "cd_produto", "codigo"),
    quantidade,
    valorVenda,
    vendedor,
    dataVenda,
    loja: norm(row, "loja", "cd_empresa"),
    cliente: norm(row, "cliente", "nm_cliente"),
    formaPagamento: norm(row, "forma_pagamento", "tp_modalidade"),
    categoria: norm(row, "categoria", "grupo"),
    marca: norm(row, "marca"),
    custo: normFloat(row, "custo", "vl_custo"),
    desconto: normFloat(row, "vl_desconto", "desconto"),
    vlBruto: normFloat(row, "vl_totalbruto", "vl_bruto"),
    nrTransacao: norm(row, "nr_transacao"),
    tpSituacao: norm(row, "tp_situacao"),
  };
}
