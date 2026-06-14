# Como testar o Rubiart localmente

## 1. Preparar o banco (uma vez só)

No pgAdmin 4, crie um banco local chamado **hsk** (botão direito em Databases > Create > Database... > nome `hsk`).
Ou via SQL: `CREATE DATABASE hsk;`

Depois confira o `.env` na raiz do projeto:

```
DATABASE_URL=postgresql://postgres:password@localhost:5432/hsk
```

Troque `postgres:password` pelo usuário/senha do SEU PostgreSQL local (o mesmo que você usa no pgAdmin). Este banco é só para teste em localhost — nada de apontar para o banco da Vcenter.

## 2. Comandos (na pasta `rubiart`)

```
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

O `db push` cria as tabelas no hsk e o `db:seed` insere os dados de teste. O seed pode ser rodado de novo a qualquer momento: ele apaga a empresa "Rubiart" e recria tudo do zero.

## 3. Credenciais de teste

| Item | Valor |
|---|---|
| URL local | http://localhost:3000/login |
| E-mail | gleison@rubiart.com |
| Senha | rubiart123 |

Dados criados pelo seed: empresa Rubiart, 80 vendas (maio + junho), 3 vendedores (Ana Souza, Bruno Lima, Carla Mendes), 6 produtos, meta da empresa (R$ 85.000 maio / R$ 95.000 junho) e metas por vendedor.

## 4. Ordem sugerida para navegar

1. `/login` — entrar com as credenciais acima
2. `/dashboard` — KPIs, meta do mês, gráficos (deve abrir já populado)
3. `/vendas` — lista das vendas do seed
4. `/metas` — metas da empresa e por vendedor
5. `/uploads` — importar a planilha `modelo-upload-vendas.xlsx` (está na pasta acima do projeto)
6. `/card-executivo` — clicar para gerar card de abertura/fechamento
7. `/configuracoes` — por último (tela mais simples)

## 5. O que está funcionando (validado)

- Login com e-mail/senha (cookie de sessão)
- Dashboard com KPIs e gráficos calculados das vendas reais
- Listagem de vendas
- Metas da empresa e por vendedor (consulta e API)
- Upload/importação de planilha de vendas (.xlsx/.csv) — testado com 8/8 linhas importadas
- Geração de card executivo (abertura/fechamento)
- Seed idempotente com dados de teste

## 6. O que está parcial

- `/configuracoes` e `/uploads` abrem, mas não foram exercitadas a fundo no clique a clique
- Cards executivos começam vazios — é preciso gerar pelo botão da tela
- Sessão é simplificada (cookie com id do usuário, sem expiração robusta) — ok para teste, não para produção

## 7. O que NÃO testar ainda (fora do escopo atual)

- OCR de comprovantes (`/ocr-comprovantes`) — é placeholder, sem OCR real
- Contas a pagar/receber — não existe
- Criação de novos usuários/convites (fluxo `/criar-senha`) — existe mas não foi validado
- Qualquer coisa de produção/deploy (npm run build/start)

## 8. Planilha modelo de upload

Arquivo: `modelo-upload-vendas.xlsx` (na pasta `C:\Codex\Rubiart`).

- Aba **Vendas**: colunas obrigatórias em vermelho (`data_venda`, `valor_venda`, `produto`, `quantidade`, `vendedor`) e opcionais em cinza (`cliente`, `forma_pagamento`, `categoria`, `marca`, `custo`, `loja`, `canal_venda`, `desconto`), com 8 linhas de exemplo.
- Aba **Instrucoes**: passo a passo e regras (datas no formato AAAA-MM-DD como texto; linhas inválidas são ignoradas e contadas como erro).

## 9. O que foi corrigido nesta rodada

- `app/lib/prisma.ts`: o `require('@prisma/client')` quebrava qualquer rota com banco (Prisma 7 gera client TS e exige driver adapter). Agora usa o client gerado em `.generated` + adapter `pg`.
- `app/services/importVendasService.ts`: criava um segundo PrismaClient sem adapter; agora reusa o singleton.
- `prisma.config.ts`: limpo (campo `client.output` não existe na config do Prisma 7.8) + seed configurado.
- `.env`: aponta para o banco `hsk`; `.env.local` esvaziado (tinha um DATABASE_URL antigo que sobrescreveria o `.env`).
- `package.json`: novas deps `@prisma/adapter-pg`, `pg`, `tsx` e script `db:seed`.
- Novo: `prisma/seed.ts` (dados de teste) e `modelo-upload-vendas.xlsx`.
