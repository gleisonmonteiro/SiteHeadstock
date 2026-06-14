# HEADSTOCK - MVP

**Dados lapidados para decisão.**

Plataforma de inteligência gerencial para agências e empresas que transforma dados brutos em indicadores, metas e visibilidade operacional completa — vendas, projetos, equipes e clientes em um único painel.

## Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- PostgreSQL (local ou nuvem — Vercel Postgres, Railway, etc.)

### Instalação

1. **Entrar na pasta do projeto**

```bash
cd rubiart
```

2. **Instalar dependências**

```bash
npm install
```

3. **Configurar variáveis de ambiente**

Copie `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```
DATABASE_URL=postgresql://user:password@localhost:5432/headstock
AUTH_SECRET=seu-segredo-super-secreto-aqui
OCR_PROVIDER=placeholder
OCR_API_KEY=placeholder
NEXT_PUBLIC_APP_NAME=HEADSTOCK
```

4. **Rodar migrations do Prisma**

```bash
npx prisma migrate dev --name init
```

5. **Rodar seed de dados demo (opcional)**

```bash
npm run db:seed
npm run db:bootstrap
```

6. **Criar usuários reais do projeto**

```bash
npm run db:setup-usuarios
```

7. **Popular dados fictícios da FCM (opcional — para demonstração)**

```bash
npm run db:seed-fcm
```

Popula a empresa FCM (Raphael) com dados fictícios: 10 produtos, 30 posições de estoque, 432 vendas (60 dias), 30 contas a pagar e 33 contas a receber.

Cria as 4 empresas e usuários com senha `123456`:

| Email | Papel | Empresa | Visão ao logar |
|-------|-------|---------|----------------|
| `gleison@headstock.com` | MASTER_PLATFORM | Headstock | Painel de Agência — vê **todas** as empresas e clientes |
| `celso@crcom.com` | AGENCY_CEO | crcom | Painel de Agência — vê apenas os clientes da crcom |
| `raphael@fcm.com` | COMPANY_OWNER | FCM (varejo) | Dashboard comercial da FCM |
| `zac@cholet.com` | COMPANY_OWNER | Cholet (varejo) | Dashboard comercial da Cholet |

FCM está registrada como cliente da crcom. Cholet não.

7. **Iniciar servidor de desenvolvimento**

```bash
npm run dev
```

Acesse `http://localhost:3000`

## Funcionalidades do MVP

### Implementadas

- **Autenticação** — Login com email/senha, criação de conta via token
- **Dashboard Comercial** — KPIs, gráficos e resumo executivo de vendas + módulos de BI
- **Upload de Vendas** — Importar Excel/CSV com validação e normalização
- **Upload Multi-Módulo** — Planilha única com abas (Vendas, Produtos, Estoque, Contas a Pagar, Contas a Receber); upload incremental diário
- **Gestão de Vendas** — Tabela filtrada de vendas por vendedor e produto
- **Metas** — Configurar metas gerais e por vendedor com acompanhamento
- **Card Executivo** — Gerar cards de abertura/fechamento para WhatsApp
- **OCR de Comprovantes** — Upload de imagens com confirmação manual de dados
- **Painel de Agência** — Carteira de clientes, equipes, projetos e alertas operacionais
- **Equipes** — Visão por time e por colaborador: horas semana/mês, % utilização, projetos ativos e apontamentos individuais
- **Importação Operand** — Upload de xlsx exportado do Operand ag (abas: timesheet, projetos, jobs) com dedup automático por `idExterno`
- **BI de Produtos** — Catálogo com SKUs, markup médio, margem potencial e cobertura de grade
- **BI de Estoque** — Valor imobilizado, unidades, rupturas e posições por loja
- **Contas a Pagar** — Saldo aberto, vencidos, a vencer em 30 dias, maior fornecedor
- **Contas a Receber** — Saldo a receber, inadimplência, a vencer em 30 dias, maior cliente
- **Configurações** — Dados do usuário, tema claro/escuro
- **Tema Claro/Escuro** — Suporte completo com next-themes

### Gráficos Inclusos

- Vendas por dia (linha)
- Top 10 produtos (barras)
- Vendas por vendedor (barras)
- Formas de pagamento (pizza)
- Categorias (se disponível nos dados)

## Estrutura do Projeto

