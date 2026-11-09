import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { calcularRescisao, type EntradaRescisao } from '../src/domain/rescisao';
import { somarDias, paraDias, deDias, type Data } from '../src/domain/datas';
import { calcularRescisaoEsperada } from '../tests/oraculo/rescisao-independente';
import { validarRescisao, type CamposRescisao } from '../src/domain/validacao';

/** O esperado vem SEMPRE da calculadora independente / da tabela de casos, nunca do código testado. */
const casos = JSON.parse(readFileSync(resolve('tests/oraculo/casos-rescisao.json'), 'utf-8')).casos as Array<{
  id: string;
  descricao: string;
  entrada: EntradaRescisao;
  esperado: Record<string, number | string>;
}>;

const iso = (x: Data) => `${x.ano}-${String(x.mes).padStart(2, '0')}-${String(x.dia).padStart(2, '0')}`;

describe('rescisão: casos da tabela', () => {
  it.each(casos.map((c) => [c.id, c] as const))('caso %s', (_id, c) => {
    expect(calcularRescisao(c.entrada)).toEqual(c.esperado);
  });
});

describe('rescisão: varredura contra a calculadora independente', () => {
  it('combinações pseudoaleatórias (sempre as mesmas) de datas, salários e opções', () => {
    let semente = 20260107;
    const sorteio = (n: number) => {
      semente = (semente * 1103515245 + 12345) & 0x7fffffff;
      return semente % n;
    };
    const inicio = paraDias({ ano: 2000, mes: 1, dia: 1 });
    for (let i = 0; i < 3000; i++) {
      const adm = deDias(inicio + sorteio(9000));
      const des = deDias(paraDias(adm) + sorteio(9000));
      const e: EntradaRescisao = {
        tipo: sorteio(2) ? 'sem_justa_causa' : 'pedido_demissao',
        salarioCentavos: 10000 + sorteio(1_500_000),
        dependentes: sorteio(6),
        admissao: iso(adm),
        desligamento: iso(des),
        saldoFgtsCentavos: sorteio(5_000_000),
        feriasVencidas: sorteio(2) === 1,
        avisoCumprido: sorteio(2) === 1,
      };
      expect(calcularRescisao(e), JSON.stringify(e)).toEqual(calcularRescisaoEsperada(e));
    }
  });

  it('todos os dias de um ano bissexto e de um comum, como data de desligamento', () => {
    for (const ano of [2023, 2024]) {
      for (let n = paraDias({ ano, mes: 1, dia: 1 }); n <= paraDias({ ano, mes: 12, dia: 31 }); n++) {
        for (const tipo of ['sem_justa_causa', 'pedido_demissao'] as const) {
          const e: EntradaRescisao = {
            tipo, salarioCentavos: 345678, dependentes: 1, admissao: '2020-02-29', desligamento: iso(deDias(n)),
            saldoFgtsCentavos: 100000, feriasVencidas: false, avisoCumprido: true,
          };
          expect(calcularRescisao(e), JSON.stringify(e)).toEqual(calcularRescisaoEsperada(e));
        }
      }
    }
  });
});

