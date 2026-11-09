/**
 * Peças comuns da regressão "antes × depois" (golden master) da FOLHA MENSAL.
 * A mesma grade de entradas é usada para gravar a referência e para compará-la.
 */
import { calcularFolha } from '../src/domain/calculo';

export const COLUNAS = [
  'salario',
  'dependentes',
  'inss',
  'baseIrrf',
  'irrfTabela',
  'reducao',
  'irrf',
  'fgts',
  'liquido',
  'deducaoSimplificada',
] as const;
export type Coluna = (typeof COLUNAS)[number];
export type Linha = [number, number, number, number, number, number, number, number, number, number];

const DEPENDENTES = [0, 1, 2, 3, 5, 10];

/** Salários: fronteiras das tabelas (±1 centavo) e uma varredura de R$ 500,00 a R$ 12.000,00. */
export function salariosDaGrade(): number[] {
  const fronteiras = [162100, 290284, 435427, 847555, 500000, 735000, 242880, 282665, 375105, 466468, 60720, 211200, 303600];
  const conjunto = new Set<number>([1, 99, 100000, 1500000, 99_999_999]);
  for (const f of fronteiras) for (const d of [-1, 0, 1]) if (f + d > 0) conjunto.add(f + d);
  for (let s = 50000; s <= 1_200_000; s += 4999) conjunto.add(s);
  return [...conjunto].sort((a, b) => a - b);
}

export function entradasDaGrade(): Array<[number, number]> {
  const saida: Array<[number, number]> = [];
  for (const s of salariosDaGrade()) for (const d of DEPENDENTES) saida.push([s, d]);
  return saida;
}

export function linhaDe(salario: number, dependentes: number): Linha {
  const r = calcularFolha({ salarioCentavos: salario, dependentes });
  return [
    salario,
    dependentes,
    r.inssCentavos,
    r.baseIrrfCentavos,
    r.irrfTabelaCentavos,
    r.reducaoCentavos,
    r.irrfCentavos,
    r.fgtsCentavos,
    r.liquidoCentavos,
    r.deducaoUsada === 'simplificado' ? 1 : 0,
  ];
}
