import { defeitoAtivo } from './defeitos';

import { lerDataValida } from './datas';

export interface CamposFuncionario {
  nome: string;
  cpf: string;
  salario: string;
  admissao: string;
  dependentes: string;
}

export type CampoId = keyof CamposFuncionario;
export type Erros = Partial<Record<CampoId, string>>;

export const LIMITES = {
  nomeMin: 3,
  nomeMax: 100,
  salarioMaxCentavos: 99_999_999, // R$ 999.999,99
  dependentesMax: 10,
  admissaoMinima: '1900-01-01',
} as const;

/** Valida os dígitos verificadores de um CPF (somente dígitos, 11 posições). */
export function cpfTemDigitosValidos(digitos: string): boolean {
  if (!/^\d{11}$/.test(digitos)) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false; // 111.111.111-11 etc.
  const calc = (tamanho: number): number => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calc(9) === Number(digitos[9]) && calc(10) === Number(digitos[10]);
}

/** Converte "1.621,00" ou "1621,00" para centavos. Retorna null se o formato for inválido. */
export function salarioParaCentavos(texto: string): number | null {
  const normalizado = texto.trim().replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Math.round(Number(normalizado) * 100);
}

function hojeISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function validarFuncionario(c: CamposFuncionario): Erros {
  const erros: Erros = {};
  // Stryker disable all: pontos de injeção de defeito proposital (desligados por padrão)
  const ignoraDigitoCpf = defeitoAtivo('cpf_sem_digito_verificador');
  const aceitaSalarioInvalido = defeitoAtivo('cadastro_salario_invalido');
  // Stryker restore all

  // Nome (RN-CAD-01)
  const nome = c.nome.trim();
  if (nome === '') erros.nome = 'Informe o nome.';
  else if (nome.length < LIMITES.nomeMin) erros.nome = `O nome deve ter ao menos ${LIMITES.nomeMin} caracteres.`;
  else if (nome.length > LIMITES.nomeMax) erros.nome = `O nome deve ter no máximo ${LIMITES.nomeMax} caracteres.`;

  // CPF (RN-CAD-02)
  const cpf = c.cpf.trim();
  if (cpf === '') {
    erros.cpf = 'Informe o CPF.';
  } else if (!/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(cpf)) {
    erros.cpf = 'CPF em formato inválido.';
  } else if (!ignoraDigitoCpf && !cpfTemDigitosValidos(cpf.replace(/\D/g, ''))) {
    erros.cpf = 'CPF inválido.';
  }

  // Salário (RN-CAD-03)
  if (c.salario.trim() === '') {
    erros.salario = 'Informe o salário.';
  } else {
    const centavos = salarioParaCentavos(c.salario);
    if (centavos === null) erros.salario = 'Salário em formato inválido.';
    else if (centavos <= 0 && !aceitaSalarioInvalido) erros.salario = 'O salário deve ser maior que zero.';
    else if (centavos > LIMITES.salarioMaxCentavos) erros.salario = 'O salário máximo aceito é R$ 999.999,99.';
  }

  // Admissão (RN-CAD-04)
  if (c.admissao.trim() === '') {
    erros.admissao = 'Informe a data de admissão.';
  } else if (lerDataValida(c.admissao) === null) {
    // Date.parse('2023-02-30') é aceito pelo navegador; por isso a validação é feita pelo calendário.
    erros.admissao = 'Data de admissão inválida.';
  } else if (c.admissao < LIMITES.admissaoMinima) {
    erros.admissao = 'Data de admissão inválida.';
  } else if (c.admissao > hojeISO()) {
    erros.admissao = 'A data de admissão não pode ser futura.';
  }

  // Dependentes (RN-CAD-05)
  if (c.dependentes.trim() === '') {
    erros.dependentes = 'Informe o número de dependentes (use 0 se não houver).';
  } else if (!/^\d+$/.test(c.dependentes.trim())) {
    erros.dependentes = 'Número de dependentes inválido.';
  } else if (Number(c.dependentes) > LIMITES.dependentesMax) {
    erros.dependentes = `O máximo é ${LIMITES.dependentesMax} dependentes.`;
  }

  return erros;
}


