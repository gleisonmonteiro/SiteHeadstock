# HEADSTOCK — Contexto para agentes de IA

## O que é

Plataforma de gestão gerencial para agências de marketing e empresas de varejo. Três perfis distintos compartilham o mesmo codebase:

- **MASTER_PLATFORM** (`gleison@headstock.com`) — CEO/dev da plataforma. Vê **todas** as agências e empresas. Dashboard em `/master` mostra overview global, saúde por agência, alertas críticos, gauge de infraestrutura Vercel→AWS e feed de atividade. Pode enviar "cards" para qualquer agência.
- **AGÊNCIAS** (`celso@crcom.com` e `gleison@radiolawifi.com`) — CEOs de agências independentes. Cada um vê somente sua agência e seus clientes.
- **VAREJO CEO** (`raphael@fcm.com`, `zac@cholet.com`) — dashboards comerciais e operacionais da própria empresa.
- **VAREJO OPERACIONAL** (`funcionario@fcm.com`) — importa dados e movimenta OPs, sem vendas, metas ou financeiro.

Relacionamentos de apresentação:

- FCM é independente e não pertence à CRcom.
- Cholet é cliente conectado exclusivamente da Radiola WiFi.
- `gleison@headstock.com` e `gleison@radiolawifi.com` são identidades distintas.

Redirect pós-login: `MASTER_PLATFORM`/`MASTER_CONSULTANT` → `/master`; `AGENCIA` → `/agencia`; demais → `/dashboard`.

---

## Restrições críticas — NÃO implemente sem autorização explícita

- **Financeiro da agência** (lançamentos, contas) — será via API do Operand futuramente. Não implementar.
- Fase 1 (Timesheet → equipes) e Fase 3 (Projetos + Jobs) estão implementadas. Fase 2 = financeiro, bloqueada.

---

## Stack e convenções

- **Next.js 16 App Router** — as APIs podem divergir do treinamento. Leia `node_modules/next/dist/docs/` antes de criar rotas novas.
- Páginas interativas: `"use client"` obrigatório no topo.
- Rotas de API: `app/api/*/route.ts`, exportando `GET`/`POST` nomeados.
- **Prisma** com output customizado em `.generated` — verifique os imports em cada service.
- **PostgreSQL**. Migrations: use sempre `npx prisma db push --accept-data-loss`. **Nunca `migrate dev`** — o banco tem drift histórico e `migrate dev` falha.

---

## Gotchas que quebram silenciosamente

### Importação do Operand ag

| Campo | Valor real | Armadilha |
|-------|-----------|-----------|
| `Tempo` (timesheet) | Fração de **DIA** | Multiplicar por 24 para obter horas. `0.0007 * 24 ≈ 1 min`. |
| `Data Fim` | Serial Excel com decimal (`46182.73...`) | Regex `^\d{5,}$` não captura. Usar `^\d{5,}(\.\d*)?$` + `Math.floor`. |
| `Usuário` | Nome do colaborador | Coluna chama `Usuário`, não `Colaborador`. |
| `Grupo de Clientes` | Nome do cliente | Pode estar vazio — buscar cliente pelo projeto como fallback. |
| Entradas de Timer | N linhas minúsculas por job/dia | Agregar por `(Usuário, data, Nº Doc, Projeto)` antes de salvar. |

**Nomes reais das abas** nas exportações do Operand:
- `Relatório de Timesheet` → parser de timesheet
- `Relatório de Jobs Pauta` → parser de jobs
- `Relatório de Projetos Pauta` → parser de projetos (hierárquico: linha com `Situação do Projeto` = projeto; linha com `Nº Doc` = job)
- `Relatório de Clientes` → parser de clientes (`Nome`, `Situação`)

`detectarTipoAba()` em `importOperandService.ts` faz fallback por colunas quando o nome da aba não bate.

### ApontamentoHora e usuários

`usuarioId` é opcional — colaboradores do Operand não têm conta no Headstock. Eles ficam em `nomeColaborador` (string). O `equipeService.ts` faz match por slug de nome para vincular ao time correto. Guards em `agenciaService.ts` protegem contra `null` no `usuarioId`.

### idExterno e dedup

Timesheet: `op|ts|{slugUsuario}|{dateISO}|{numDoc}|{slugProjeto}` — upsert idempotente, reimportar o mesmo arquivo é seguro.

