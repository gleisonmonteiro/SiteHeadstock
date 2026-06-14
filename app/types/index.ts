export interface AuthPayload {
  usuarioId: string;
  email: string;
  empresaId: string;
}

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface CriarSenhaRequest {
  token: string;
  senha: string;
  confirmacaoSenha: string;
}

export interface ImportarVendasRequest {
  linhas: VendaInput[];
  uploadId: string;
}

export interface VendaInput {
  data_venda: string;
  valor_venda: number;
  produto: string;
  quantidade: number;
  vendedor: string;
  cliente?: string;
  forma_pagamento?: string;
  categoria?: string;
  marca?: string;
  custo?: number;
  loja?: string;
  canal_venda?: string;
  desconto?: number;
}
