"use client";

import { useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

// ── Tipos ──────────────────────────────────────────────────────────────────────

type ModuloId = "produtos" | "estoque" | "pagar" | "receber" | "vendas";

interface Resultado {
  importados: number;
  erros: number;
  ignorado?: boolean;
}

interface ModuloDef {
  id: ModuloId;
  label: string;
  nomeAba: string;
  descricao: string;
  obrigatorias: string[];
  colunas: string[];
  modelo: Record<string, unknown>[];
}

// ── Definição dos módulos ──────────────────────────────────────────────────────

const MODULOS: ModuloDef[] = [
  {
    id: "produtos",
    label: "Produtos",
    nomeAba: "bi_produto",
    descricao: "Catálogo de SKUs: referência, cor, tamanho, marca, grupo e preços.",
    obrigatorias: ["cd_produto", "descricao"],
    colunas: [
      "cd_produto", "referencia", "descricao", "descricao_sku",
      "cd_cor", "cor", "cd_tam", "tamanho",
      "setor", "departamento", "genero", "marca",
      "grupo", "subgrupo", "linha", "secao", "reposicao",
      "vl_pi", "vl_custo",
    ],
    modelo: [
      { cd_produto: "BLU001-M-RSA", referencia: "BLU-001", descricao: "Blusa Feminina Listrada", descricao_sku: "Blusa Listrada Rosa M", cd_cor: "RSA", cor: "Rosa", cd_tam: "M", tamanho: "M", setor: "Vestuário", departamento: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Blusas", subgrupo: "Casual", linha: "Primavera 2026", secao: "Feminino", reposicao: "S", vl_pi: 129.90, vl_custo: 46.00 },
      { cd_produto: "CAL002-G-PRT", referencia: "CAL-002", descricao: "Calça Feminina Alfaiataria", descricao_sku: "Calça Alfaiataria Preta G", cd_cor: "PRT", cor: "Preta", cd_tam: "G", tamanho: "G", setor: "Vestuário", departamento: "Feminino", genero: "Feminino", marca: "Cholet", grupo: "Calças", subgrupo: "Alfaiataria", linha: "Essentials", secao: "Feminino", reposicao: "S", vl_pi: 249.90, vl_custo: 95.00 },
      { cd_produto: "CAM008-G-BRC", referencia: "CAM-008", descricao: "Camisa Social Masculina", descricao_sku: "Camisa Social Branca G", cd_cor: "BRC", cor: "Branca", cd_tam: "G", tamanho: "G", setor: "Vestuário", departamento: "Masculino", genero: "Masculino", marca: "Cholet", grupo: "Camisas", subgrupo: "Social", linha: "Essentials", secao: "Masculino", reposicao: "S", vl_pi: 179.90, vl_custo: 68.00 },
    ],
  },
  {
    id: "estoque",
    label: "Estoque",
    nomeAba: "estoque",
    descricao: "Posição de estoque por produto e loja na data de referência.",
    obrigatorias: ["cd_produto", "estoque"],
    colunas: ["data", "cd_produto", "loja", "estoque", "vl_pi", "vl_custo"],
    modelo: [
      { data: "14/06/2026", cd_produto: "BLU001-M-RSA", loja: "Loja 01 - Centro", estoque: 12, vl_pi: 129.90, vl_custo: 46.00 },
      { data: "14/06/2026", cd_produto: "CAL002-G-PRT", loja: "Loja 02 - Shopping Iguatemi", estoque: 7, vl_pi: 249.90, vl_custo: 95.00 },
      { data: "14/06/2026", cd_produto: "CAM008-G-BRC", loja: "Loja 03 - Shopping RioMar", estoque: 15, vl_pi: 179.90, vl_custo: 68.00 },
    ],
  },
  {
    id: "pagar",
    label: "Contas a Pagar",
    nomeAba: "contas a pagar",
    descricao: "Duplicatas em aberto ou pagas a fornecedores.",
    obrigatorias: ["fornecedor", "dt_vencimento", "vl_duplicata"],
    colunas: [
      "fornecedor", "dt_vencimento", "vl_duplicata",
      "loja", "cd_fornecedor", "nr_duplicata", "nr_parcela",
      "dt_emissao", "dt_baixa", "tp_situacao", "tp_documento",
      "vl_original", "vl_pago", "vl_desconto",
    ],
    modelo: [
      { fornecedor: "Têxtil Nordeste Ltda", dt_vencimento: "30/06/2026", vl_duplicata: 4500.00, loja: "Loja 01 - Centro", cd_fornecedor: "1001", nr_duplicata: "NF-4521", nr_parcela: "1/3", dt_emissao: "01/06/2026", dt_baixa: "", tp_situacao: "N", tp_documento: "NF", vl_original: 4500.00, vl_pago: 0, vl_desconto: 0 },
      { fornecedor: "Moda Import Brasil S.A.", dt_vencimento: "15/07/2026", vl_duplicata: 8200.00, loja: "Loja 02 - Shopping Iguatemi", cd_fornecedor: "1002", nr_duplicata: "NF-4522", nr_parcela: "2/3", dt_emissao: "15/05/2026", dt_baixa: "10/06/2026", tp_situacao: "B", tp_documento: "NF", vl_original: 8200.00, vl_pago: 8200.00, vl_desconto: 0 },
    ],
  },
  {
    id: "receber",
    label: "Contas a Receber",
    nomeAba: "contas a receber",
    descricao: "Faturas em aberto ou recebidas de clientes.",
    obrigatorias: ["nm_cliente", "dt_vencimento", "vl_fatura"],
    colunas: [
      "nm_cliente", "dt_vencimento", "vl_fatura",
      "loja", "cd_cliente", "nr_fat", "nr_parcela",
      "dt_emissao", "dt_baixa", "tp_situacao", "tp_documento",
      "vl_original", "vl_pago", "vl_desconto",
    ],
    modelo: [
      { nm_cliente: "Maria José Santos ME", dt_vencimento: "20/06/2026", vl_fatura: 1800.00, loja: "Loja 01 - Centro", cd_cliente: "2001", nr_fat: "FAT-8801", nr_parcela: "1/2", dt_emissao: "20/05/2026", dt_baixa: "", tp_situacao: "1", tp_documento: "DUP", vl_original: 1800.00, vl_pago: 0, vl_desconto: 0 },
      { nm_cliente: "Distribuidora Moda Norte Ltda", dt_vencimento: "10/07/2026", vl_fatura: 5400.00, loja: "Loja 02 - Shopping Iguatemi", cd_cliente: "2002", nr_fat: "FAT-8802", nr_parcela: "2/3", dt_emissao: "10/05/2026", dt_baixa: "08/06/2026", tp_situacao: "2", tp_documento: "DUP", vl_original: 5400.00, vl_pago: 5400.00, vl_desconto: 0 },
    ],
  },
  {
    id: "vendas",
    label: "Vendas",
    nomeAba: "vendas",
    descricao: "Transações de venda: produto, quantidade, valor, vendedor e loja.",
    obrigatorias: ["ds_produto", "data", "vl_total_venda"],
    colunas: [
      "ds_produto", "data", "vl_total_venda",
      "cd_produto", "qt_venda", "nome_vendedor",
      "loja", "cliente", "tp_modalidade",
      "grupo", "marca", "custo", "vl_desconto", "nr_transacao",
    ],
    modelo: [
      { ds_produto: "Blusa Feminina Listrada", data: "14/06/2026", vl_total_venda: 129.90, cd_produto: "BLU001-M-RSA", qt_venda: 1, nome_vendedor: "Marina Costa", loja: "Loja 01 - Centro", cliente: "Maria José Santos", tp_modalidade: "Cartão Crédito", grupo: "Blusas", marca: "Cholet", custo: 46.00, vl_desconto: 0, nr_transacao: "TRN-00123" },
      { ds_produto: "Calça Feminina Alfaiataria", data: "14/06/2026", vl_total_venda: 249.90, cd_produto: "CAL002-G-PRT", qt_venda: 1, nome_vendedor: "Rafael Andrade", loja: "Loja 02 - Shopping Iguatemi", cliente: "", tp_modalidade: "PIX", grupo: "Calças", marca: "Cholet", custo: 95.00, vl_desconto: 0, nr_transacao: "TRN-00124" },
    ],
  },
];

// ── Ícones SVG ─────────────────────────────────────────────────────────────────

const ICONES: Record<ModuloId, React.ReactNode> = {
  produtos: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  estoque: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      <path d="M6 8h4M6 12h8" />
    </svg>
  ),
  pagar: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  ),
  receber: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  vendas: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
};