---

## Arquivos-chave por domínio

### Master (Gleison)
| Arquivo | Responsabilidade |
|---------|-----------------|
| `app/master/page.tsx` | Dashboard master: KPIs globais, cards por agência, alertas, gauge de infra, feed de atividade |
| `app/services/masterService.ts` | Queries cross-agência: overview, agências com métricas, alertas críticos, feed de atividade |
| `app/api/master/overview/route.ts` | GET KPIs globais |
| `app/api/master/agencias/route.ts` | GET lista de agências com métricas |
| `app/api/master/alertas/route.ts` | GET alertas críticos (projetos CRITICO/VENCIDO/ATENCAO) |
| `app/api/master/atividade/route.ts` | GET feed de atividade recente |
| `app/api/master/cards/route.ts` | POST cria CardExecutivo do tipo ALERTA_MASTER para uma agência |

### Agência (Celso)
| Arquivo | Responsabilidade |
|---------|-----------------|
| `app/services/importOperandService.ts` | Parsers para todos os formatos Operand; `detectarTipoAba()` |
| `app/api/agencia/imports/operand/route.ts` | POST xlsx — roteamento por aba + auto-detecção |
| `app/services/equipeService.ts` | `obterEquipes()`, `obterEquipeDetalhe()` — agrega horas por colaborador |
| `app/api/agencia/equipes/route.ts` | GET lista de equipes com métricas |
| `app/api/agencia/equipes/[id]/route.ts` | GET detalhe de equipe + apontamentos individuais |
| `app/agencia/equipes/page.tsx` | UI: cards por time, upload Operand embutido |
| `app/agencia/equipes/[id]/page.tsx` | UI: KPIs + drill-down por membro |
| `app/services/campanhaService.ts` | Campanhas, métricas de atribuição, decisão de rota e snapshot de card |
| `app/api/agencia/campanhas/route.ts` | GET visão executiva; POST cadastro, métricas, estratégia e cards |
| `app/agencia/campanhas/page.tsx` | UI de Performance de Campanhas e exportação do card em PNG |
| `app/services/gestaoEquipeService.ts` | `obterGestaoEquipes()` — overview de colaboradores, equipes e projetos; CRUD de colaboradores, equipes, clientes e projetos; registro manual de horas; atualização de progresso/saúde de projeto |
| `app/api/agencia/gestao-equipes/route.ts` | GET dados consolidados de gestão; POST criação de colaborador, equipe, cliente, projeto, apontamento e atualização de projeto |

### Varejo (Raphael/Zac)
| Arquivo | Responsabilidade |
|---------|-----------------|
| `app/services/importVendasService.ts` | Importação de vendas |
| `app/services/importModulosService.ts` | Multi-módulo: produtos, estoque, AP, AR |
| `app/services/modulosService.ts` | KPIs de produtos, estoque, contas |
| `app/services/importProducaoService.ts` | Parser do Excel de produção (PRODUÇÃO BI 2026.xlsx); agrupa por documento (OP), cria ProgramacaoOP padrão se não existir, posiciona OPs na etapa COST. EXT. |
| `app/services/producaoService.ts` | CRUD de OPs, movimentação de etapas, KPIs de produção (tempo médio por etapa, OPs por status) |
| `app/api/producao/programacoes/route.ts` | GET/POST programações (CEO apenas) |
| `app/api/producao/ops/route.ts` | GET lista de OPs (CEO + DATA_OPERATOR) |
| `app/api/producao/ops/[id]/movimentar/route.ts` | POST movimentar OP para próxima etapa — timestamps imutáveis, gerados pelo servidor |
| `app/api/producao/imports/route.ts` | POST importar Excel de produção |
| `app/producao/page.tsx` | Visão CEO: pipeline kanban por etapa + tabela completa + importação de Excel |
| `app/producao/operacional/page.tsx` | Visão DATA_OPERATOR: cards de OPs em andamento + modal de confirmação de movimentação |

