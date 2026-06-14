"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function FormularioCriarSenha() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [senha, setSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [erro, setErro] = useState(
    token ? "" : "Token não fornecido. Verifique o link de convite."
  );
  const [sucesso, setSucesso] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso("");
    setCarregando(true);

    if (senha !== confirmacaoSenha) {
      setErro("Senhas não conferem");
      setCarregando(false);
      return;
    }

    if (senha.length < 6) {
      setErro("Senha deve ter no mínimo 6 caracteres");
      setCarregando(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/criar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          senha,
          confirmacaoSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao criar senha");
        return;
      }

      setSucesso("Senha criada com sucesso! Redirecionando para login...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setErro("Erro ao conectar com servidor");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-fundo-escuro px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-turquesa to-lime mb-2">
            HEADSTOCK
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Criar sua senha
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white dark:bg-card-escuro rounded-lg p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Defina sua Senha
            </h2>

            {erro && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                {erro}
              </div>
            )}

            {sucesso && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-400 text-sm">
                {sucesso}
              </div>
            )}

            {token && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-turquesa"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirmar Senha
                  </label>
                  <input
                    type="password"
                    value={confirmacaoSenha}
                    onChange={(e) => setConfirmacaoSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-turquesa"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full py-2 bg-gradient-to-r from-turquesa to-lime text-gray-900 font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {carregando ? "Criando..." : "Criar Senha"}
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>
              Já tem senha?{" "}
              <Link
                href="/login"
                className="text-turquesa hover:text-lime font-medium"
              >
                Fazer Login
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CriarSenhaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-[var(--text-secondary)]">
          Carregando...
        </div>
      }
    >
      <FormularioCriarSenha />
    </Suspense>
  );
}
