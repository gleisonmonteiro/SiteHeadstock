"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const icons: Record<string, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
  master: <><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
  agencia: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /><path d="M9 9h.01M15 9h.01" /></>,
  equipes: <><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /><path d="M21 21v-2a4 4 0 0 0-3-3.85" /></>,
  upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
  vendas: <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="M22 19H2" /></>,
  metas: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M22 12h-3" /></>,
  card: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9h10M7 13h7M7 17h4" /></>,
  ocr: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="8" y="8" width="8" height="8" rx="1" /></>,
  config: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.37.37.72.6 1 .3.29.68.43 1.1.4H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z" /></>,
  producao: <><path d="M2 20h20" /><path d="M5 20V8l7-6 7 6v12" /><path d="M9 20v-5h6v5" /><circle cx="12" cy="10" r="1" /></>,
  operacional: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9l6 6M15 9l-6 6" /></>,
};

const subscribeStorage = (callback: () => void) => {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

let _dadosCache = { tipo: "", papel: "" };
let _rawCache = "";

const getUsuarioDados = () => {
  try {
    const raw = localStorage.getItem("usuario") || "{}";
    if (raw === _rawCache) return _dadosCache;
    _rawCache = raw;
    const u = JSON.parse(raw);
    _dadosCache = { tipo: u.empresa?.tipo || "", papel: u.papel || "" };
    return _dadosCache;
  } catch {
    return _dadosCache;
  }
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { tipo: tipoEmpresa, papel } = useSyncExternalStore(
    subscribeStorage,
    getUsuarioDados,
    () => ({ tipo: "", papel: "" })
  );
  const isMaster = papel === "MASTER_PLATFORM" || papel === "MASTER_CONSULTANT";
  const isOperacional = papel === "DATA_OPERATOR";
  const isCeo = papel === "COMPANY_OWNER" || papel === "COMPANY_MANAGER";
  const isVarejo = tipoEmpresa === "VAREJO" || tipoEmpresa === "SERVICOS" || tipoEmpresa === "OUTRA";

  const menuItems = [
    ...(isMaster
      ? [{ label: "Painel Master", href: "/master", icon: "master" }]
      : []),
    ...(tipoEmpresa === "AGENCIA" && !isMaster
      ? [
          { label: "Visão da Agência", href: "/agencia", icon: "agencia" },
          { label: "Equipes", href: "/agencia/equipes", icon: "equipes" },
        ]
      : []),
    // Operacional só vê movimentação de OPs
    ...(isOperacional && isVarejo
      ? [{ label: "Movimentação de OPs", href: "/producao/operacional", icon: "operacional" }]
      : []),
    // CEO vê tudo (exceto views exclusivas de operacional)
    ...(isCeo && isVarejo
      ? [{ label: "Produção", href: "/producao", icon: "producao" }]
      : []),
    ...(!isOperacional
      ? [
          {
            label: tipoEmpresa === "AGENCIA" ? "Clientes e Dados" : "Inteligência",
            href: "/dashboard",
            icon: "dashboard",
          },
          { label: "Importar Dados", href: "/uploads", icon: "upload" },
          { label: "Vendas", href: "/vendas", icon: "vendas" },
          { label: "Metas", href: "/metas", icon: "metas" },
          { label: "Card Executivo", href: "/card-executivo", icon: "card" },
          { label: "OCR / Comprovantes", href: "/ocr-comprovantes", icon: "ocr" },
        ]
      : []),
    { label: "Configurações", href: "/configuracoes", icon: "config" },
  ];

  return (
    <aside className="fixed left-0 top-0 z-50 h-screen w-16 overflow-y-auto border-r border-[var(--border-col)] bg-[rgba(5,22,27,0.96)] text-[#f2fbf8] md:w-56">
      <div className="px-3 py-4">
        <div className="mb-5 border-b border-white/10 px-0 pb-4 text-center md:px-2 md:text-left">
          <h1 className="text-lg font-extrabold tracking-[0.13em] text-[#73d9cb]">
            <span className="md:hidden">H</span>
            <span className="hidden md:inline">HEADSTOCK</span>
          </h1>
          <p className="mt-1 hidden text-[10px] tracking-wide text-[#b3ceca] md:block">
            DADOS PARA DECISÃO
          </p>
        </div>
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                className={`flex items-center justify-center gap-3 rounded-lg border px-2 py-2.5 text-[13px] transition-colors md:justify-start md:px-3 ${
                  active
                    ? "border-[#73d9cb]/25 bg-[#73d9cb]/12 font-bold text-[#8ce6da]"
                    : "border-transparent text-[#b3ceca] hover:border-white/10 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={active ? "text-[#73d9cb]" : "text-[#789b96]"}><NavIcon name={item.icon} /></span>
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
