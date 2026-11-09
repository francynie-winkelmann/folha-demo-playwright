import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calcularEsperado } from '../tests/oraculo/calculadora-independente';
import { COLUNAS, entradasDaGrade, linhaDe, type Linha } from '../scripts/regressao-comum';

const ref = JSON.parse(readFileSync(resolve('regressao/referencia.json'), 'utf-8')) as { colunas: string[]; linhas: Linha[] };

describe('referência aprovada da folha mensal (golden master)', () => {
  it('tem as mesmas colunas e a mesma grade de entradas do código', () => {
    expect(ref.colunas).toEqual([...COLUNAS]);
    expect(ref.linhas.map((l) => [l[0], l[1]])).toEqual(entradasDaGrade());
  });

  it('a própria referência está CERTA: bate com a calculadora independente em todas as combinações', () => {
    for (const l of ref.linhas) {
      const e = calcularEsperado(l[0], l[1]);
      expect(l.slice(2, 9), `salário ${l[0]}, ${l[1]} dep.`).toEqual([e.inss, e.baseIrrf, e.irrfTabela, e.reducao, e.irrf, e.fgts, e.liquido]);
    }
  });

  it('o código atual calcula exatamente como a referência (sem regressão)', () => {
    for (const l of ref.linhas) expect(linhaDe(l[0], l[1]), `salário ${l[0]}, ${l[1]} dep.`).toEqual(l);
  });
});
