import { afterEach, describe, expect, it, vi } from 'vitest';
import { cpfTemDigitosValidos, LIMITES, salarioParaCentavos, validarFuncionario } from '../src/domain/validacao';
import { formatarCentavos } from '../src/domain/moeda';

const valido = { nome: 'Maria Souza', cpf: '529.982.247-25', salario: '3000,00', admissao: '2020-01-15', dependentes: '0' };
const com = (c: Partial<typeof valido>) => validarFuncionario({ ...valido, ...c });

function iso(deslocamentoDias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + deslocamentoDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('cpfTemDigitosValidos', () => {
  it('aceita CPF válido', () => expect(cpfTemDigitosValidos('52998224725')).toBe(true));
  it('rejeita dígito verificador errado (1º e 2º)', () => {
    expect(cpfTemDigitosValidos('52998224715')).toBe(false);
    expect(cpfTemDigitosValidos('52998224726')).toBe(false);
  });
  it('rejeita repetidos, tamanho errado e letras', () => {
    expect(cpfTemDigitosValidos('11111111111')).toBe(false);
    expect(cpfTemDigitosValidos('5299822472')).toBe(false);
    expect(cpfTemDigitosValidos('529982247255')).toBe(false);
    expect(cpfTemDigitosValidos('5299822472a')).toBe(false);
  });
  it('aceita CPF cujo resto do cálculo é 10 (dígito verificador 0), no 1º e no 2º dígito', () => {
    expect(cpfTemDigitosValidos('10000000108')).toBe(true); // resto 10 no 1º dígito
    expect(cpfTemDigitosValidos('10000002810')).toBe(true); // resto 10 no 2º dígito
    expect(cpfTemDigitosValidos('00000000000')).toBe(false);
  });
  it('rejeita CPF em que só o 1º dígito está errado (o 2º é coerente com o errado)', () => {
    expect(cpfTemDigitosValidos('52998224733')).toBe(false);
  });
});

describe('salarioParaCentavos', () => {
  it.each([
    ['1621,00', 162100], ['1.621,00', 162100], ['0,01', 1], ['1000', 100000], ['10,5', 1050], ['999.999,99', 99999999], ['-5,00', -500], ['0,00', 0],
  ])('%s → %i', (t, c) => expect(salarioParaCentavos(t)).toBe(c));
  it.each([['abc'], ['1,234'], ['1,2,3'], [''], ['R$ 10'], [' ']])('rejeita "%s"', (t) => expect(salarioParaCentavos(t)).toBeNull());
  it('ignora espaços nas pontas', () => expect(salarioParaCentavos('  10,00 ')).toBe(1000));
});

afterEach(() => vi.useRealTimers());

describe('validarFuncionario', () => {
  it('cadastro válido não tem erros', () => expect(com({})).toEqual({}));

  it('nome: vazio, curto, limite mínimo, limite máximo, longo', () => {
    expect(com({ nome: '' }).nome).toBe('Informe o nome.');
    expect(com({ nome: '   ' }).nome).toBe('Informe o nome.');
    expect(com({ nome: 'Al' }).nome).toBeDefined();
    expect(com({ nome: 'Ana' }).nome).toBeUndefined();
    expect(com({ nome: 'A'.repeat(LIMITES.nomeMax) }).nome).toBeUndefined();
    expect(com({ nome: 'A'.repeat(LIMITES.nomeMax + 1) }).nome).toBeDefined();
    expect(com({ nome: '  Ana  ' }).nome).toBeUndefined();
  });

  it('cpf: vazio, formato, dígito, com e sem máscara', () => {
    expect(com({ cpf: '' }).cpf).toBe('Informe o CPF.');
    expect(com({ cpf: '123' }).cpf).toBe('CPF em formato inválido.');
    expect(com({ cpf: '529.982.247-26' }).cpf).toBe('CPF inválido.');
    expect(com({ cpf: '52998224725' }).cpf).toBeUndefined();
    expect(com({ cpf: '529982247.25' }).cpf).toBe('CPF em formato inválido.');
  });

  it('salário: vazio, formato, zero, negativo, mínimo, máximo e acima do máximo', () => {
    expect(com({ salario: '' }).salario).toBe('Informe o salário.');
    expect(com({ salario: 'abc' }).salario).toBe('Salário em formato inválido.');
    expect(com({ salario: '0,00' }).salario).toBe('O salário deve ser maior que zero.');
    expect(com({ salario: '-10,00' }).salario).toBe('O salário deve ser maior que zero.');
    expect(com({ salario: '0,01' }).salario).toBeUndefined();
    expect(com({ salario: '999.999,99' }).salario).toBeUndefined();
    expect(com({ salario: '1.000.000,00' }).salario).toBe('O salário máximo aceito é R$ 999.999,99.');
  });

  it('admissão: vazia, formato, inexistente, anterior a 1900, limite 1900, hoje, amanhã', () => {
    expect(com({ admissao: '' }).admissao).toBe('Informe a data de admissão.');
    expect(com({ admissao: '15/01/2020' }).admissao).toBe('Data de admissão inválida.');
    expect(com({ admissao: '2020-13-45' }).admissao).toBe('Data de admissão inválida.');
    expect(com({ admissao: '1899-12-31' }).admissao).toBe('Data de admissão inválida.');
    expect(com({ admissao: '1900-01-01' }).admissao).toBeUndefined();
    expect(com({ admissao: iso(0) }).admissao).toBeUndefined();
    expect(com({ admissao: iso(1) }).admissao).toBe('A data de admissão não pode ser futura.');
    expect(com({ admissao: iso(-1) }).admissao).toBeUndefined();
  });

  it('dependentes: vazio, texto, negativo, decimal, 0, 10, 11', () => {
    expect(com({ dependentes: '' }).dependentes).toContain('use 0');
    expect(com({ dependentes: 'a' }).dependentes).toBe('Número de dependentes inválido.');
    expect(com({ dependentes: '-1' }).dependentes).toBe('Número de dependentes inválido.');
    expect(com({ dependentes: '1,5' }).dependentes).toBe('Número de dependentes inválido.');
    expect(com({ dependentes: '0' }).dependentes).toBeUndefined();
    expect(com({ dependentes: '10' }).dependentes).toBeUndefined();
    expect(com({ dependentes: '11' }).dependentes).toBe(`O máximo é ${LIMITES.dependentesMax} dependentes.`);
  });

  it('mensagens exatas de nome (mínimo e máximo)', () => {
    expect(com({ nome: 'Al' }).nome).toBe('O nome deve ter ao menos 3 caracteres.');
    expect(com({ nome: 'A'.repeat(101) }).nome).toBe('O nome deve ter no máximo 100 caracteres.');
    expect(com({ cpf: '529.982.247-26' }).cpf).toBe('CPF inválido.');
  });

  it('campos preenchidos só com espaços contam como vazios', () => {
    expect(com({ cpf: '   ' }).cpf).toBe('Informe o CPF.');
    expect(com({ salario: '   ' }).salario).toBe('Informe o salário.');
    expect(com({ admissao: '   ' }).admissao).toBe('Informe a data de admissão.');
    expect(com({ dependentes: '   ' }).dependentes).toContain('use 0');
  });

  it('espaços nas pontas de CPF e dependentes são ignorados; na admissão e no salário o formato é estrito', () => {
    expect(com({ cpf: ' 52998224725 ' }).cpf).toBeUndefined();
    expect(com({ dependentes: ' 2 ' }).dependentes).toBeUndefined();
    expect(com({ admissao: ' 2020-01-15' }).admissao).toBe('Data de admissão inválida.');
  });

  it('formatos aceitos para CPF e admissão são estritos (sem texto antes ou depois)', () => {
    expect(com({ cpf: 'x52998224725' }).cpf).toBe('CPF em formato inválido.');
    expect(com({ cpf: '52998224725x' }).cpf).toBe('CPF em formato inválido.');
    expect(com({ cpf: 'x529.982.247-25' }).cpf).toBe('CPF em formato inválido.');
    expect(com({ cpf: '529.982.247-25x' }).cpf).toBe('CPF em formato inválido.');
    expect(com({ admissao: '2020-01-15T10:00:00' }).admissao).toBe('Data de admissão inválida.');
    expect(com({ admissao: '2020-01-15x' }).admissao).toBe('Data de admissão inválida.');
  });

  it('data de hoje é montada com zeros à esquerda (mês e dia de 1 dígito), sem depender do dia em que o teste roda', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5, 12, 0, 0)); // 5 de março de 2026
    expect(com({ admissao: '2026-03-05' }).admissao).toBeUndefined();
    expect(com({ admissao: '2026-03-06' }).admissao).toBe('A data de admissão não pode ser futura.');
    expect(com({ admissao: '2026-02-28' }).admissao).toBeUndefined();
    vi.setSystemTime(new Date(2026, 10, 25, 12, 0, 0)); // 25 de novembro de 2026
    expect(com({ admissao: '2026-11-25' }).admissao).toBeUndefined();
    expect(com({ admissao: '2026-11-26' }).admissao).toBe('A data de admissão não pode ser futura.');
  });

  it('vários erros ao mesmo tempo, um por campo', () => {
    const e = validarFuncionario({ nome: '', cpf: '', salario: '', admissao: '', dependentes: '' });
    expect(Object.keys(e).sort()).toEqual(['admissao', 'cpf', 'dependentes', 'nome', 'salario']);
  });
});

describe('formatarCentavos', () => {
  it.each([[0, 'R$ 0,00'], [1, 'R$ 0,01'], [162100, 'R$ 1.621,00'], [99999999, 'R$ 999.999,99'], [98809, 'R$ 988,09']])('%i', (c, t) => {
    expect(formatarCentavos(c).replace(/\s/g, ' ')).toBe(t);
  });
});
