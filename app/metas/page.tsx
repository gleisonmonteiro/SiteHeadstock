"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface MetaGeral {
  id: string;
  mes: number;
  ano: number;
  valorMeta: number;
}

interface MetaVendedor {
  id: string;
  vendedor: string;
  mes: number;
  ano: number;
  valorMeta: number;
}

export default function MetasPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [aba, setAba] = useState<"geral" | "vendedor">("geral");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [metaGeralValor, setMetaGeralValor] = useState("");
  const [metasVendedor, setMetasVendedor] = useState<MetaVendedor[]>([]);
  const [metasEditing, setMetasEditing] = useState<
    Record<string, number | string>
  >({});
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const usuarioStorage = localStorage.getItem("usuario");
    if (usuarioStorage) {
      const dados = JSON.parse(usuarioStorage);
      setUsuario(dados);
      carregarMetas(dados.empresaId);
    }
  }, [mes, ano]);

  const carregarMetas = async (empresaId: string) => {
    try {
      const response = await fetch(
        `/api/metas?empresaId=${empresaId}&mes=${mes}&ano=${ano}`
      );
      const data = await response.json();
      setVendedores(data.vendedores || []);
      if (data.metaGeral) {
        setMetaGeralValor(data.metaGeral.valorMeta.toString());
      }
      setMetasVendedor(data.metasVendedor || []);

      // Inicializar metas para edição
      const editing: Record<string, number | string> = {};
      data.metasVendedor.forEach((mv: MetaVendedor) => {
        editing[mv.vendedor] = mv.valorMeta;
      });
      setMetasEditing(editing);
    } catch (erro) {
      console.error("Erro ao carregar metas:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const salvarMetaGeral = async () => {
    if (!usuario || !metaGeralValor) return;

    try {
      const response = await fetch("/api/metas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: usuario.empresaId,
          mes,
          ano,
          valorMeta: parseFloat(metaGeralValor),
          tipo: "geral",
        }),
      });

      if (response.ok) {
        setMensagem("Meta geral salva com sucesso!");
        setTimeout(() => setMensagem(""), 3000);
      }
    } catch (erro) {
      console.error("Erro ao salvar meta:", erro);
    }
  };

  const salvarMetaVendedor = async (vendedor: string) => {
    if (!usuario || !metasEditing[vendedor]) return;

    try {
      const response = await fetch("/api/metas/vendedor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: usuario.empresaId,
          vendedor,
          mes,
          ano,
          valorMeta: parseFloat(metasEditing[vendedor] as string),
        }),
      });

      if (response.ok) {
        setMensagem(`Meta de ${vendedor} salva com sucesso!`);
        setTimeout(() => setMensagem(""), 3000);
      }
    } catch (erro) {
      console.error("Erro ao salvar meta de vendedor:", erro);
    }
  };

  return (
    <DashboardLayout
      titulo="Metas"
      descricao="Defina e acompanhe suas metas de vendas"
    >
      <div className="max-w-4xl">
        {mensagem && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-400">
            {mensagem}
          </div>
        )}

        {/* Seletor de Mês/Ano */}
        <div className="mb-6 flex gap-4">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleString("pt-BR", {
                  month: "long",
                })}
              </option>
            ))}
          </select>

          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa"
          >
            {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setAba("geral")}
            className={`px-6 py-3 font-medium transition-colors ${
              aba === "geral"
                ? "text-turquesa border-b-2 border-turquesa"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Meta Geral
          </button>
          <button
            onClick={() => setAba("vendedor")}
            className={`px-6 py-3 font-medium transition-colors ${
              aba === "vendedor"
                ? "text-turquesa border-b-2 border-turquesa"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Meta por Vendedor
          </button>
        </div>

        {/* Conteúdo */}
        {aba === "geral" && (
          <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Meta Geral - {new Date(2024, mes - 1).toLocaleString("pt-BR", { month: "long" })} de {ano}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor da Meta
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={metaGeralValor}
                    onChange={(e) => setMetaGeralValor(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa"
                  />
                  <button
                    onClick={salvarMetaGeral}
                    className="px-6 py-2 bg-turquesa text-white font-bold rounded-lg hover:bg-lime hover:text-gray-900 transition-all"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {aba === "vendedor" && (
          <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Metas por Vendedor
            </h3>

            {carregando ? (
              <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
            ) : vendedores.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">
                Nenhum vendedor encontrado. Importe vendas primeiro.
              </p>
            ) : (
              <div className="space-y-4">
                {vendedores.map((vendedor) => {
                  const metaExistente = metasVendedor.find(
                    (m) => m.vendedor === vendedor
                  );
                  return (
                    <div key={vendedor} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {vendedor}
                        </label>
                        <input
                          type="number"
                          value={metasEditing[vendedor] || ""}
                          onChange={(e) =>
                            setMetasEditing({
                              ...metasEditing,
                              [vendedor]: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa"
                        />
                      </div>
                      <button
                        onClick={() => salvarMetaVendedor(vendedor)}
                        className="px-4 py-2 bg-turquesa text-white font-bold rounded-lg hover:bg-lime hover:text-gray-900 transition-all whitespace-nowrap"
                      >
                        Salvar
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
