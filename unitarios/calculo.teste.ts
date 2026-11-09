import { describe, expect, it } from 'vitest';
import { arredondaMeioParaCima, calcularFolha, calcularInss, calcularReducao } from '../src/domain/calculo';
import { calcularEsperado, inssEsperado } from '../tests/oraculo/calculadora-independente';
import { readFileSync } from 'node:fs';
import tabelas from '../tabelas/2026.json' with { type: 'json' };
import { resolve } from 'node:path';

/**
 * O resultado esperado vem SEMPRE da calculadora independente (BigInt, outra técnica de cálculo),
 * nunca do próprio código testado.
 */
const casos = JSON.parse(readFileSync(resolve('tests/oraculo/casos-calculo.json'), 'utf-8')).casos as Array<{
  id: string;
  entrada: { salarioCentavos: number; dependentes: number };
  esperado: Record<string, number>;
}>;

function comparar(salario: number, dependentes: number): void {
  const r = calcularFolha({ salarioCentavos: salario, dependentes });
  const e = calcularEsperado(salario, dependentes);
  expect({
    inss: r.inssCentavos,
    baseIrrf: r.baseIrrfCentavos,
    irrfTabela: r.irrfTabelaCentavos,
    reducao: r.reducaoCentavos,
    irrf: r.irrfCentavos,
    fgts: r.fgtsCentavos,
    liquido: r.liquidoCentavos,
  }, `salário ${salario}, ${dependentes} dep.`).toEqual(e);
}

describe('arredondaMeioParaCima', () => {
  it.each([
    [5, 10, 1], [4, 10, 0], [15, 10, 2], [14, 10, 1], [0, 10, 0], [10, 10, 1], [25, 10, 3], [1, 3, 0], [2, 3, 1],
  ])('%i / %i = %i', (n, d, esperado) => {
    expect(arredondaMeioParaCima(n, d)).toBe(esperado);
  });
});

describe('calcularFolha: casos da tabela', () => {
  it.each(casos.map((c) => [c.id, c] as const))('caso %s', (_id, c) => {
    const r = calcularFolha({ salarioCentavos: c.entrada.salarioCentavos, dependentes: c.entrada.dependentes });
    expect(r.inssCentavos).toBe(c.esperado.inss);
    expect(r.baseIrrfCentavos).toBe(c.esperado.baseIrrf);
    expect(r.irrfTabelaCentavos).toBe(c.esperado.irrfTabela);
    expect(r.reducaoCentavos).toBe(c.esperado.reducao);
    expect(r.irrfCentavos).toBe(c.esperado.irrf);
    expect(r.fgtsCentavos).toBe(c.esperado.fgts);
    expect(r.liquidoCentavos).toBe(c.esperado.liquido);
  });
});

describe('calcularFolha: varredura contra a calculadora independente', () => {
  it('salários de R$ 0,01 a R$ 12.000,00 em passos de R$ 7,13, com 0 a 3 dependentes', () => {
    for (let s = 1; s <= 1_200_000; s += 713) for (const d of [0, 1, 2, 3]) comparar(s, d);
  });

  it('pontos de fronteira (limites das faixas, ±1 centavo)', () => {
    const fronteiras = [162100, 290284, 435427, 847555, 500000, 735000, 735001, 499999, 500001, 211200, 282665, 375105, 466468];
    for (const f of fronteiras) for (const delta of [-1, 0, 1]) for (const d of [0, 2, 10]) comparar(f + delta, d);
  });

  it('quantidade máxima de dependentes e salário máximo do cadastro', () => {
    for (const d of [0, 5, 10]) comparar(99_999_999, d);
  });

  it('salário mínimo possível (1 centavo)', () => comparar(1, 0));
});

