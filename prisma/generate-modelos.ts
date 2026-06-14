/**
 * Gera modelos Excel para upload dos módulos:
 * Produtos, Estoque, Contas a Pagar, Contas a Receber, Vendas
 *
 * Saída: c:\Codex\Headstock\modelos-upload\
 */

import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const OUTPUT_DIR = path.join("c:\\Codex\\Headstock", "modelos-upload");
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function wb(sheets: { nome: string; dados: Record<string, unknown>[] }[]) {
  const workbook = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.dados);
    XLSX.utils.book_append_sheet(workbook, ws, s.nome);
  }
  return workbook;
}

// ── PRODUTOS ──────────────────────────────────────────────────────────────────
const produtosExemplo = [
  {
    cd_produto: "PRD-001",
    descricao: "Camisa Social Manga Longa",
    referencia: "CAM-M-AZL",
    descricao_sku: "Camisa Social Azul M",
    cor: "Azul",
    tamanho: "M",
    grupo: "Camisas",
    subgrupo: "Social",
    setor: "Vestuário",
    departamento: "Masculino",
    genero: "Masculino",
    marca: "Reserva",
    vl_venda: 189.9,
    vl_custo: 75.0,
  },
  {
    cd_produto: "PRD-002",
    descricao: "Calça Jeans Slim",
    referencia: "CAL-42-PRT",
    descricao_sku: "Calça Jeans Preta 42",
    cor: "Preta",
    tamanho: "42",
    grupo: "Calças",
    subgrupo: "Jeans",
    setor: "Vestuário",
    departamento: "Masculino",
    genero: "Masculino",
    marca: "Hering",
    vl_venda: 249.9,
    vl_custo: 95.0,
  },
];

const produtosWb = wb([{ nome: "Produtos", dados: produtosExemplo }]);
XLSX.writeFile(produtosWb, path.join(OUTPUT_DIR, "modelo-produtos.xlsx"));
console.log("✓ modelo-produtos.xlsx");

// ── ESTOQUE ───────────────────────────────────────────────────────────────────
const estoqueExemplo = [
  {
    cd_produto: "PRD-001",
    loja: "Loja 01 - Centro",
    estoque: 15,
    data: "13/06/2026",
    vl_venda: 189.9,
    vl_custo: 75.0,
  },
  {
    cd_produto: "PRD-001",
    loja: "Loja 02 - Shopping",
    estoque: 8,
    data: "13/06/2026",
    vl_venda: 189.9,
    vl_custo: 75.0,
  },
  {
    cd_produto: "PRD-002",
    loja: "Loja 01 - Centro",
    estoque: 22,
    data: "13/06/2026",
    vl_venda: 249.9,
    vl_custo: 95.0,
  },
];

const estoqueWb = wb([{ nome: "Estoque", dados: estoqueExemplo }]);
XLSX.writeFile(estoqueWb, path.join(OUTPUT_DIR, "modelo-estoque.xlsx"));
console.log("✓ modelo-estoque.xlsx");

// ── CONTAS A PAGAR ────────────────────────────────────────────────────────────
const contasPagarExemplo = [
  {
    fornecedor: "Reserva Têxtil Ltda",
    cd_fornecedor: "FORN-001",
    nr_duplicata: "NF-1234",
    nr_parcela: "1/3",
    dt_emissao: "01/05/2026",
    dt_vencimento: "01/06/2026",
    vl_duplicata: 3500.0,
    vl_original: 3500.0,
    tp_situacao: "N",
    tp_documento: "NF",
    loja: "Loja 01 - Centro",
  },
  {
    fornecedor: "Nike Brasil",
    cd_fornecedor: "FORN-002",
    nr_duplicata: "NF-5678",
    nr_parcela: "1/1",
    dt_emissao: "15/04/2026",
    dt_vencimento: "15/05/2026",
    dt_baixa: "14/05/2026",
    vl_duplicata: 8900.0,
    vl_original: 8900.0,
    vl_pago: 8900.0,
    tp_situacao: "B",
    tp_documento: "NF",
    tp_baixa: "N",
    loja: "Loja 02 - Shopping",
  },
];

