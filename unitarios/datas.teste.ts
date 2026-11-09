import { describe, expect, it } from 'vitest';
import {
  anosCompletos,
  aniversarioEm,
  deDias,
  diasNoMes,
  ehBissexto,
  lerDataValida,
  paraDias,
  somarDias,
  somarMeses,
} from '../src/domain/datas';

const d = (ano: number, mes: number, dia: number) => ({ ano, mes, dia });

describe('calendário', () => {
  it.each([[2024, true], [2023, false], [2000, true], [1900, false], [2100, false], [2400, true]])('ano %i bissexto = %s', (a, v) => {
    expect(ehBissexto(a)).toBe(v);
  });
  it.each([[1, 31], [2, 28], [4, 30], [6, 30], [9, 30], [11, 30], [12, 31], [7, 31], [8, 31]])('mês %i (2023) tem %i dias', (m, v) => {
    expect(diasNoMes(2023, m)).toBe(v);
  });
  it('fevereiro de ano bissexto tem 29 dias', () => expect(diasNoMes(2024, 2)).toBe(29));
});

describe('lerDataValida', () => {
  it('aceita datas reais, inclusive 29/02 de ano bissexto', () => {
    expect(lerDataValida('2024-02-29')).toEqual(d(2024, 2, 29));
    expect(lerDataValida('2025-12-31')).toEqual(d(2025, 12, 31));
    expect(lerDataValida('1900-01-01')).toEqual(d(1900, 1, 1));
  });
  it.each(['2023-02-29', '2023-02-30', '2023-04-31', '2023-13-01', '2023-00-10', '2023-01-00', '2023-1-1', '23-01-01', '2023-01-011', 'x2023-01-01', '2023-01-01x', ''])('rejeita "%s"', (t) => {
    expect(lerDataValida(t)).toBeNull();
  });
});

describe('contagem de dias', () => {
  it('01/01/1970 é o dia 0 e as conversões são inversas', () => {
    expect(paraDias(d(1970, 1, 1))).toBe(0);
    expect(paraDias(d(1970, 1, 2))).toBe(1);
    for (const n of [-1000, -1, 0, 1, 365, 19000, 20000, 47000]) expect(paraDias(deDias(n))).toBe(n);
  });
  it('somarDias atravessa mês, ano e fevereiro bissexto', () => {
    expect(somarDias(d(2025, 8, 31), 1)).toEqual(d(2025, 9, 1));
    expect(somarDias(d(2025, 12, 31), 1)).toEqual(d(2026, 1, 1));
    expect(somarDias(d(2024, 2, 28), 1)).toEqual(d(2024, 2, 29));
    expect(somarDias(d(2023, 2, 28), 1)).toEqual(d(2023, 3, 1));
    expect(somarDias(d(2025, 3, 1), -1)).toEqual(d(2025, 2, 28));
    expect(somarDias(d(2025, 1, 1), 0)).toEqual(d(2025, 1, 1));
  });
  it('não depende do fuso horário do computador', () => {
    const antes = process.env['TZ'];
    for (const tz of ['UTC', 'America/Sao_Paulo', 'Pacific/Kiritimati']) {
      process.env['TZ'] = tz;
      expect(paraDias(d(2025, 3, 9))).toBe(20156);
      expect(deDias(20156)).toEqual(d(2025, 3, 9));
    }
    if (antes === undefined) delete process.env['TZ'];
    else process.env['TZ'] = antes;
  });
});

describe('somarMeses', () => {
  it('mantém o dia quando existe', () => expect(somarMeses(d(2025, 1, 15), 3)).toEqual(d(2025, 4, 15)));
  it('usa o último dia do mês quando o dia não existe', () => {
    expect(somarMeses(d(2025, 1, 31), 1)).toEqual(d(2025, 2, 28));
    expect(somarMeses(d(2024, 1, 31), 1)).toEqual(d(2024, 2, 29));
    expect(somarMeses(d(2025, 3, 31), 1)).toEqual(d(2025, 4, 30));
  });
  it('passa de dezembro para janeiro e aceita 0 e 12 meses', () => {
    expect(somarMeses(d(2025, 11, 10), 3)).toEqual(d(2026, 2, 10));
    expect(somarMeses(d(2025, 12, 10), 1)).toEqual(d(2026, 1, 10));
    expect(somarMeses(d(2025, 6, 10), 0)).toEqual(d(2025, 6, 10));
    expect(somarMeses(d(2025, 6, 10), 12)).toEqual(d(2026, 6, 10));
    expect(somarMeses(d(2025, 12, 31), 12)).toEqual(d(2026, 12, 31));
  });
});

describe('anosCompletos', () => {
  it('conta só aniversários já completos', () => {
    expect(anosCompletos(d(2022, 7, 10), d(2025, 7, 9))).toBe(2);
    expect(anosCompletos(d(2022, 7, 10), d(2025, 7, 10))).toBe(3);
    expect(anosCompletos(d(2022, 7, 10), d(2025, 7, 11))).toBe(3);
    expect(anosCompletos(d(2022, 7, 10), d(2025, 6, 30))).toBe(2);
    expect(anosCompletos(d(2022, 7, 10), d(2022, 7, 10))).toBe(0);
    expect(anosCompletos(d(2022, 12, 31), d(2023, 1, 1))).toBe(0);
  });
  it('quem entrou em 29/02 faz aniversário em 01/03 nos anos não bissextos', () => {
    expect(anosCompletos(d(2020, 2, 29), d(2025, 2, 28))).toBe(4);
    expect(anosCompletos(d(2020, 2, 29), d(2025, 3, 1))).toBe(5);
    expect(anosCompletos(d(2020, 2, 29), d(2024, 2, 28))).toBe(3);
    expect(anosCompletos(d(2020, 2, 29), d(2024, 2, 29))).toBe(4);
  });
  it('nunca é negativo', () => expect(anosCompletos(d(2025, 5, 1), d(2020, 1, 1))).toBe(0));
  it('aniversarioEm: 29/02 em ano bissexto fica em 29/02', () => {
    expect(aniversarioEm(d(2020, 2, 29), 2028)).toEqual(d(2028, 2, 29));
    expect(aniversarioEm(d(2020, 2, 29), 2027)).toEqual(d(2027, 3, 1));
    expect(aniversarioEm(d(2020, 3, 29), 2027)).toEqual(d(2027, 3, 29));
    expect(aniversarioEm(d(2020, 2, 28), 2027)).toEqual(d(2027, 2, 28));
  });
});
