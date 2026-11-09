import { test, expect } from '../fixtures';
import type { CampoId } from '../pages/FolhaPage';
import { cobre, dataBrasilia } from '../helpers/dados';

/**
 * Validação de campos do cadastro.
 * Cada linha da tabela é um cenário: campo, valor digitado e a mensagem esperada.
 * As mensagens esperadas vêm das regras de negócio (docs/regras-de-negocio.md),
 * não da leitura do código do app.
 */
interface Rejeicao {
  regra: string;
  risco: string;
  campo: CampoId;
  descricao: string;
  valor: string;
  mensagem: string;
}

const RISCO_DADO = 'Dado inválido entrando no cálculo da folha';
const RISCO_DOC = 'Funcionário cadastrado com documento inválido';

const rejeicoes: Rejeicao[] = [
  { regra: 'RN-CAD-01', risco: RISCO_DADO, campo: 'nome', descricao: 'nome vazio', valor: '', mensagem: 'Informe o nome.' },
  { regra: 'RN-CAD-01', risco: RISCO_DADO, campo: 'nome', descricao: 'nome só com espaços', valor: '   ', mensagem: 'Informe o nome.' },
  { regra: 'RN-CAD-01', risco: RISCO_DADO, campo: 'nome', descricao: 'nome com 2 caracteres (abaixo do mínimo)', valor: 'Ab', mensagem: 'O nome deve ter ao menos 3 caracteres.' },
  { regra: 'RN-CAD-01', risco: RISCO_DADO, campo: 'nome', descricao: 'nome com 101 caracteres (acima do máximo)', valor: 'A'.repeat(101), mensagem: 'O nome deve ter no máximo 100 caracteres.' },

  { regra: 'RN-CAD-02', risco: RISCO_DOC, campo: 'cpf', descricao: 'CPF vazio', valor: '', mensagem: 'Informe o CPF.' },
  { regra: 'RN-CAD-02', risco: RISCO_DOC, campo: 'cpf', descricao: 'CPF com dígito verificador errado', valor: '529.982.247-26', mensagem: 'CPF inválido.' },
  { regra: 'RN-CAD-02', risco: RISCO_DOC, campo: 'cpf', descricao: 'CPF com todos os dígitos iguais', valor: '11111111111', mensagem: 'CPF inválido.' },
  { regra: 'RN-CAD-02', risco: RISCO_DOC, campo: 'cpf', descricao: 'CPF curto', valor: '123', mensagem: 'CPF em formato inválido.' },
  { regra: 'RN-CAD-02', risco: RISCO_DOC, campo: 'cpf', descricao: 'CPF com letras', valor: 'abc.def.ghi-jk', mensagem: 'CPF em formato inválido.' },
  { regra: 'RN-CAD-02', risco: RISCO_DOC, campo: 'cpf', descricao: 'CPF com máscara incompleta', valor: '529982247-25', mensagem: 'CPF em formato inválido.' },

  { regra: 'RN-CAD-03', risco: RISCO_DADO, campo: 'salario', descricao: 'salário vazio', valor: '', mensagem: 'Informe o salário.' },
  { regra: 'RN-CAD-03', risco: RISCO_DADO, campo: 'salario', descricao: 'salário zero', valor: '0', mensagem: 'O salário deve ser maior que zero.' },
  { regra: 'RN-CAD-03', risco: RISCO_DADO, campo: 'salario', descricao: 'salário 0,00', valor: '0,00', mensagem: 'O salário deve ser maior que zero.' },
  { regra: 'RN-CAD-03', risco: RISCO_DADO, campo: 'salario', descricao: 'salário negativo', valor: '-100,00', mensagem: 'O salário deve ser maior que zero.' },
  { regra: 'RN-CAD-03', risco: RISCO_DADO, campo: 'salario', descricao: 'salário com letras', valor: 'abc', mensagem: 'Salário em formato inválido.' },
  { regra: 'RN-CAD-03', risco: RISCO_DADO, campo: 'salario', descricao: 'salário com 3 casas decimais', valor: '1000,999', mensagem: 'Salário em formato inválido.' },
  { regra: 'RN-CAD-03', risco: RISCO_DADO, campo: 'salario', descricao: 'salário 1 centavo acima do máximo', valor: '1000000,00', mensagem: 'O salário máximo aceito é R$ 999.999,99.' },

  { regra: 'RN-CAD-04', risco: RISCO_DADO, campo: 'admissao', descricao: 'admissão vazia', valor: '', mensagem: 'Informe a data de admissão.' },
  { regra: 'RN-CAD-04', risco: RISCO_DADO, campo: 'admissao', descricao: 'admissão amanhã (futura)', valor: dataBrasilia(1), mensagem: 'A data de admissão não pode ser futura.' },
  { regra: 'RN-CAD-04', risco: RISCO_DADO, campo: 'admissao', descricao: 'admissão antes de 1900', valor: '1899-12-31', mensagem: 'Data de admissão inválida.' },

  { regra: 'RN-CAD-05', risco: RISCO_DADO, campo: 'dependentes', descricao: 'dependentes vazio', valor: '', mensagem: 'Informe o número de dependentes (use 0 se não houver).' },
  { regra: 'RN-CAD-05', risco: RISCO_DADO, campo: 'dependentes', descricao: 'dependentes negativo', valor: '-1', mensagem: 'Número de dependentes inválido.' },
  { regra: 'RN-CAD-05', risco: RISCO_DADO, campo: 'dependentes', descricao: 'dependentes decimal', valor: '1.5', mensagem: 'Número de dependentes inválido.' },
  { regra: 'RN-CAD-05', risco: RISCO_DADO, campo: 'dependentes', descricao: 'dependentes com letras', valor: 'abc', mensagem: 'Número de dependentes inválido.' },
  { regra: 'RN-CAD-05', risco: RISCO_DADO, campo: 'dependentes', descricao: 'dependentes acima do máximo (11)', valor: '11', mensagem: 'O máximo é 10 dependentes.' },
];

