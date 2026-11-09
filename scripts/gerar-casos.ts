/**
 * Gera tests/oraculo/casos-calculo.json (resultado esperado, parte 1 de 2) usando a
 * CALCULADORA INDEPENDENTE. O app nunca é consultado para gerar o esperado.
 *
 * Rodar:  npm run oraculos:gerar
 *
 * Depois de gerar, a pessoa responsável deve conferir a amostra marcada com
 * "amostra_conferencia": true diretamente nas fontes oficiais e preencher
 * "conferido_por" e "conferido_em" no JSON.
 */
import { writeFileSync } from 'node:fs';
import { calcularEsperado } from '../tests/oraculo/calculadora-independente';

interface Definicao {
  id: string;
  regra: string;
  risco: string;
  descricao: string;
  salario: string; // texto como digitado na tela
  salarioCentavos: number;
  dependentes: number;
  amostra?: boolean;
}

const D = (
  id: string,
  regra: string,
  descricao: string,
  salarioCentavos: number,
  dependentes: number,
  risco: string,
  amostra = false,
): Definicao => ({
  id,
  regra,
  risco,
  descricao,
  salario: (salarioCentavos / 100).toFixed(2).replace('.', ','),
  salarioCentavos,
  dependentes,
  amostra,
});

const INSS_PROG = 'Desconto de INSS diferente do devido (progressividade)';
const INSS_TETO = 'INSS acima do máximo legal';
const IRRF_BASE = 'IRRF calculado sobre base errada';
const IRRF_RED = 'Retenção indevida de IRRF (redutor da Lei 15.270/2025)';
const ARRED = 'Diferença de centavos no cálculo';

const definicoes: Definicao[] = [
  D('c01', 'RN-INSS-01', 'Salário exatamente no limite da 1ª faixa do INSS', 162100, 0, INSS_PROG),
  D('c02', 'RN-INSS-01', 'Salário 1 centavo acima do limite da 1ª faixa', 162101, 0, INSS_PROG),
  D('c03', 'RN-INSS-01', 'Salário exatamente no limite da 2ª faixa', 290284, 0, INSS_PROG),
  D('c04', 'RN-INSS-01', 'Salário 1 centavo acima do limite da 2ª faixa', 290285, 0, INSS_PROG),
  D('c05', 'RN-INSS-01', 'Salário exatamente no limite da 3ª faixa', 435427, 0, INSS_PROG),
  D('c06', 'RN-INSS-01', 'Salário 1 centavo acima do limite da 3ª faixa', 435428, 0, INSS_PROG),
  D('c07', 'RN-INSS-02', 'Salário exatamente no teto do INSS', 847555, 0, INSS_TETO, true),
  D('c08', 'RN-INSS-02', 'Salário 1 centavo acima do teto do INSS', 847556, 0, INSS_TETO),
  D('c09', 'RN-INSS-02', 'Salário bem acima do teto (R$ 15.000,00)', 1500000, 0, INSS_TETO),
  D('c10', 'RN-IRRF-02', 'Desconto simplificado maior que INSS + dependentes', 200000, 0, IRRF_BASE, true),
  D('c11', 'RN-IRRF-01', 'INSS + 2 dependentes (R$ 3.000,00)', 300000, 2, IRRF_BASE),
  D('c12', 'RN-IRRF-03', 'Salário exatamente no limite da isenção (R$ 5.000,00)', 500000, 0, IRRF_RED, true),
  D('c13', 'RN-IRRF-03', 'Salário 1 centavo acima do limite da isenção', 500001, 0, IRRF_RED),
  D('c14', 'RN-IRRF-03', 'Redução parcial por fórmula (R$ 6.000,00)', 600000, 0, IRRF_RED, true),
  D('c15', 'RN-IRRF-01', 'Redução parcial com 2 dependentes (R$ 6.000,00)', 600000, 2, IRRF_BASE, true),
  D('c16', 'RN-IRRF-03', 'Salário no fim do redutor (R$ 7.350,00)', 735000, 0, IRRF_RED),
  D('c17', 'RN-IRRF-03', 'Salário logo acima do fim do redutor (R$ 7.350,01)', 735001, 0, IRRF_RED),
  D('c18', 'RN-IRRF-01', 'Isenção total com 1 dependente (R$ 4.500,00)', 450000, 1, IRRF_BASE),
  D('c19', 'RN-IRRF-01', 'Redução parcial com 3 dependentes (R$ 5.500,00)', 550000, 3, IRRF_BASE),
  D('c20', 'RN-IRRF-01', 'Máximo de dependentes (10) com salário baixo', 162100, 10, IRRF_BASE),
  D('c21', 'RN-ARR-01', 'Salário mínimo aceito pelo cadastro (R$ 0,01)', 1, 0, ARRED),
  D('c22', 'RN-INSS-01', 'Salário simples dentro da 1ª faixa (R$ 1.000,00)', 100000, 0, INSS_PROG),
  D('c23', 'RN-ARR-01', 'Valores com centavos quebrados (R$ 12.345,67 e 4 dependentes)', 1234567, 4, ARRED),
  D('c24', 'RN-INSS-02', 'Salário máximo aceito pelo cadastro (R$ 999.999,99)', 99999999, 10, INSS_TETO),
  D('c25', 'RN-IRRF-01', 'Faixa intermediária da tabela do IRRF (R$ 3.500,00)', 350000, 0, IRRF_BASE),
  D('c26', 'RN-IRRF-01', 'Faixa alta da tabela do IRRF sem redutor (R$ 9.000,00)', 900000, 1, IRRF_BASE),
  D('c27', 'RN-ARR-01', 'Arredondamento do INSS no meio do centavo (R$ 6.000,00)', 600000, 0, ARRED),
  D('c28', 'RN-INSS-03', 'Salário com INSS de 2ª faixa e dependentes (R$ 2.500,00)', 250000, 3, INSS_PROG),
];

const casos = definicoes.map((d) => ({
  id: d.id,
  regra: d.regra,
  risco: d.risco,
  descricao: d.descricao,
  entrada: { salario: d.salario, salarioCentavos: d.salarioCentavos, dependentes: d.dependentes },
  esperado: calcularEsperado(d.salarioCentavos, d.dependentes),
  amostra_conferencia: d.amostra === true,
  conferido_por: null as string | null,
  conferido_em: null as string | null,
}));

const saida = {
  _aviso:
    'Arquivo GERADO por scripts/gerar-casos.ts com a calculadora independente. Não edite os valores à mão. Valores em centavos.',
  versao_tabelas: '2026-01',
  gerado_por: 'tests/oraculo/calculadora-independente.ts',
  casos,
};

writeFileSync('tests/oraculo/casos-calculo.json', JSON.stringify(saida, null, 2) + '\n');
console.log(`${casos.length} casos gravados em tests/oraculo/casos-calculo.json`);