```
rubiart/
├── app/
│   ├── api/                         # Rotas de API
│   │   ├── auth/                   # Login, logout, criar senha, me
│   │   ├── uploads/
│   │   │   ├── route.ts            # Upload de planilha de vendas
│   │   │   └── modulos/route.ts    # Upload multi-aba (todos os módulos)
│   │   ├── dashboard/
│   │   │   ├── route.ts            # KPIs de vendas
│   │   │   └── modulos/[modulo]/route.ts  # KPIs de produtos/estoque/pagar/receber
│   │   ├── vendas/                 # Dados de vendas
│   │   ├── metas/                  # Metas gerais e por vendedor
│   │   ├── ocr/                    # OCR e comprovantes
│   │   ├── cards/                  # Cards executivos
│   │   ├── agencia/                # APIs da agência
│   │   │   ├── resumo/route.ts    # Resumo executivo da agência
│   │   │   ├── clientes/route.ts  # Lista clientes (selector no dashboard)
│   │   │   ├── equipes/
│   │   │   │   ├── route.ts       # Lista equipes com métricas por colaborador
│   │   │   │   └── [id]/route.ts  # Detalhe de equipe + apontamentos individuais
│   │   │   └── imports/
│   │   │       └── operand/route.ts  # Upload xlsx do Operand (timesheet/projetos/jobs)
│   ├── components/                 # Componentes React reutilizáveis
│   ├── services/                   # Lógica de negócio
│   │   ├── agenciaService.ts       # Resumo agência (multi-empresa para MASTER)
│   │   ├── equipeService.ts        # Métricas por time e colaborador (semana/mês)
│   │   ├── importVendasService.ts  # Importação de vendas
│   │   ├── importModulosService.ts # Importação multi-módulo (produtos/estoque/AP/AR)
│   │   ├── importOperandService.ts # Importação Operand: timesheet, projetos, jobs
│   │   └── modulosService.ts       # KPIs de produtos, estoque, contas a pagar/receber
│   ├── types/                      # TypeScript types
│   ├── lib/                        # Utilities (auth, session, prisma)
│   ├── dashboard/                  # Página Dashboard
│   ├── uploads/                    # Página Uploads
│   ├── vendas/                     # Página Vendas
│   ├── metas/                      # Página Metas
│   ├── card-executivo/             # Página Cards
│   ├── ocr-comprovantes/           # Página OCR
│   ├── agencia/                    # Painel de Agência
│   │   ├── page.tsx               # Visão executiva da agência
│   │   └── equipes/
│   │       ├── page.tsx           # Visão geral de times e colaboradores
│   │       └── [id]/page.tsx      # Detalhe do time com apontamentos individuais
│   ├── configuracoes/              # Página Configurações
│   ├── login/                      # Página Login
│   └── page.tsx                    # Redireciona para /login
├── prisma/
│   ├── schema.prisma               # Modelos de banco de dados
│   ├── seed.ts                     # Seed inicial
│   ├── bootstrap-headstock.ts      # Dados demo de agência
│   ├── setup-usuarios.ts           # Cria as 4 empresas/usuários do projeto
│   └── seed-fcm.ts                 # Dados fictícios da FCM (demonstração)
├── public/                         # Assets estáticos
├── tailwind.config.ts              # Configuração Tailwind
└── package.json
```

## Database Schema

### Empresas e Usuários

- **Empresa** — Dados da empresa, suporta tipos: AGENCIA, VAREJO, SERVICOS, OUTRA
- **Usuario** — Usuários com papéis: MASTER_PLATFORM, COMPANY_OWNER, AGENCY_CEO, COLLABORATOR, etc.
- **TokenSenha** — Tokens para criação/reset de senha com expiração

### Comercial

- **Upload** — Histórico de uploads de planilhas
- **Venda** — Dados de vendas importados (produto, vendedor, valor, categoria, forma de pagamento, loja, `cdProduto`, `nrTransacao`, `vlBruto`, `tpSituacao`, `cdSeqgrupo`)
- **Meta** — Metas gerais por mês/ano
- **MetaVendedor** — Metas individuais por vendedor
- **CardExecutivo** — Cards gerados para WhatsApp

### BI Operacional (TOTVS-compatible)

- **ProdutoCatalogo** — Catálogo de produtos por empresa (chave: `empresaId` + `cdProduto`); campos: código, descrição, marca, grupo, cor, tamanho, preço de venda, custo
- **ItemEstoque** — Posições de estoque por produto/loja/data (chave única: `empresaId` + `cdProduto` + `loja` + `dataRef`); upsert incremental
- **ContaPagar** — Títulos a pagar: fornecedor, vencimento, valor, situação (`N`=aberto, `B`=baixado), valor pago
- **ContaReceber** — Faturas a receber: cliente, vencimento, valor, situação (`1`=aberto, `2`=recebido), valor pago

