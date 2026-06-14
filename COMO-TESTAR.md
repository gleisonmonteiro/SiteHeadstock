# Como testar a apresentação

## Preparar

```powershell
cd C:\Codex\Rubiart\rubiart
npm install
npx prisma generate
npx prisma db push --accept-data-loss
npm run db:prepare-apresentacao
npm run db:seed-radiolawifi-equipes
npm run db:seed-radiolawifi-campanhas
npm run dev
```

Acesse `http://localhost:3000/login`.

## Roteiro

1. Entre com `gleison@headstock.com / 123456` e confira o Painel Master.
2. Entre com `gleison@radiolawifi.com / 123456` e confira Equipes, Performance
   de Campanhas e Cholet na Inteligência dos Clientes.
3. Em Performance de Campanhas, abra uma campanha, revise o diagnóstico e gere
   o card de transparência em PNG.
4. Entre com `celso@crcom.com / 123456` e confirme que Cholet e FCM não aparecem.
5. Entre com `raphael@fcm.com / 123456` e confira produção, vendas, estoque,
   produtos e financeiro.
6. Entre com `funcionario@fcm.com / 12346` e confirme que aparecem somente
   Movimentação de OPs, Importar Dados e Configurações.
7. Entre com `zac@cholet.com / 123456` e confira apenas os dados da Cholet.

## Importação

Em `/uploads`, a opção Planilha TOTVS inicia desmarcada. Marque-a e realize uma
importação para salvar essa preferência na empresa.

Os módulos permanecem separados: produtos, estoque, contas a pagar, contas a
receber e vendas.

## Resultado esperado

- CEOs acessam visões decisórias e também podem operar.
- Funcionários importam e movimentam produção, sem acesso a vendas ou financeiro.
- FCM é independente.
- Cholet pertence à carteira conectada da Radiola WiFi.
- CRcom não enxerga FCM ou Cholet.
