"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";

interface Card {
  id: string;
  tipo: string;
  mensagem: string;
  dataReferencia: string;
}

export default function CardExecutivoPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [tipoCard, setTipoCard] = useState<"abertura" | "fechamento">("abertura");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    const usuarioStorage = localStorage.getItem("usuario");
    if (usuarioStorage) {
      const dados = JSON.parse(usuarioStorage);
      setUsuario(dados);
      carregarCards(dados.empresaId);
    }
  }, []);

  const carregarCards = async (empresaId: string) => {
    try {
      const response = await fetch(`/api/cards?empresaId=${empresaId}`);
      const data = await response.json();
      setCards(data.cards || []);
    } catch (erro) {
      console.error("Erro ao carregar cards:", erro);
    }
  };

  const gerarCard = async () => {
    if (!usuario) return;

    setCarregando(true);
    setMensagem("");

    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: usuario.empresaId,
          tipo: tipoCard,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCards([data.card, ...cards]);
        setMensagem("Card gerado com sucesso!");
        setTimeout(() => setMensagem(""), 3000);
      }
    } catch (erro) {
      console.error("Erro ao gerar card:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const copiarParaClipboard = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setMensagem("Copiado para a área de transferência!");
    setTimeout(() => setMensagem(""), 2000);
  };

  const abrirWhatsapp = (texto: string) => {
    const mensagemCodificada = encodeURIComponent(texto);
    window.open(`https://wa.me/?text=${mensagemCodificada}`, "_blank");
  };

  return (
    <DashboardLayout
      titulo="Card Executivo"
      descricao="Gere cards para enviar pelo WhatsApp"
    >
      <div className="max-w-4xl">
        {mensagem && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-400">
            {mensagem}
          </div>
        )}

        {/* Gerador */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Gerar Card
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tipo de Card
              </label>
              <select
                value={tipoCard}
                onChange={(e) =>
                  setTipoCard(e.target.value as "abertura" | "fechamento")
                }
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-turquesa"
              >
                <option value="abertura">📊 Card de Abertura (Mês)</option>
                <option value="fechamento">📋 Card de Fechamento (Dia)</option>
              </select>
            </div>

            <button
              onClick={gerarCard}
              disabled={carregando}
              className="w-full py-3 bg-gradient-to-r from-turquesa to-lime text-gray-900 font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {carregando ? "Gerando..." : "Gerar Card"}
            </button>
          </div>
        </div>

        {/* Cards Gerados */}
        <div className="space-y-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cards Recentes
          </h3>

          {cards.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">
              Nenhum card gerado ainda
            </p>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className="bg-white dark:bg-card-escuro rounded-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="inline-block px-3 py-1 bg-turquesa/20 text-turquesa dark:bg-lime/20 dark:text-lime rounded-full text-sm font-medium mb-2">
                      {card.tipo === "abertura"
                        ? "📊 Abertura"
                        : "📋 Fechamento"}
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(card.dataReferencia).toLocaleDateString(
                        "pt-BR"
                      )}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded mb-4 text-sm text-gray-900 dark:text-gray-200 whitespace-pre-wrap font-mono">
                  {card.mensagem}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => copiarParaClipboard(card.mensagem)}
                    className="flex-1 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    📋 Copiar
                  </button>
                  <button
                    onClick={() => abrirWhatsapp(card.mensagem)}
                    className="flex-1 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                  >
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