### Agência

- **ClienteAgencia** — Carteira de clientes da agência com contrato e horas
- **RelacionamentoGestao** — Vínculo entre agência e empresa cliente com escopos e status
- **Equipe** e **EquipeMembro** — Times internos com capacidade semanal e custo/hora
- **Projeto** — Projetos com status, saúde, progresso e próximas entregas; suporta `idExterno` e `fonteImportacao` para upsert de dados do Operand
- **Job** — Tarefas/Jobs do Operand vinculados a projetos e clientes; campos: `nome`, `etapa`, `nomeResponsavel`, `status`, `prazo`, `categoria`, `idExterno`
- **AtualizacaoProjeto** — Histórico de atualizações de saúde e progresso
- **ApontamentoHora** — Timesheet de horas; `usuarioId` opcional (colaboradores do Operand sem conta no Headstock ficam em `nomeColaborador`); `idExterno` garante dedup em reimportações

### OCR

- **ComprovanteOCR** — Imagens de comprovantes capturados
- **MovimentoOCR** — Dados financeiros extraídos dos comprovantes

## Paleta de Cores

- **Turquesa**: `#00B8C6` (cor primária)
- **Lime**: `#C8F34D` (cor secundária)
- **Fundo Escuro**: `#0A1F1F`
- **Card Escuro**: `#0F2A2A`
- **Borda Escura**: `#1F3A3A`
- **Accent Dark**: `#5EEAD4`
- **Texto Secundário**: `#94A3B8`
- **Texto Claro**: `#F9FAFB`

## Controle de Acesso por Papel

| Papel | Acesso |
|-------|--------|
| `MASTER_PLATFORM` | Vê dados de todas as empresas e agências da plataforma |
| `AGENCY_CEO` / `AGENCY_MANAGER` | Vê apenas dados da própria agência e seus clientes cadastrados |
| `COMPANY_OWNER` / `COMPANY_MANAGER` | Vê apenas dados da própria empresa (dashboard varejo) |
| `COLLABORATOR` / `DATA_OPERATOR` | Acesso restrito ao escopo da empresa |

**Redirect pós-login:**
- Empresa tipo `AGENCIA` → `/agencia` (Painel de Agência)
- Demais tipos → `/dashboard` (Dashboard comercial)

**Scripts de banco:**

```bash
npm run db:seed             # Cria empresa e usuário inicial
npm run db:bootstrap        # Popula Headstock com dados demo de agência
npm run db:setup-usuarios   # Cria as 4 empresas e usuários do projeto
npm run db:seed-fcm         # Popula FCM com dados fictícios para demonstração
```

## Upload Multi-Módulo

O endpoint `POST /api/uploads/modulos` aceita um `.xlsx` com abas nomeadas. A aba pode ter qualquer nome listado abaixo:

| Módulo | Nomes de aba aceitos |
|--------|---------------------|
| Vendas | `vendas`, `venda`, `faturamento` |
| Produtos | `produtos`, `produto`, `bi_produto`, `catálogo`, `catalogo` |
| Estoque | `estoque`, `estoques` |
| Contas a Pagar | `contas a pagar`, `contaspagar`, `contas_pagar`, `a pagar`, `pagar` |
| Contas a Receber | `contas a receber`, `contasreceber`, `contas_receber`, `a receber`, `receber` |

**Colunas mínimas por aba:**

| Aba | Colunas obrigatórias |
|-----|---------------------|
| Vendas | `data` (ou `DT_EMISSAO`), `ds_produto`, `qt_venda`, `vl_total_venda`, `nome_vendedor` |
| Produtos | `cd_produto`, `descricao` (ou `DS_PRODUTO`) |
| Estoque | `cd_produto`, `estoque` (ou `QT_SALDO`) |
| Contas a Pagar | `fornecedor` (ou `NM_FORNECEDOR`), `dt_vencimento`, `vl_duplicata` |
| Contas a Receber | `nm_cliente` (ou `NM_CLIENTE`), `dt_vencimento`, `vl_fatura` |

Produtos e Estoque fazem **upsert** (upload diário incrementa sem duplicar). Contas a Pagar/Receber fazem **create** (cada upload registra novos títulos).

## Segurança

