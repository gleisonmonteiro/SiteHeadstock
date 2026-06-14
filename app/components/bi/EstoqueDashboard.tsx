"use client";

import {
  BIBarList,
  BIDataTable,
  BIKpi,
  BISection,
} from "@/components/bi/BIKit";

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});
const moedaDecimal = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const inteiro = new Intl.NumberFormat("pt-BR");

type Estoque = {
  valorEstoque: number;
  valorEstoqueVarejo: number;
  unidades: number;
  rupturas: number;
  rupturasPct: number;
  excesso: number;
  totalPosicoes: number;
  dataRef: string;
  precoMedioCusto: number;
  precoMedioVarejo: number;
  porLoja: Array<{
    nome: string;
    quantidade: number;
    custo: number;
    varejo: number;
    precoMedioCusto: number;
    precoMedioVarejo: number;
    rupturas: number;
    rupturasPct: number;
  }>;
  porMarca: Array<{ nome: string; valor: number }>;
  porGrupo: Array<{ nome: string; valor: number }>;
  porReferencia: Array<{ nome: string; valor: number }>;
};

export function EstoqueDashboard({ dados }: { dados: Estoque }) {
  const custoSobreVarejo =
    dados.valorEstoqueVarejo > 0
      ? (dados.valorEstoque / dados.valorEstoqueVarejo) * 100
      : 0;

  return (
    <div className="space-y-3">
      <section className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <BIKpi
          label="Qtde em estoque"
          value={inteiro.format(dados.unidades)}
          detail={`${inteiro.format(dados.totalPosicoes)} posições`}
          tone="accent"
        />
        <BIKpi
          label="Valor a custo"
          value={moeda.format(dados.valorEstoque)}
          detail={`${custoSobreVarejo.toFixed(1)}% do valor varejo`}
        />
        <BIKpi
          label="Valor de varejo"
          value={moeda.format(dados.valorEstoqueVarejo)}
          detail="potencial bruto cadastrado"
        />
        <BIKpi
          label="Preço médio custo"
          value={moedaDecimal.format(dados.precoMedioCusto)}
          detail="por unidade"
        />
        <BIKpi
          label="Preço médio varejo"
          value={moedaDecimal.format(dados.precoMedioVarejo)}
          detail="por unidade"
        />
        <BIKpi
          label="Rupturas"
          value={inteiro.format(dados.rupturas)}
          detail={`${dados.rupturasPct.toFixed(1)}% das posições`}
          tone={dados.rupturas > 0 ? "danger" : "success"}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <BISection title="Estoque por marca" subtitle="Quantidade disponível">
          <BIBarList
            items={dados.porMarca.map((item) => ({ label: item.nome, value: item.valor }))}
            formatValue={inteiro.format}
            color="#1478ff"
          />
        </BISection>
        <BISection title="Estoque por filial" subtitle="Quantidade por unidade">
          <BIBarList
            items={dados.porLoja.map((item) => ({
              label: item.nome,
              value: item.quantidade,
              detail: `${item.rupturas} rupturas`,
            }))}
            formatValue={inteiro.format}
            color="#00a9a5"
          />
        </BISection>
        <BISection title="Estoque por grupo" subtitle="Categorias com maior saldo">
          <BIBarList
            items={dados.porGrupo.map((item) => ({ label: item.nome, value: item.valor }))}
            formatValue={inteiro.format}
            color="#7f68d9"
          />
        </BISection>
        <BISection title="Referências com maior saldo" subtitle="Top 20 referências">
          <BIBarList
            items={dados.porReferencia.map((item) => ({
              label: item.nome,
              value: item.valor,
            }))}
            formatValue={inteiro.format}
            color="#e6a23c"
          />
        </BISection>
      </section>

      <BISection
        title="Tabela de estoque sintético"
        subtitle={`Posição de ${new Date(dados.dataRef).toLocaleDateString("pt-BR")}`}
      >
        <BIDataTable
          columns={[
            { key: "nome", label: "Filial" },
            { key: "quantidade", label: "Qtde", align: "right" },
            { key: "custo", label: "Valor a custo", align: "right" },
            { key: "varejo", label: "Valor varejo", align: "right" },
            { key: "pmCusto", label: "PM custo", align: "right" },
            { key: "pmVarejo", label: "PM varejo", align: "right" },
            { key: "rupturas", label: "Rupturas", align: "right" },
            { key: "rupturasPct", label: "% ruptura", align: "right" },
          ]}
          rows={dados.porLoja.map((item) => ({
            id: item.nome,
            nome: <span className="font-bold">{item.nome}</span>,
            quantidade: inteiro.format(item.quantidade),
            custo: moedaDecimal.format(item.custo),
            varejo: moedaDecimal.format(item.varejo),
            pmCusto: moedaDecimal.format(item.precoMedioCusto),
            pmVarejo: moedaDecimal.format(item.precoMedioVarejo),
            rupturas: inteiro.format(item.rupturas),
            rupturasPct: `${item.rupturasPct.toFixed(1)}%`,
          }))}
        />
      </BISection>
    </div>
  );
}