test.describe('Cadastro: valores que DEVEM ser rejeitados', () => {
  for (const r of rejeicoes) {
    test(`[${r.regra}] ${r.descricao}`, async ({ folha }) => {
      cobre(r.regra, r.risco);
      await folha.preencherECalcular({ [r.campo]: r.valor });

      await expect(folha.erro(r.campo)).toHaveText(r.mensagem);
      await expect(folha.campo(r.campo)).toHaveAttribute('aria-invalid', 'true');
      await expect(folha.holerite, 'nenhum holerite pode ser gerado com dado inválido').toBeHidden();
    });
  }
});

interface Aceitacao {
  regra: string;
  campo: CampoId;
  descricao: string;
  valor: string;
}

const aceitacoes: Aceitacao[] = [
  { regra: 'RN-CAD-01', campo: 'nome', descricao: 'nome com 3 caracteres (mínimo)', valor: 'Ana' },
  { regra: 'RN-CAD-01', campo: 'nome', descricao: 'nome com 100 caracteres (máximo)', valor: 'B'.repeat(100) },
  { regra: 'RN-CAD-02', campo: 'cpf', descricao: 'CPF válido sem máscara', valor: '52998224725' },
  { regra: 'RN-CAD-03', campo: 'salario', descricao: 'salário mínimo aceito (0,01)', valor: '0,01' },
  { regra: 'RN-CAD-03', campo: 'salario', descricao: 'salário máximo aceito (999999,99)', valor: '999999,99' },
  { regra: 'RN-CAD-03', campo: 'salario', descricao: 'salário com separador de milhar', valor: '1.621,00' },
  { regra: 'RN-CAD-04', campo: 'admissao', descricao: 'admissão hoje (limite de data)', valor: dataBrasilia(0) },
  { regra: 'RN-CAD-04', campo: 'admissao', descricao: 'admissão em 1900-01-01 (limite mínimo)', valor: '1900-01-01' },
  { regra: 'RN-CAD-05', campo: 'dependentes', descricao: 'zero dependentes', valor: '0' },
  { regra: 'RN-CAD-05', campo: 'dependentes', descricao: 'dez dependentes (máximo)', valor: '10' },
];

test.describe('Cadastro: valores nos limites que DEVEM ser aceitos', () => {
  for (const a of aceitacoes) {
    test(`[${a.regra}] ${a.descricao}`, async ({ folha }) => {
      cobre(a.regra, 'Rejeitar indevidamente um dado válido (falso positivo de validação)');
      await folha.preencherECalcular({ [a.campo]: a.valor });

      await expect(folha.erros, 'nenhuma mensagem de erro deve aparecer').toHaveCount(0);
      await expect(folha.holerite).toBeVisible();
    });
  }
});

test.describe('Cadastro: comportamento do formulário', () => {
  test('[RN-CAD-06] formulário vazio mostra um erro por campo e não gera holerite', async ({ folha }) => {
    cobre('RN-CAD-06', 'Folha calculada sem dados obrigatórios');
    await folha.page.getByRole('button', { name: 'Calcular folha' }).click();

    await expect(folha.erros).toHaveCount(5);
    await expect(folha.holerite).toBeHidden();
  });

  test('[RN-CAD-06] corrigir o campo inválido remove o erro e gera o holerite', async ({ folha }) => {
    cobre('RN-CAD-06', 'Mensagem de erro que não some após a correção');
    await folha.preencherECalcular({ cpf: '123' });
    await expect(folha.erro('cpf')).toBeVisible();

    await folha.campo('cpf').fill('529.982.247-25');
    await folha.calcular();

    await expect(folha.erros).toHaveCount(0);
    await expect(folha.holerite).toBeVisible();
  });
});