// ---------------------------------------------------------------------------
// Rescisão (v2)
// ---------------------------------------------------------------------------

export interface CamposRescisao {
  tipo: string;
  salario: string;
  dependentes: string;
  admissao: string;
  desligamento: string;
  saldoFgts: string;
}

export type CampoRescisaoId = keyof CamposRescisao;
export type ErrosRescisao = Partial<Record<CampoRescisaoId, string>>;

export const LIMITES_RESCISAO = { dataMinima: '1900-01-01', dataMaxima: '2100-12-31' } as const;

export function validarRescisao(c: CamposRescisao): ErrosRescisao {
  const erros: ErrosRescisao = {};

  // Tipo (RN-RESV-01)
  if (c.tipo !== 'sem_justa_causa' && c.tipo !== 'pedido_demissao') erros.tipo = 'Escolha o tipo de desligamento.';

  // Salário (mesma regra RN-CAD-03)
  if (c.salario.trim() === '') {
    erros.salario = 'Informe o salário.';
  } else {
    const centavos = salarioParaCentavos(c.salario);
    if (centavos === null) erros.salario = 'Salário em formato inválido.';
    else if (centavos <= 0) erros.salario = 'O salário deve ser maior que zero.';
    else if (centavos > LIMITES.salarioMaxCentavos) erros.salario = 'O salário máximo aceito é R$ 999.999,99.';
  }

  // Dependentes (mesma regra RN-CAD-05)
  if (c.dependentes.trim() === '') {
    erros.dependentes = 'Informe o número de dependentes (use 0 se não houver).';
  } else if (!/^\d+$/.test(c.dependentes.trim())) {
    erros.dependentes = 'Número de dependentes inválido.';
  } else if (Number(c.dependentes) > LIMITES.dependentesMax) {
    erros.dependentes = `O máximo é ${LIMITES.dependentesMax} dependentes.`;
  }

  // Datas (RN-RESV-02): reais de calendário, entre 1900 e 2100, e desligamento não anterior à admissão
  const adm = lerDataValida(c.admissao);
  const des = lerDataValida(c.desligamento);
  if (c.admissao.trim() === '') erros.admissao = 'Informe a data de admissão.';
  else if (adm === null || c.admissao < LIMITES_RESCISAO.dataMinima || c.admissao > LIMITES_RESCISAO.dataMaxima) {
    erros.admissao = 'Data de admissão inválida.';
  }
  if (c.desligamento.trim() === '') erros.desligamento = 'Informe a data de desligamento.';
  else if (des === null || c.desligamento < LIMITES_RESCISAO.dataMinima || c.desligamento > LIMITES_RESCISAO.dataMaxima) {
    erros.desligamento = 'Data de desligamento inválida.';
  } else if (adm !== null && c.desligamento < c.admissao) {
    erros.desligamento = 'A data de desligamento não pode ser anterior à admissão.';
  }

  // Saldo do FGTS (RN-RESV-03): zero ou mais, até R$ 999.999,99
  if (c.saldoFgts.trim() === '') {
    erros.saldoFgts = 'Informe o saldo do FGTS (use 0 se não houver).';
  } else {
    const centavos = salarioParaCentavos(c.saldoFgts);
    if (centavos === null) erros.saldoFgts = 'Saldo do FGTS em formato inválido.';
    else if (centavos < 0) erros.saldoFgts = 'O saldo do FGTS não pode ser negativo.';
    else if (centavos > LIMITES.salarioMaxCentavos) erros.saldoFgts = 'O saldo do FGTS máximo aceito é R$ 999.999,99.';
  }

  return erros;
}