### Shared
| Arquivo | Responsabilidade |
|---------|-----------------|
| `app/lib/session.ts` | `exigirUsuarioSessao()` — lança erro se não autenticado |
| `app/lib/access.ts` | `exigirAcessoDecisao()` / `exigirAcessoImportacao()` — guards de papel; `podeVerDadosDecisao()` / `podeImportarDados()` para checks não-bloqueantes |
| `app/lib/prisma.ts` | Singleton do Prisma |
| `app/components/Sidebar.tsx` | Navegação — itens variam por `empresa.tipo` |
| `app/components/bi/BIKit.tsx` | Primitivos de UI reutilizáveis para dashboards BI (`BISection`, etc.) |
| `app/components/bi/EstoqueDashboard.tsx` | Dashboard de estoque — componente reutilizável entre clientes |

---

## Controle de acesso

`exigirUsuarioSessao(request)` — chame no início de toda rota de API. Retorna `{ empresaId, empresa: { tipo }, nome, papel, ... }`.

Para guards de papel, use `app/lib/access.ts`:
- `exigirAcessoDecisao(papel)` — lança `ACESSO_RESTRITO` se não for MASTER, AGENCY_CEO ou COMPANY_OWNER.
- `exigirAcessoImportacao(papel)` — lança `ACESSO_RESTRITO` se não tiver permissão de importação.
- `podeVerDadosDecisao(papel)` / `podeImportarDados(papel)` — checks booleanos sem lançar erro.

Filtrar todas as queries por `empresaId` / `agenciaId`. Exceção: MASTER_PLATFORM não precisa de filtro.

Redirect pós-login: `AGENCIA` → `/agencia`; demais → `/dashboard`.

### Papéis de cliente (VAREJO/SERVICOS)

| Papel | Acesso |
|-------|--------|
| `COMPANY_OWNER` | Tudo: dashboards financeiros, OPs, importação, configurações |
| `DATA_OPERATOR` | Movimentação de OPs e importações por módulo; sem dashboards, vendas, metas ou financeiro |

**Sidebar** — `DATA_OPERATOR` vê "Movimentação de OPs", "Importar Dados" e "Configurações". Todas as rotas decisórias devem bloquear perfis operacionais no servidor.

Somente `MASTER_PLATFORM`, `AGENCY_CEO` e `COMPANY_OWNER` acessam vendas e
visões decisórias. CEOs também podem executar rotinas operacionais.

## Importações e TOTVS

- A disposição permanece separada por produtos, estoque, pagar, receber e vendas.
- `Empresa.usaTotvs` inicia falsa.
- Ao marcar Planilha TOTVS e concluir uma importação, a preferência fica salva.
- Clientes sem TOTVS usam layout próprio no mesmo módulo de importação.

### Modelos de produção

```
ProgramacaoOP → EtapaProgramacao (ordered by ordem)
OrdemProducao → ItemOP (grade cor × tamanho)
OrdemProducao → MovimentacaoOP (stage history)
MovimentacaoOP.dataEntrada / dataSaida — SEMPRE set pelo servidor, nunca pelo cliente
```

Regra: `OrdemProducao.programacaoId` não pode ser alterado após existir qualquer `MovimentacaoOP`. Enforçar no service antes de update.

Programação padrão criada automaticamente no primeiro import: CORTE → COST. EXT. → COST. INT. → LIMPEZA → ACABAMENTO → DPA.

---

## Schema — modelos principais

```
Empresa → Usuario (many)
Empresa → ClienteAgencia (many)    ← carteira de clientes da agência
ClienteAgencia → Projeto (many)
ClienteAgencia → CampanhaMarketing → MetricaCampanha
CampanhaMarketing → CardCampanha
Projeto → Job (many)
ApontamentoHora → Projeto? → ClienteAgencia?
Equipe → EquipeMembro → Usuario
Empresa → ProgramacaoOP → EtapaProgramacao
Empresa → OrdemProducao → ItemOP (grade cor×tam)
OrdemProducao → MovimentacaoOP → EtapaProgramacao
```

Campos não-óbvios:
- `Projeto.idExterno` / `Job.idExterno` / `ApontamentoHora.idExterno` — chave de dedup do Operand
- `ApontamentoHora.nomeColaborador` — nome livre (sem conta Headstock)
- `ApontamentoHora.fonteImportacao` — `"operand"` ou `"operand_resumo"`

---

## Paleta (CSS vars em `globals.css`)

`--turquesa: #00B8C6` · `--lime: #C8F34D` · `--bg-dark: #0A1F1F` · `--card-dark: #0F2A2A` · `--border-col: #1F3A3A`
