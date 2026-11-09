import tabelas from '../../tabelas/2026.json';
import { defeitoAtivo } from './defeitos';

/**
 * Todo o cálculo usa números INTEIROS (centavos e pontos-base) para evitar
 * erros de ponto flutuante. O arredondamento é "meio para cima" e acontece
 * uma única vez por valor (regra RN-ARR-01).
 */

export interface EntradaFolha {
  salarioCentavos: number;
  dependentes: number;
}

export interface ResultadoFolha {
  salarioCentavos: number;
  inssCentavos: number;
  baseIrrfCentavos: number;
  deducaoUsada: 'legal' | 'simplificado';
  irrfTabelaCentavos: number;
  reducaoCentavos: number;
  irrfCentavos: number;
  fgtsCentavos: number;
  liquidoCentavos: number;
}

/** Divide num/den arredondando meio para cima (apenas valores não negativos). */
export function arredondaMeioParaCima(num: number, den: number): number {
  return Math.floor((2 * num + den) / (2 * den));
}

export function calcularInss(salario: number): number {
  const { faixas, teto_centavos } = tabelas.inss;
  // Os trechos entre "Stryker disable" e "Stryker restore" existem só para injetar os defeitos
  // propositais (desligados por padrão). Ficam fora do teste de mutação porque, sem defeito
  // ligado, nunca executam; contá-los distorceria a nota dos testes.
  // Stryker disable all: ponto de injeção de defeito proposital
  const semTeto = defeitoAtivo('inss_sem_teto');
  // Stryker restore all
  const base = semTeto ? salario : Math.min(salario, teto_centavos);

  // Stryker disable all: ponto de injeção de defeito proposital
  if (defeitoAtivo('inss_sem_progressividade')) {
    const faixa = faixas.find((f) => base <= f.ate_centavos) ?? faixas[faixas.length - 1]!;
    return arredondaMeioParaCima(base * faixa.aliquota_bps, 10000);
  }
  // Stryker restore all

  let inicio = 0;
  let numeradorTotal = 0;
  let somaArredondada = 0;
  faixas.forEach((faixa, i) => {
    // Stryker disable next-line all: usada só pelo defeito proposital inss_sem_teto
    const ultima = i === faixas.length - 1;
    // Stryker disable next-line all: ponto de injeção de defeito proposital
    const fim = ultima && semTeto ? Number.POSITIVE_INFINITY : faixa.ate_centavos;
    const parte = Math.max(0, Math.min(base, fim) - inicio);
    numeradorTotal += parte * faixa.aliquota_bps;
    // Stryker disable next-line all: usado apenas pelo defeito proposital de arredondamento
    somaArredondada += arredondaMeioParaCima(parte * faixa.aliquota_bps, 10000);
    inicio = faixa.ate_centavos;
  });

  // Stryker disable next-line all: ponto de injeção de defeito proposital
  if (defeitoAtivo('arredondamento_antecipado')) return somaArredondada;
  return arredondaMeioParaCima(numeradorTotal, 10000);
}

export function calcularReducao(salario: number, impostoTabela: number): number {
  // Stryker disable next-line all: ponto de injeção de defeito proposital
  if (defeitoAtivo('irrf_sem_reducao')) return 0;
  const r = tabelas.irrf.reducao;
  if (salario <= r.limite_isencao_centavos) {
    return Math.min(impostoTabela, r.maximo_ate_isencao_centavos);
  }
  if (salario >= r.limite_final_centavos) return 0;
  const numerador = r.constante_centavos * 1_000_000 - salario * r.coeficiente_micros;
  if (numerador <= 0) return 0;
  return Math.min(impostoTabela, arredondaMeioParaCima(numerador, 1_000_000));
}

export function calcularFolha(entrada: EntradaFolha): ResultadoFolha {
  const { salarioCentavos: salario, dependentes } = entrada;
  const irrf = tabelas.irrf;

  const inss = calcularInss(salario);

  // Stryker disable all: pontos de injeção de defeito proposital
  const qtdDeduzida = defeitoAtivo('irrf_dependente_so_primeiro')
    ? Math.min(dependentes, 1)
    : dependentes;
  const parteInss = defeitoAtivo('irrf_base_sem_inss') ? 0 : inss;
  // Stryker restore all
  const deducaoLegal = parteInss + qtdDeduzida * irrf.deducao_dependente_centavos;
  const usaSimplificado = irrf.desconto_simplificado_centavos > deducaoLegal;
  const deducao = usaSimplificado ? irrf.desconto_simplificado_centavos : deducaoLegal;
  const base = Math.max(0, salario - deducao);

  const faixa = irrf.faixas.find((f) => f.ate_centavos === null || base <= f.ate_centavos)!;
  const impostoTabela = Math.max(
    0,
    arredondaMeioParaCima(base * faixa.aliquota_bps, 10000) - faixa.parcela_deduzir_centavos,
  );
  const reducao = calcularReducao(salario, impostoTabela);
  const irrfFinal = Math.max(0, impostoTabela - reducao);

  // Stryker disable all: alteração escondida do experimento de regressão (desligada por padrão)
  const fgts = defeitoAtivo('mensal_fgts_truncado')
    ? Math.floor((salario * tabelas.fgts.aliquota_bps) / 10000)
    : arredondaMeioParaCima(salario * tabelas.fgts.aliquota_bps, 10000);
  // Stryker restore all

  return {
    salarioCentavos: salario,
    inssCentavos: inss,
    baseIrrfCentavos: base,
    deducaoUsada: usaSimplificado ? 'simplificado' : 'legal',
    irrfTabelaCentavos: impostoTabela,
    reducaoCentavos: reducao,
    irrfCentavos: irrfFinal,
    fgtsCentavos: fgts,
    liquidoCentavos: salario - inss - irrfFinal,
  };
}
