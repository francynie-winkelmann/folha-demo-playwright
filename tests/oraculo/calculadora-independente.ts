import {
  FGTS_ALIQUOTA,
  INSS_ALIQUOTAS,
  INSS_INICIOS,
  INSS_TETO,
  IRRF_DEPENDENTE,
  IRRF_FAIXAS,
  IRRF_SIMPLIFICADO,
  REDUTOR_ATE,
  REDUTOR_COEFICIENTE,
  REDUTOR_CONSTANTE,
  REDUTOR_FIM,
  REDUTOR_MAXIMO,
} from './tabelas-oficiais';

/**
 * CALCULADORA INDEPENDENTE (resultado esperado, parte 2 de 2).
 *
 * Escrita de propósito em estilo diferente do app:
 *  - usa BigInt (aritmética exata), e não números comuns;
 *  - calcula o INSS pela "decomposição por diferença de alíquotas" (cada faixa
 *    acrescenta à alíquota marginal o quanto ela excede a faixa anterior), e não
 *    somando faixa a faixa como o app faz;
 *  - usa a própria transcrição das tabelas (tabelas-oficiais.ts).
 * Todos os valores são em centavos.
 */

export interface Esperado {
  inss: number;
  baseIrrf: number;
  irrfTabela: number;
  reducao: number;
  irrf: number;
  fgts: number;
  liquido: number;
}

/** Divide arredondando meio para cima (apenas valores não negativos). */
function meioParaCima(num: bigint, den: bigint): bigint {
  return (2n * num + den) / (2n * den);
}

function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function inssEsperado(salario: bigint): bigint {
  const base = min(salario, INSS_TETO);
  let numerador = 0n;
  INSS_INICIOS.forEach((inicio, k) => {
    const anterior = k === 0 ? 0n : INSS_ALIQUOTAS[k - 1]!;
    const acrescimo = INSS_ALIQUOTAS[k]! - anterior;
    numerador += acrescimo * max(0n, base - inicio);
  });
  return meioParaCima(numerador, 10000n);
}

/** IRRF a partir da base de cálculo e do rendimento bruto (usado também nas âncoras da Receita). */
export function irrfDadoBase(base: bigint, bruto: bigint) {
  const faixa = IRRF_FAIXAS.find((f) => f.ate === null || base <= f.ate)!;
  const bruta = meioParaCima(base * faixa.aliquota, 10000n);
  const irrfTabela = max(0n, bruta - faixa.parcela);

  let reducao = 0n;
  if (bruto <= REDUTOR_ATE) {
    reducao = min(irrfTabela, REDUTOR_MAXIMO);
  } else if (bruto < REDUTOR_FIM) {
    const numerador = REDUTOR_CONSTANTE * 1_000_000n - bruto * REDUTOR_COEFICIENTE;
    reducao = numerador > 0n ? min(irrfTabela, meioParaCima(numerador, 1_000_000n)) : 0n;
  }
  return { irrfTabela, reducao, irrf: max(0n, irrfTabela - reducao) };
}

export function calcularEsperado(salarioCentavos: number, dependentes: number): Esperado {
  const salario = BigInt(salarioCentavos);
  const inss = inssEsperado(salario);
  const deducaoLegal = inss + BigInt(dependentes) * IRRF_DEPENDENTE;
  const deducao = max(deducaoLegal, IRRF_SIMPLIFICADO);
  const base = max(0n, salario - deducao);
  const { irrfTabela, reducao, irrf } = irrfDadoBase(base, salario);
  const fgts = meioParaCima(salario * FGTS_ALIQUOTA, 10000n);

  return {
    inss: Number(inss),
    baseIrrf: Number(base),
    irrfTabela: Number(irrfTabela),
    reducao: Number(reducao),
    irrf: Number(irrf),
    fgts: Number(fgts),
    liquido: Number(salario - inss - irrf),
  };
}