describe('calcularInss', () => {
  it('bate com o oráculo em toda a faixa, passo de 1 centavo nas fronteiras', () => {
    for (let s = 0; s <= 1_000_000; s += 997) expect(calcularInss(s), `s=${s}`).toBe(Number(inssEsperado(BigInt(s))));
    for (const f of [162100, 290284, 435427, 847555]) for (const dd of [-2, -1, 0, 1, 2]) {
      expect(calcularInss(f + dd)).toBe(Number(inssEsperado(BigInt(f + dd))));
    }
  });
  it('respeita o teto (R$ 988,09) e não passa disso', () => {
    expect(calcularInss(847555)).toBe(98809);
    expect(calcularInss(10_000_000)).toBe(98809);
  });
  it('é monotônico: salário maior nunca reduz o INSS', () => {
    let anterior = 0;
    for (let s = 0; s <= 1_000_000; s += 53) {
      const v = calcularInss(s);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });
});

describe('calcularReducao (Lei 15.270/2025)', () => {
  it('até R$ 5.000,00 zera o imposto, limitado a R$ 312,89', () => {
    expect(calcularReducao(500000, 40000)).toBe(31289);
    expect(calcularReducao(500000, 10000)).toBe(10000);
    expect(calcularReducao(100000, 0)).toBe(0);
  });
  it('entre R$ 5.000,01 e R$ 7.350,00 aplica 978,62 − 0,133145 × bruto', () => {
    expect(calcularReducao(500001, 99999999)).toBe(31289 - 0); // 97862 - 0,133145*500001 ≈ 31289
    expect(calcularReducao(600000, 99999999)).toBe(Math.round(97862 - 0.133145 * 600000));
    expect(calcularReducao(734999, 99999999)).toBe(Math.max(0, Math.round(97862 - 0.133145 * 734999)));
  });
  it('a partir de R$ 7.350,00 não há redução', () => {
    expect(calcularReducao(735000, 99999999)).toBe(0);
    expect(calcularReducao(735001, 99999999)).toBe(0);
  });
  it('nunca é maior que o imposto de tabela', () => {
    for (let s = 400000; s <= 800000; s += 997) expect(calcularReducao(s, 1234)).toBeLessThanOrEqual(1234);
  });
});

describe('propriedades da folha', () => {
  it('líquido = bruto − INSS − IRRF e FGTS não é descontado', () => {
    for (let s = 1; s <= 1_500_000; s += 9973) {
      const r = calcularFolha({ salarioCentavos: s, dependentes: 1 });
      expect(r.liquidoCentavos).toBe(s - r.inssCentavos - r.irrfCentavos);
      expect(r.fgtsCentavos).toBe(arredondaMeioParaCima(s * 800, 10000));
    }
  });
  it('mais dependentes nunca aumentam o IRRF', () => {
    for (let s = 300000; s <= 1_200_000; s += 4999) {
      let anterior = Infinity;
      for (let d = 0; d <= 10; d++) {
        const v = calcularFolha({ salarioCentavos: s, dependentes: d }).irrfCentavos;
        expect(v).toBeLessThanOrEqual(anterior);
        anterior = v;
      }
    }
  });
  it('em empate exato entre dedução legal e simplificada, o sistema informa "legal" (convenção do sistema)', () => {
    // 280367 com 2 dependentes: INSS (228,02) + 2 × 189,59 = 607,20 = desconto simplificado
    const r = calcularFolha({ salarioCentavos: 280367, dependentes: 2 });
    expect(r.deducaoUsada).toBe('legal');
    expect(r.baseIrrfCentavos).toBe(280367 - 60720);
  });
  it('escolhe a dedução mais vantajosa e informa qual usou', () => {
    expect(calcularFolha({ salarioCentavos: 150000, dependentes: 0 }).deducaoUsada).toBe('simplificado');
    expect(calcularFolha({ salarioCentavos: 800000, dependentes: 0 }).deducaoUsada).toBe('legal');
  });
});

describe('tabela de IRRF: consistência', () => {
  it('o imposto é contínuo nas fronteiras das faixas (sem "degrau" por erro de parcela a deduzir)', () => {
    const faixas = tabelas.irrf.faixas;
    for (let i = 0; i < faixas.length - 1; i++) {
      const f = faixas[i]!;
      const g = faixas[i + 1]!;
      const limite = f.ate_centavos!;
      const naFaixa = (x: typeof f) => Math.max(0, arredondaMeioParaCima(limite * x.aliquota_bps, 10000) - x.parcela_deduzir_centavos);
      expect(naFaixa(f), `fronteira ${limite}`).toBe(naFaixa(g));
    }
  });
});