const CORES: Record<ModuloId, string> = {
  produtos: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  estoque:  "text-violet-400 bg-violet-400/10 border-violet-400/20",
  pagar:    "text-rose-400 bg-rose-400/10 border-rose-400/20",
  receber:  "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  vendas:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

// ── Componente principal ───────────────────────────────────────────────────────

export default function UploadsPage() {
  const [arquivos, setArquivos] = useState<Record<ModuloId, File | null>>({
    produtos: null, estoque: null, pagar: null, receber: null, vendas: null,
  });
  const [carregando, setCarregando] = useState<Record<ModuloId, boolean>>({
    produtos: false, estoque: false, pagar: false, receber: false, vendas: false,
  });
  const [resultados, setResultados] = useState<Record<ModuloId, Resultado | null>>({
    produtos: null, estoque: null, pagar: null, receber: null, vendas: null,
  });
  const [erros, setErros] = useState<Record<ModuloId, string>>({
    produtos: "", estoque: "", pagar: "", receber: "", vendas: "",
  });

  const fileRefs = useRef<Record<ModuloId, HTMLInputElement | null>>({
    produtos: null, estoque: null, pagar: null, receber: null, vendas: null,
  });

  const handleFileChange = (id: ModuloId, file: File | null) => {
    setArquivos((prev) => ({ ...prev, [id]: file }));
    setErros((prev) => ({ ...prev, [id]: "" }));
    setResultados((prev) => ({ ...prev, [id]: null }));
  };

  const handleUpload = async (modulo: ModuloDef) => {
    const arquivo = arquivos[modulo.id];
    if (!arquivo) return;

    setCarregando((prev) => ({ ...prev, [modulo.id]: true }));
    setErros((prev) => ({ ...prev, [modulo.id]: "" }));

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const res = await fetch("/api/uploads/modulos", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setErros((prev) => ({ ...prev, [modulo.id]: data.erro || "Erro ao processar arquivo" }));
        return;
      }

      // Pega o resultado da aba correspondente ao módulo
      const abas: Record<string, Resultado> = data.abas ?? {};
      const resultado =
        abas[modulo.nomeAba] ??
        Object.values(abas).find((r) => !r.ignorado) ??
        null;

      if (resultado) {
        setResultados((prev) => ({ ...prev, [modulo.id]: resultado }));
      } else {
        setErros((prev) => ({
          ...prev,
          [modulo.id]: `Nenhuma aba reconhecida. Renomeie a aba para "${modulo.nomeAba}".`,
        }));
      }

      // Limpa o input após upload
      setArquivos((prev) => ({ ...prev, [modulo.id]: null }));
      const ref = fileRefs.current[modulo.id];
      if (ref) ref.value = "";
    } catch {
      setErros((prev) => ({ ...prev, [modulo.id]: "Erro ao conectar com o servidor" }));
    } finally {
      setCarregando((prev) => ({ ...prev, [modulo.id]: false }));
    }
  };

  const handleBaixarModelo = async (modulo: ModuloDef) => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(modulo.modelo);

    // Largura automática das colunas
    const cols = modulo.colunas.map((c) => ({ wch: Math.max(c.length + 2, 14) }));
    ws["!cols"] = cols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, modulo.nomeAba);
    XLSX.writeFile(wb, `modelo_${modulo.id}.xlsx`);
  };

  return (
    <DashboardLayout
      titulo="Importar Dados"
      descricao="Importe planilhas Excel para atualizar cada módulo. A aba da planilha deve ter o nome indicado."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {MODULOS.map((modulo) => {
          const cor = CORES[modulo.id];
          const arquivo = arquivos[modulo.id];
          const resultado = resultados[modulo.id];
          const erro = erros[modulo.id];
          const isLoading = carregando[modulo.id];

          return (
            <div
              key={modulo.id}
              className="flex flex-col rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[var(--card-dark)] overflow-hidden"
            >
              {/* Cabeçalho do card */}
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/60 px-5 py-4">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${cor}`}>
                  {ICONES[modulo.id]}
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                    {modulo.label}
                  </h2>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                    aba: <span className="text-gray-500 dark:text-gray-300">{modulo.nomeAba}</span>
                  </p>
                </div>
              </div>

              {/* Corpo */}
              <div className="flex flex-1 flex-col gap-4 p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {modulo.descricao}
                </p>

                {/* Colunas */}
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Colunas esperadas
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {modulo.colunas.map((col) => {
                      const obrig = modulo.obrigatorias.includes(col);
                      return (
                        <span
                          key={col}
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] leading-none ${
                            obrig
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {col}
                          {obrig && <span className="ml-0.5 text-amber-500">*</span>}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-[10px] text-gray-400">
                    <span className="text-amber-500 font-bold">*</span> obrigatório
                  </p>
                </div>

                {/* Drag & drop / file input */}
                <label
                  htmlFor={`file-${modulo.id}`}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
                    arquivo
                      ? "border-[var(--turquesa)] bg-[var(--turquesa)]/5"
                      : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                  }`}
                >
                  <input
                    id={`file-${modulo.id}`}
                    ref={(el) => { fileRefs.current[modulo.id] = el; }}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => handleFileChange(modulo.id, e.target.files?.[0] ?? null)}
                  />
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={arquivo ? "text-[var(--turquesa)]" : "text-gray-300 dark:text-gray-600"}>
                    <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {arquivo ? arquivo.name : "Clique ou arraste um arquivo .xlsx"}
                  </span>
                  {!arquivo && (
                    <span className="text-xs text-gray-400">Somente Excel (.xlsx)</span>
                  )}
                </label>

                {/* Erro */}
                {erro && (
                  <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                    {erro}
                  </div>
                )}

                {/* Resultado */}
                {resultado && (
                  <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    resultado.erros === 0
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
                  }`}>
                    <span className="text-lg">{resultado.erros === 0 ? "✓" : "⚠"}</span>
                    <span>
                      <strong>{resultado.importados}</strong> registros importados
                      {resultado.erros > 0 && (
                        <> · <strong className="text-rose-500">{resultado.erros}</strong> erros</>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Rodapé — botões */}
              <div className="flex gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-700/60">
                <button
                  onClick={() => handleBaixarModelo(modulo)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-white"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 16V4" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" />
                  </svg>
                  Baixar Modelo
                </button>

                <button
                  onClick={() => handleUpload(modulo)}
                  disabled={!arquivo || isLoading}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--turquesa)] to-[var(--lime)] px-3 py-2 text-sm font-bold text-gray-900 transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Importando…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" />
                      </svg>
                      Importar
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}

        {/* Card informativo — como funciona */}
        <div className="flex flex-col rounded-xl border border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 lg:col-span-2 xl:col-span-3">
          <div className="p-6">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-400">
              Como funciona a importação
            </h3>
            <ol className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">1</span>
                Exporte o relatório do TOTVS Virtual Report e salve como <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">.xlsx</code>.
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">2</span>
                Certifique-se de que a aba da planilha tem exatamente o nome indicado em cada módulo acima (ex.: <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">bi_produto</code>, <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">estoque</code>…).
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">3</span>
                Arraste ou selecione o arquivo no módulo correspondente e clique em <strong>Importar</strong>.
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">4</span>
                Use <strong>Baixar Modelo</strong> para obter um arquivo de referência com as colunas e exemplos preenchidos.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