describe('rescisão: propriedades', () => {
  const base: EntradaRescisao = {
    tipo: 'sem_justa_causa', salarioCentavos: 300000, dependentes: 0, admissao: '2022-03-10',
    desligamento: '2025-08-20', saldoFgtsCentavos: 500000, feriasVencidas: false, avisoCumprido: true,
  };

  it('líquido = proventos − descontos e proventos somam as verbas', () => {
    const r = calcularRescisao(base);
    expect(r.liquidoCentavos).toBe(r.totalProventosCentavos - r.totalDescontosCentavos);
    expect(r.totalProventosCentavos).toBe(
      r.saldoSalarioCentavos + r.avisoIndenizadoCentavos + r.feriasVencidasCentavos + r.tercoFeriasVencidasCentavos +
        r.feriasProporcionaisCentavos + r.tercoFeriasProporcionaisCentavos + r.decimoTerceiroCentavos,
    );
    expect(r.totalDescontosCentavos).toBe(
      r.inssSaldoCentavos + r.irrfSaldoCentavos + r.inss13Centavos + r.irrf13Centavos + r.descontoAvisoCentavos,
    );
  });

  it('pedido de demissão nunca tem aviso indenizado nem multa', () => {
    const r = calcularRescisao({ ...base, tipo: 'pedido_demissao' });
    expect(r.avisoDias).toBe(0);
    expect(r.avisoIndenizadoCentavos).toBe(0);
    expect(r.multaFgtsCentavos).toBe(0);
    expect(r.dataProjetada).toBe(base.desligamento);
  });

  it('dispensa sem justa causa nunca desconta aviso, qualquer que seja avisoCumprido', () => {
    expect(calcularRescisao({ ...base, avisoCumprido: false }).descontoAvisoCentavos).toBe(0);
  });

  it('pedido de demissão desconta o aviso só quando não foi cumprido', () => {
    expect(calcularRescisao({ ...base, tipo: 'pedido_demissao', avisoCumprido: true }).descontoAvisoCentavos).toBe(0);
    expect(calcularRescisao({ ...base, tipo: 'pedido_demissao', avisoCumprido: false }).descontoAvisoCentavos).toBe(300000);
  });

  it('férias vencidas só entram quando marcadas', () => {
    const sem = calcularRescisao(base);
    const com = calcularRescisao({ ...base, feriasVencidas: true });
    expect(sem.feriasVencidasCentavos).toBe(0);
    expect(sem.tercoFeriasVencidasCentavos).toBe(0);
    expect(com.feriasVencidasCentavos).toBe(300000);
    expect(com.tercoFeriasVencidasCentavos).toBe(100000);
  });

  it('o aviso, as férias e seus terços não geram INSS nem IRRF', () => {
    const a = calcularRescisao({ ...base, feriasVencidas: false });
    const b = calcularRescisao({ ...base, feriasVencidas: true });
    expect(b.inssSaldoCentavos).toBe(a.inssSaldoCentavos);
    expect(b.irrfSaldoCentavos).toBe(a.irrfSaldoCentavos);
    expect(b.inss13Centavos).toBe(a.inss13Centavos);
  });

  it('aviso nunca passa de 90 dias nem fica abaixo de 30 na dispensa', () => {
    for (let ano = 1990; ano <= 2024; ano += 3) {
      const r = calcularRescisao({ ...base, admissao: `${ano}-02-01` });
      expect(r.avisoDias).toBeGreaterThanOrEqual(30);
      expect(r.avisoDias).toBeLessThanOrEqual(90);
    }
  });

  it('data projetada = desligamento + dias de aviso', () => {
    const r = calcularRescisao(base);
    expect(r.dataProjetada).toBe(iso(somarDias({ ano: 2025, mes: 8, dia: 20 }, r.avisoDias)));
  });

  it('avos ficam sempre entre 0 e 12', () => {
    for (const des of ['2025-01-01', '2025-01-14', '2025-06-30', '2025-12-31']) {
      const r = calcularRescisao({ ...base, desligamento: des });
      expect(r.avos13).toBeGreaterThanOrEqual(0);
      expect(r.avos13).toBeLessThanOrEqual(12);
      expect(r.avosFerias).toBeGreaterThanOrEqual(0);
      expect(r.avosFerias).toBeLessThanOrEqual(12);
    }
  });

  it('datas inválidas lançam erro (a entrada deve ser validada antes)', () => {
    expect(() => calcularRescisao({ ...base, desligamento: '2025-02-30' })).toThrow('Datas inválidas');
    expect(() => calcularRescisao({ ...base, admissao: 'x' })).toThrow('Datas inválidas');
  });
});