- Senhas com bcryptjs (10 rounds)
- Tokens com expiração configurável
- Filtro de `empresaId` em todas as queries (exceto MASTER_PLATFORM)
- Validação no servidor de upload
- HttpOnly cookies para sessão

## Compatibilidade

- Desktop
- Mobile (responsive)
- Vercel Hobby (sem workers)
- Tema claro/escuro

## Deploy na Vercel

1. **Push para GitHub**

```bash
git push origin main
```

2. **Conectar Vercel ao repositório**

Acesse https://vercel.com/import

3. **Configurar Environment Variables**

No dashboard da Vercel, adicione:
- `DATABASE_URL`
- `AUTH_SECRET`
- `OCR_PROVIDER`
- `OCR_API_KEY`
- `NEXT_PUBLIC_APP_NAME`

4. **Deploy automático**

Cada push fará deploy automático.

## Importação do Operand

O endpoint `POST /api/agencia/imports/operand` aceita `.xlsx` ou `.xls` exportados diretamente do Operand ag (menu Relatórios). Cada colaborador exporta seu próprio timesheet; o sistema consolida tudo para a visão do Celso.

| Aba (nome real no Operand) | O que importa |
|---------------------------|---------------|
| `Relatório de Timesheet` | Horas por colaborador/projeto/cliente → `ApontamentoHora` |
| `Relatório de Jobs Pauta` | Jobs com responsável, prazo e status → `Job` |
| `Relatório de Projetos Pauta` | Projetos e jobs vinculados → `Projeto` + `Job` |
| `Relatório de Clientes` | Carteira de clientes → `ClienteAgencia` |

O sistema também aceita nomes genéricos (`timesheet`, `projetos`, `jobs`, `clientes`) e faz **auto-detecção pelo cabeçalho** quando o nome da aba não é reconhecido.

**Colunas reais por exportação:**

| Exportação | Colunas-chave |
|------------|--------------|
| Timesheet detalhado | `Usuário`, `Data Fim` (serial Excel), `Tempo` (fração de dia × 24 = horas), `Projeto`, `Grupo de Clientes`, `Nº Doc`, `Título Doc`, `RT` (Sim = retrabalho) |
| Jobs Pauta | `Nº Doc`, `Título`, `Grupo de Clientes`, `Projeto`, `Responsável`, `Situação do Job`, `Prazo`, `Tempo Realizado em Minutos` |
| Projetos Pauta | `Projeto`, `Cliente`, `Situação do Projeto`, `Prazo estimado` (+ `Nº Doc`/`Título Doc` para jobs embutidos) |
| Clientes | `Nome`, `Situação` |

Re-importar o mesmo arquivo é idempotente — o sistema usa `idExterno` para upsert sem duplicar. Entradas de Timer (muitas linhas minúsculas por job/dia) são agregadas automaticamente em um único apontamento por colaborador/dia/job.

## Próximos Passos (Fora do MVP)

- [x] Template Excel para download — gerado via `prisma/generate-modelos.ts` → `modelos-upload/`
- [x] Equipes — visão por time e colaborador com horas semana/mês e % utilização
- [x] Importação Operand — timesheet, projetos e jobs via xlsx multi-aba com dedup
- [ ] Integração via API do Operand (financeiro — substitui upload manual)
- [ ] Gráficos e visualizações para Estoque, Produtos, AP e AR
- [ ] Integração real com OCR (Tesseract.js ou API externa)
- [ ] WhatsApp automático via API
- [ ] Fila de processamento para arquivos grandes
- [ ] Plano de assinatura e cobrança
- [ ] API pública
- [ ] Permissões granulares por módulo

## Troubleshooting

**Módulos de BI mostram "AGUARDANDO INGESTÃO" mesmo com dados no banco**
O singleton do Prisma em memória pode estar desatualizado após mudanças no schema. Reinicie o servidor de desenvolvimento:
```powershell
cd "c:\Codex\Rubiart\rubiart"; Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue; npm run dev
```

**Erro de conexão com banco**
Verifique se `DATABASE_URL` está corretamente configurada em `.env`.

**Imagens do OCR não aparecem**
Certifique-se de que a imagem está em base64 ou tem acesso CORS configurado.

**Dark mode não funciona**
O HTML root precisa de `suppressHydrationWarning` — já configurado no layout raiz.

## Contato

Para dúvidas ou melhorias, abra uma issue no repositório.

---

**© 2026 HEADSTOCK** — Dados lapidados para decisão.
