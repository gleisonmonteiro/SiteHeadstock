import { PapelUsuario } from "../../.generated/client";

const PAPEIS_DECISAO: PapelUsuario[] = [
  "MASTER_PLATFORM",
  "AGENCY_CEO",
  "COMPANY_OWNER",
];

const PAPEIS_IMPORTACAO: PapelUsuario[] = [
  "MASTER_PLATFORM",
  "AGENCY_CEO",
  "AGENCY_MANAGER",
  "COLLABORATOR",
  "COMPANY_OWNER",
  "COMPANY_MANAGER",
  "DATA_OPERATOR",
];

export function podeVerDadosDecisao(papel: PapelUsuario) {
  return PAPEIS_DECISAO.includes(papel);
}

export function podeImportarDados(papel: PapelUsuario) {
  return PAPEIS_IMPORTACAO.includes(papel);
}

export function exigirAcessoDecisao(papel: PapelUsuario) {
  if (!podeVerDadosDecisao(papel)) throw new Error("ACESSO_RESTRITO");
}

export function exigirAcessoImportacao(papel: PapelUsuario) {
  if (!podeImportarDados(papel)) throw new Error("ACESSO_RESTRITO");
}