describe('validarRescisao', () => {
  const ok: CamposRescisao = { tipo: 'sem_justa_causa', salario: '3000,00', dependentes: '0', admissao: '2022-03-10', desligamento: '2025-08-20', saldoFgts: '0,00' };
  const com = (p: Partial<CamposRescisao>) => validarRescisao({ ...ok, ...p });

  it('entrada válida não tem erros', () => expect(com({})).toEqual({}));
  it('tipo obrigatório', () => {
    expect(com({ tipo: '' }).tipo).toBe('Escolha o tipo de desligamento.');
    expect(com({ tipo: 'pedido_demissao' }).tipo).toBeUndefined();
    expect(com({ tipo: 'justa_causa' }).tipo).toBe('Escolha o tipo de desligamento.');
  });
  it('salário: vazio, formato, zero, máximo', () => {
    expect(com({ salario: '' }).salario).toBe('Informe o salário.');
    expect(com({ salario: 'abc' }).salario).toBe('Salário em formato inválido.');
    expect(com({ salario: '0,00' }).salario).toBe('O salário deve ser maior que zero.');
    expect(com({ salario: '999.999,99' }).salario).toBeUndefined();
    expect(com({ salario: '1.000.000,00' }).salario).toBe('O salário máximo aceito é R$ 999.999,99.');
  });
  it('dependentes', () => {
    expect(com({ dependentes: '' }).dependentes).toContain('use 0');
    expect(com({ dependentes: 'a' }).dependentes).toBe('Número de dependentes inválido.');
    expect(com({ dependentes: '11' }).dependentes).toBe('O máximo é 10 dependentes.');
    expect(com({ dependentes: '10' }).dependentes).toBeUndefined();
  });
  it('datas: obrigatórias, reais, no intervalo e em ordem', () => {
    expect(com({ admissao: '' }).admissao).toBe('Informe a data de admissão.');
    expect(com({ desligamento: '' }).desligamento).toBe('Informe a data de desligamento.');
    expect(com({ admissao: '2023-02-30' }).admissao).toBe('Data de admissão inválida.');
    expect(com({ desligamento: '2023-02-30' }).desligamento).toBe('Data de desligamento inválida.');
    expect(com({ admissao: '1899-12-31' }).admissao).toBe('Data de admissão inválida.');
    expect(com({ admissao: '1900-01-01', desligamento: '1900-01-01' })).toEqual({});
    expect(com({ desligamento: '2100-12-31' }).desligamento).toBeUndefined();
    expect(com({ desligamento: '2101-01-01' }).desligamento).toBe('Data de desligamento inválida.');
    expect(com({ desligamento: '2022-03-09' }).desligamento).toBe('A data de desligamento não pode ser anterior à admissão.');
    expect(com({ desligamento: '2022-03-10' }).desligamento).toBeUndefined();
  });
  it('campos só com espaços contam como vazios', () => {
    expect(com({ salario: '   ' }).salario).toBe('Informe o salário.');
    expect(com({ dependentes: '   ' }).dependentes).toContain('use 0');
    expect(com({ admissao: '   ' }).admissao).toBe('Informe a data de admissão.');
    expect(com({ desligamento: '   ' }).desligamento).toBe('Informe a data de desligamento.');
    expect(com({ saldoFgts: '   ' }).saldoFgts).toContain('use 0');
  });
  it('dependentes: espaços nas pontas são ignorados, texto antes ou depois não', () => {
    expect(com({ dependentes: ' 2 ' }).dependentes).toBeUndefined();
    expect(com({ dependentes: 'x2' }).dependentes).toBe('Número de dependentes inválido.');
    expect(com({ dependentes: '2x' }).dependentes).toBe('Número de dependentes inválido.');
  });
  it('limites de data nas duas pontas, para admissão e desligamento', () => {
    expect(com({ admissao: '2100-12-31', desligamento: '2100-12-31' })).toEqual({});
    expect(com({ admissao: '2101-01-01', desligamento: '2101-01-02' })).toEqual({
      admissao: 'Data de admissão inválida.',
      desligamento: 'Data de desligamento inválida.',
    });
    expect(com({ admissao: '1800-01-01', desligamento: '1899-12-31' }).desligamento).toBe('Data de desligamento inválida.');
  });
  it('a ordem das datas só é conferida quando a admissão é válida', () => {
    expect(com({ admissao: '2023-02-30', desligamento: '2020-01-01' }).desligamento).toBeUndefined();
    expect(com({ admissao: '2023-02-30', desligamento: '2020-01-01' }).admissao).toBe('Data de admissão inválida.');
  });
  it('saldo do FGTS: obrigatório, não negativo, até o máximo', () => {
    expect(com({ saldoFgts: '' }).saldoFgts).toContain('use 0');
    expect(com({ saldoFgts: 'x' }).saldoFgts).toBe('Saldo do FGTS em formato inválido.');
    expect(com({ saldoFgts: '-1,00' }).saldoFgts).toBe('O saldo do FGTS não pode ser negativo.');
    expect(com({ saldoFgts: '0' }).saldoFgts).toBeUndefined();
    expect(com({ saldoFgts: '999.999,99' }).saldoFgts).toBeUndefined();
    expect(com({ saldoFgts: '1.000.000,00' }).saldoFgts).toBe('O saldo do FGTS máximo aceito é R$ 999.999,99.');
  });
  it('admissão em data inexistente também é recusada no cadastro de funcionário (v1)', async () => {
    const { validarFuncionario } = await import('../src/domain/validacao');
    const e = validarFuncionario({ nome: 'Maria Souza', cpf: '529.982.247-25', salario: '3000,00', admissao: '2023-02-30', dependentes: '0' });
    expect(e.admissao).toBe('Data de admissão inválida.');
  });
});
