"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(data.erro || "Erro ao fazer login");
        return;
      }

      localStorage.setItem(
        "usuario",
        JSON.stringify({
          id: data.usuario.id,
          nome: data.usuario.nome,
          email: data.usuario.email,
          empresaId: data.usuario.empresaId,
          papel: data.usuario.papel,
          empresa: data.usuario.empresa,
        })
      );

      const papel = data.usuario.papel;
      const tipoEmpresa = data.usuario.empresa?.tipo;
      const destino =
        papel === "MASTER_PLATFORM" || papel === "MASTER_CONSULTANT"
          ? "/master"
          : tipoEmpresa === "AGENCIA"
          ? "/agencia"
          : "/dashboard";
      router.push(destino);
    } catch {
      setErro("Erro ao conectar com o servidor");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute right-5 top-5 z-10">
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-[860px] overflow-hidden rounded-[14px] border border-[var(--border-col)] bg-[var(--bg-panel)] shadow-[var(--shadow-panel)] md:grid-cols-[0.86fr_1.14fr]">
        <section className="relative hidden min-h-[440px] flex-col justify-between overflow-hidden border-r border-white/10 bg-[#061b20] p-8 text-[#f2fbf8] md:flex">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#73d9cb]/10 blur-3xl" />
          <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full bg-[#e6c071]/8 blur-3xl" />

          <div className="relative">
            <Image
              src="/headstock-symbol-white.png"
              alt=""
              width={852}
              height={415}
              priority
              className="mb-7 h-auto w-20"
            />

            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#73d9cb]">
              Inteligência gerencial
            </p>
            <h1 className="mt-3 font-['Arial_Rounded_MT_Bold','Trebuchet_MS',var(--font-geist-sans)] text-3xl font-bold tracking-[0.08em]">
              HEADSTOCK
            </h1>
            <p className="mt-4 max-w-[270px] text-sm leading-6 text-[#b3ceca]">
              Dados organizados, riscos antecipados e decisões mais claras para
              sua empresa.
            </p>
          </div>

          <div className="relative border-t border-white/10 pt-5">
            <p className="text-xs leading-5 text-[#88a8a3]">
              Gestão de vendas, metas, equipes, projetos e indicadores em uma
              única visão.
            </p>
          </div>
        </section>

        <section className="px-6 py-8 sm:px-10 md:px-12 md:py-10">
          <div className="mb-7 md:hidden">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
              Inteligência gerencial
            </p>
            <h1 className="mt-2 font-['Arial_Rounded_MT_Bold','Trebuchet_MS',var(--font-geist-sans)] text-2xl font-bold tracking-[0.08em] text-[var(--text-primary)]">
              HEADSTOCK
            </h1>
          </div>

          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
              Acesso seguro
            </p>
            <h2 className="mt-2 text-xl font-extrabold text-[var(--text-primary)]">
              Entre na sua conta
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Use seu e-mail e senha para acessar o painel.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {erro && (
              <div
                role="alert"
                className="mb-4 rounded-[8px] border border-[#ef8e78]/35 bg-[#ef8e78]/10 px-3 py-2.5 text-xs text-[#ef8e78]"
              >
                {erro}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
                >
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="h-10 w-full rounded-[8px] border border-[rgba(13,76,75,0.24)] bg-[#f5fbf8] px-3 text-sm text-[#102c29] outline-none transition focus:border-[#73d9cb] focus:ring-3 focus:ring-[#73d9cb]/10"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="senha"
                  className="mb-1.5 block text-xs font-bold text-[var(--text-primary)]"
                >
                  Senha
                </label>
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  className="h-10 w-full rounded-[8px] border border-[rgba(13,76,75,0.24)] bg-[#f5fbf8] px-3 text-sm text-[#102c29] outline-none transition focus:border-[#73d9cb] focus:ring-3 focus:ring-[#73d9cb]/10"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="mt-6 h-10 w-full rounded-[8px] border border-[#8ad7aa] bg-[#b9f0ce] text-sm font-extrabold text-[#07161a] transition hover:bg-[#a7e7c1] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-6 border-t border-[var(--border-col)] pt-5 text-center">
            <p className="text-xs text-[var(--text-secondary)]">
              Primeiro acesso?{" "}
              <Link
                href="/criar-senha"
                className="font-bold text-[var(--accent)] hover:underline"
              >
                Criar senha
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
