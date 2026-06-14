"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<any>(null);
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    const usuarioStorage = localStorage.getItem("usuario");
    if (usuarioStorage) {
      setUsuario(JSON.parse(usuarioStorage));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("usuario");
    router.push("/login");
  };

  const downloadModelo = () => {
    const csv =
      "data_venda,valor_venda,produto,quantidade,vendedor,cliente,forma_pagamento,categoria,marca,custo,loja,canal_venda,desconto\n2024-01-15,150.00,Produto A,2,João,Cliente X,Dinheiro,Eletrônicos,Marca A,100.00,Loja 1,Online,0";
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    );
    element.setAttribute("download", "modelo_vendas.csv");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <DashboardLayout
      titulo="Configurações"
      descricao="Gerencie suas preferências e dados"
    >
      <div className="max-w-4xl space-y-8">
        {/* Dados da Empresa */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            📊 Dados da Empresa
          </h3>

          {usuario && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ID da Empresa
                </label>
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-200">
                  {usuario.empresaId}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dados do Usuário */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            👤 Dados do Usuário
          </h3>

          {usuario && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nome
                </label>
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-200">
                  {usuario.nome}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-gray-200">
                  {usuario.email}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tema */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🎨 Aparência
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 dark:text-white font-medium">
                Tema Claro/Escuro
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Alterne entre modo claro e escuro
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {/* Modelo de Planilha */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            📥 Modelo de Planilha
          </h3>

          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Baixe o modelo de planilha CSV para importar vendas com os campos
            corretos.
          </p>

          <button
            onClick={downloadModelo}
            className="w-full py-3 border-2 border-turquesa text-turquesa dark:text-lime dark:border-lime font-bold rounded-lg hover:bg-turquesa/10 dark:hover:bg-lime/10 transition-all"
          >
            📥 Baixar Modelo (CSV)
          </button>
        </div>

        {/* Sobre */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            ℹ️ Sobre
          </h3>

          <div className="space-y-4">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">HEADSTOCK</p>
              <p className="text-gray-600 dark:text-gray-400">
                Inteligência gerencial para decisões melhores
              </p>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p>Versão: 1.0.0 (MVP)</p>
              <p>
                Uma plataforma de gestão assistida para pequenas empresas.
              </p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🚪 Sair
          </h3>

          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors"
          >
            Fazer Logout
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
