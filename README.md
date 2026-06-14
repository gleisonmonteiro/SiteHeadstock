# Headstock

Plataforma multiempresa de inteligência gerencial para agências de marketing,
varejos e operações com fontes de dados heterogêneas.

O Headstock organiza dados de ERP, planilhas, OCR e preenchimento manual em
visões executivas, operacionais e alertas.

## Stack

- Next.js 16 App Router
- React 19 e TypeScript
- Prisma 7 com PostgreSQL
- Tailwind CSS 4 e Recharts
- Importação Excel com `xlsx`

## Preparação local

```powershell
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run db:prepare-apresentacao
npm run dev
```

Banco local esperado: `headstock`.

Não use `prisma migrate dev`: este projeto possui histórico de drift e utiliza
`prisma db push --accept-data-loss`.

## Contas de apresentação

| Usuário | Senha | Papel | Visão |
|---|---:|---|---|
| `gleison@headstock.com` | `123456` | `MASTER_PLATFORM` | Administração global da plataforma |
| `celso@crcom.com` | `123456` | `AGENCY_CEO` | CEO da agência CRcom |
| `gleison@radiolawifi.com` | `123456` | `AGENCY_CEO` | CEO da agência Radiola WiFi |
| `raphael@fcm.com` | `123456` | `COMPANY_OWNER` | CEO da FCM |
| `funcionario@fcm.com` | `12346` | `DATA_OPERATOR` | Produção e importações da FCM |
| `zac@cholet.com` | `123456` | `COMPANY_OWNER` | CEO da Cholet |

As duas contas Gleison são identidades independentes:

- `gleison@headstock.com` administra a plataforma;
- `gleison@radiolawifi.com` opera como CEO de uma agência cliente.

## Relacionamentos atuais

- FCM é uma empresa independente, pertencente ao Raphael.
- Cholet é uma empresa independente e cliente conectado da Radiola WiFi.
- CRcom não possui acesso à Cholet nem à FCM.
- Dados permanecem na empresa proprietária e são visualizados por vínculo
  autorizado.

## Matriz de acesso

### Decisão

`MASTER_PLATFORM`, `AGENCY_CEO` e `COMPANY_OWNER` podem acessar vendas,
dashboards, metas, cards e módulos financeiros dentro do próprio escopo.

### Operação

`DATA_OPERATOR`, `COLLABORATOR`, `AGENCY_MANAGER` e `COMPANY_MANAGER` podem
executar rotinas operacionais e importações permitidas, mas não acessam vendas,
metas, financeiro ou dashboards executivos.

O CEO também pode executar as rotinas operacionais caso um funcionário não as
tenha realizado.

## Universos do produto

### Master

- overview de empresas e agências;
- alertas e atividade;
- administração técnica da plataforma;
- acesso global reservado ao proprietário da plataforma.

### Agência

- visão executiva da agência;
- equipes, colaboradores e capacidade;
- projetos, participantes e entregas;
- horas, ocupação e apontamentos;
- performance de campanhas, investimento, receita atribuída, ROAS e ROI;
- diagnóstico de rota e cards de transparência exportáveis em PNG;
- clientes assistidos ou conectados;
- importação opcional do Operand.

### Empresa e varejo

- vendas e faturamento;
- produtos e estoque;
- contas a pagar e receber;
- metas e cards executivos;
- produção e movimentação de OPs;
- importação por módulo.

Os dashboards podem variar por cliente. Funcionalidades reaproveitáveis devem
permanecer no núcleo comum; regras exclusivas devem ficar configuradas no
contexto da empresa.

## Importar Dados

A tela `/uploads` mantém importações separadas para:

- Produtos
- Estoque
- Contas a Pagar
- Contas a Receber
- Vendas

Cada card possui modelo próprio e recebe uma planilha `.xlsx`.

### TOTVS

A opção **Planilha TOTVS** começa desmarcada. Quando marcada e uma importação é
realizada, a preferência fica salva na empresa e aparece marcada nos próximos
acessos.

As consultas TOTVS de referência estão em `C:\Codex\Rubiart`:

- `venda.txt`
- `bi_produto.txt`
- `estoque.txt`
- `contas a pagar.txt`
- `contas a receber.txt`
- `empresa.txt`

Empresas sem TOTVS usam o mesmo módulo de importação com layout próprio ou
modelo Headstock. O destino canônico não muda; apenas o mapeamento da origem.

## Scripts principais

```powershell
npm run db:setup-usuarios
npm run db:seed-fcm
npm run db:seed-cholet
npm run db:seed-radiolawifi-clientes
npm run db:seed-radiolawifi-equipes
npm run db:seed-radiolawifi-campanhas
npm run db:seed-crcom-equipes
npm run db:prepare-apresentacao
```

`db:prepare-apresentacao` é idempotente e restaura contas, papéis e vínculos
descritos neste documento.

## Validação

```powershell
npm run build
npx eslint app prisma
```

## Segurança

- sessão em cookie HttpOnly assinado;
- autorização aplicada no servidor;
- consultas filtradas por empresa ou agência;
- seleção de cliente conectado validada pelo vínculo;
- funcionários operacionais bloqueados nas APIs decisórias;
- uploads sempre pertencem à empresa da sessão.