const pagarWb = wb([{ nome: "Contas a Pagar", dados: contasPagarExemplo }]);
XLSX.writeFile(pagarWb, path.join(OUTPUT_DIR, "modelo-contas-pagar.xlsx"));
console.log("✓ modelo-contas-pagar.xlsx");

// ── CONTAS A RECEBER ──────────────────────────────────────────────────────────
const contasReceberExemplo = [
  {
    nm_cliente: "Distribuidora Central",
    cd_cliente: "CLI-001",
    nr_fat: "FAT-0001",
    nr_parcela: "1/2",
    dt_emissao: "01/05/2026",
    dt_vencimento: "15/06/2026",
    vl_fatura: 5200.0,
    vl_original: 5200.0,
    tp_situacao: "1",
    tp_documento: "DUP",
    loja: "Loja 01 - Centro",
  },
  {
    nm_cliente: "Grupo Moda Norte",
    cd_cliente: "CLI-002",
    nr_fat: "FAT-0002",
    nr_parcela: "1/1",
    dt_emissao: "10/04/2026",
    dt_vencimento: "10/05/2026",
    dt_baixa: "09/05/2026",
    vl_fatura: 3800.0,
    vl_original: 3800.0,
    vl_pago: 3800.0,
    tp_situacao: "2",
    tp_documento: "DUP",
    tp_baixa: "N",
    loja: "Loja 02 - Shopping",
  },
];

const receberWb = wb([{ nome: "Contas a Receber", dados: contasReceberExemplo }]);
XLSX.writeFile(receberWb, path.join(OUTPUT_DIR, "modelo-contas-receber.xlsx"));
console.log("✓ modelo-contas-receber.xlsx");

// ── VENDAS ────────────────────────────────────────────────────────────────────
const vendasExemplo = [
  {
    data: "13/06/2026",
    ds_produto: "Camisa Social Manga Longa",
    cd_produto: "PRD-001",
    qt_venda: 2,
    vl_total_venda: 379.8,
    vl_totalbruto: 379.8,
    nome_vendedor: "Ana Lima",
    cliente: "João Pedro",
    forma_pagamento: "Cartão Crédito",
    categoria: "Camisas",
    marca: "Reserva",
    custo: 150.0,
    loja: "Loja 01 - Centro",
  },
  {
    data: "13/06/2026",
    ds_produto: "Tênis Casual Urban",
    cd_produto: "PRD-005",
    qt_venda: 1,
    vl_total_venda: 399.9,
    vl_totalbruto: 399.9,
    nome_vendedor: "Bruno Ferraz",
    cliente: "",
    forma_pagamento: "PIX",
    categoria: "Tênis",
    marca: "Nike",
    custo: 160.0,
    loja: "Loja 02 - Shopping",
  },
];

const vendasWb = wb([{ nome: "Vendas", dados: vendasExemplo }]);
XLSX.writeFile(vendasWb, path.join(OUTPUT_DIR, "modelo-vendas.xlsx"));
console.log("✓ modelo-vendas.xlsx");

// ── MODELO COMPLETO (multi-aba) ────────────────────────────────────────────────
const completo = XLSX.utils.book_new();

const sheets: { nome: string; dados: Record<string, unknown>[] }[] = [
  { nome: "Vendas", dados: vendasExemplo },
  { nome: "Produtos", dados: produtosExemplo },
  { nome: "Estoque", dados: estoqueExemplo },
  { nome: "Contas a Pagar", dados: contasPagarExemplo },
  { nome: "Contas a Receber", dados: contasReceberExemplo },
];

for (const s of sheets) {
  XLSX.utils.book_append_sheet(completo, XLSX.utils.json_to_sheet(s.dados), s.nome);
}

XLSX.writeFile(completo, path.join(OUTPUT_DIR, "modelo-completo-todos-modulos.xlsx"));
console.log("✓ modelo-completo-todos-modulos.xlsx");

console.log(`\nTodos os modelos gerados em: ${OUTPUT_DIR}`);
