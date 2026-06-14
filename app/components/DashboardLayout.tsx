"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

interface DashboardLayoutProps {
  children: ReactNode;
  titulo: string;
  descricao?: string;
}

export function DashboardLayout({
  children,
  titulo,
  descricao,
}: DashboardLayoutProps) {
  return (
    <div className="rubiart-app flex h-screen">
      <Sidebar />
      <div className="rubiart-content ml-16 flex min-w-0 flex-1 flex-col md:ml-56">
        <Header titulo={titulo} descricao={descricao} />
        <main className="flex-1 overflow-auto">
          <div className="rubiart-main">{children}</div>
        </main>
      </div>
    </div>
  );
}
