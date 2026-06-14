"use client";

import { useEffect, useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Comprovante {
  id: string;
  nomeArquivo: string;
  urlArquivo: string;
  status: string;
  confianca?: number;
}

export default function OCRComprovantesPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [comprovantes, setComprovantes] = useState<Comprovante[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState<{
    aberto: boolean;
    comprovante: Comprovante | null;
    dados: {
      dataMovimento: string;
      valor: string;
      fornecedor: string;
      descricao?: string;
      formaPagamento?: string;
      categoria?: string;
    };
  }>({
    aberto: false,
    comprovante: null,
    dados: {
      dataMovimento: new Date().toISOString().split("T")[0],
      valor: "",
      fornecedor: "",
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const usuarioStorage = localStorage.getItem("usuario");
    if (usuarioStorage) {
      const dados = JSON.parse(usuarioStorage);
      setUsuario(dados);
      carregarComprovantes(dados.empresaId);
    }
  }, []);

  const carregarComprovantes = async (empresaId: string) => {
    try {
      const response = await fetch(
        `/api/ocr?empresaId=${empresaId}&tipo=pendentes`
      );
      const data = await response.json();
      setComprovantes(data.comprovantes || []);
    } catch (erro) {
      console.error("Erro ao carregar comprovantes:", erro);
    }
  };

  const handleUploadImagem = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || !files[0] || !usuario) return;

    const imagem = files[0];
    setCarregando(true);
    setMensagem("");
    setErro("");

    try {
      const formData = new FormData();
      formData.append("imagem", imagem);
      formData.append("empresaId", usuario.empresaId);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao fazer upload");
        return;
      }

      setComprovantes([data.comprovante, ...comprovantes]);
      setMensagem("Imagem enviada com sucesso!");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setErro("Erro ao enviar imagem");
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalConfirmacao = (comprovante: Comprovante) => {
    setModal({
      aberto: true,
      comprovante,
      dados: {
        dataMovimento: new Date().toISOString().split("T")[0],
        valor: "",
        fornecedor: "",
      },
    });
  };

  const confirmarComprovante = async () => {
    const comprovante = modal.comprovante;
    if (!comprovante || !usuario) return;

    try {
      const response = await fetch("/api/ocr/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comprovanteOCRId: comprovante.id,
          acao: "confirmar",
          dados: modal.dados,
        }),
      });

      if (response.ok) {
        setComprovantes(comprovantes.filter((c) => c.id !== comprovante.id));
        setModal({ aberto: false, comprovante: null, dados: {} as any });
        setMensagem("Comprovante confirmado!");
        setTimeout(() => setMensagem(""), 3000);
      }
    } catch (erro) {
      setErro("Erro ao confirmar comprovante");
    }
  };

  const descartarComprovante = async (comprovanteId: string) => {
    if (!usuario) return;

    try {
      const response = await fetch("/api/ocr/processar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comprovanteOCRId: comprovanteId,
          acao: "descartar",
        }),
      });

      if (response.ok) {
        setComprovantes(comprovantes.filter((c) => c.id !== comprovanteId));
        setMensagem("Comprovante descartado");
        setTimeout(() => setMensagem(""), 3000);
      }
    } catch (erro) {
      setErro("Erro ao descartar comprovante");
    }
  };

  return (
    <DashboardLayout
      titulo="OCR / Comprovantes"
      descricao="Tire fotos de comprovantes e extraia dados automaticamente"
    >
      <div className="max-w-4xl">
        {mensagem && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-400">
            {mensagem}
          </div>
        )}

        {erro && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400">
            {erro}
          </div>
        )}

        {/* Upload */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Enviar Comprovante
          </h2>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={handleUploadImagem}
              disabled={carregando}
              className="hidden"
              id="imagem"
            />
            <label htmlFor="imagem" className="cursor-pointer">
              <div className="text-5xl mb-2">📸</div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Clique para tirar foto ou selecionar arquivo
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Formatos: JPG, PNG, WebP
              </p>
            </label>
          </div>
        </div>

        {/* Comprovantes Pendentes */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Comprovantes Pendentes de Confirmação ({comprovantes.length})
          </h3>

          {comprovantes.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              Nenhum comprovante pendente
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {comprovantes.map((comp) => (
                <div
                  key={comp.id}
                  className="bg-white dark:bg-card-escuro rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                >
                  <img
                    src={comp.urlArquivo}
                    alt={comp.nomeArquivo}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {comp.nomeArquivo}
                    </p>
                    {comp.confianca !== undefined && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          Confiança do OCR
                        </p>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-turquesa"
                            style={{ width: `${(comp.confianca || 0) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => abrirModalConfirmacao(comp)}
                        className="flex-1 py-2 bg-turquesa text-white font-medium rounded-lg hover:bg-lime hover:text-gray-900 transition-colors text-sm"
                      >
                        ✓ Confirmar
                      </button>
                      <button
                        onClick={() => descartarComprovante(comp.id)}
                        className="flex-1 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        ✕ Descartar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Confirmação */}
        {modal.aberto && modal.comprovante && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-card-escuro rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Confirme os Dados
                </h3>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <img
                      src={modal.comprovante.urlArquivo}
                      alt="Comprovante"
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        value={modal.dados.dataMovimento}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            dados: {
                              ...modal.dados,
                              dataMovimento: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Valor *
                      </label>
                      <input
                        type="number"
                        value={modal.dados.valor}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            dados: {
                              ...modal.dados,
                              valor: e.target.value,
                            },
                          })
                        }
                        step="0.01"
                        placeholder="0.00"
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Fornecedor *
                      </label>
                      <input
                        type="text"
                        value={modal.dados.fornecedor}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            dados: {
                              ...modal.dados,
                              fornecedor: e.target.value,
                            },
                          })
                        }
                        placeholder="Nome do fornecedor"
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Categoria
                      </label>
                      <input
                        type="text"
                        value={modal.dados.categoria || ""}
                        onChange={(e) =>
                          setModal({
                            ...modal,
                            dados: {
                              ...modal.dados,
                              categoria: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Alimentação"
                        className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setModal({ aberto: false, comprovante: null, dados: {} as any })
                    }
                    className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarComprovante}
                    disabled={!modal.dados.valor || !modal.dados.fornecedor}
                    className="flex-1 py-2 bg-turquesa text-white font-medium rounded-lg hover:bg-lime hover:text-gray-900 transition-colors disabled:opacity-50"
                  >
                    ✓ Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
