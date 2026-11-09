import { test, expect } from '../fixtures';
import { cobre } from '../helpers/dados';
import type { CampoRescisaoId, PreenchimentoRescisao } from '../pages/RescisaoPage';

const RISCO_DADO = 'Dado inválido entrando no cálculo da rescisão';

interface Rejeicao {
  regra: string;
  campo: CampoRescisaoId;
  descricao: string;
  valores: Partial<PreenchimentoRescisao>;
  mensagem: string;
}

const rejeicoes: Rejeicao[] = [
  { regra: 'RN-RESV-01', campo: 'tipo', descricao: 'tipo de desligamento não escolhido', valores: { tipo: '' }, mensagem: 'Escolha o tipo de desligamento.' },
  { regra: 'RN-RESV-02', campo: 'salario', descricao: 'salário vazio', valores: { salario: '' }, mensagem: 'Informe o salário.' },
  { regra: 'RN-RESV-02', campo: 'salario', descricao: 'salário zero', valores: { salario: '0,00' }, mensagem: 'O salário deve ser maior que zero.' },
  { regra: 'RN-RESV-02', campo: 'salario', descricao: 'salário com letras', valores: { salario: 'abc' }, mensagem: 'Salário em formato inválido.' },
  { regra: 'RN-RESV-02', campo: 'dependentes', descricao: 'dependentes acima do máximo (11)', valores: { dependentes: '11' }, mensagem: 'O máximo é 10 dependentes.' },
  { regra: 'RN-RESV-02', campo: 'dependentes', descricao: 'dependentes vazio', valores: { dependentes: '' }, mensagem: 'Informe o número de dependentes (use 0 se não houver).' },
  { regra: 'RN-RESV-02', campo: 'admissao', descricao: 'admissão vazia', valores: { admissao: '' }, mensagem: 'Informe a data de admissão.' },
  { regra: 'RN-RESV-02', campo: 'admissao', descricao: 'admissão antes de 1900', valores: { admissao: '1899-12-31', desligamento: '1900-01-02' }, mensagem: 'Data de admissão inválida.' },
  { regra: 'RN-RESV-02', campo: 'desligamento', descricao: 'desligamento vazio', valores: { desligamento: '' }, mensagem: 'Informe a data de desligamento.' },
  { regra: 'RN-RESV-02', campo: 'desligamento', descricao: 'desligamento um dia antes da admissão', valores: { admissao: '2025-03-10', desligamento: '2025-03-09' }, mensagem: 'A data de desligamento não pode ser anterior à admissão.' },
  { regra: 'RN-RESV-02', campo: 'desligamento', descricao: 'desligamento depois de 2100', valores: { desligamento: '2101-01-01' }, mensagem: 'Data de desligamento inválida.' },
  { regra: 'RN-RESV-03', campo: 'saldoFgts', descricao: 'saldo do FGTS vazio', valores: { saldoFgts: '' }, mensagem: 'Informe o saldo do FGTS (use 0 se não houver).' },
  { regra: 'RN-RESV-03', campo: 'saldoFgts', descricao: 'saldo do FGTS negativo', valores: { saldoFgts: '-10,00' }, mensagem: 'O saldo do FGTS não pode ser negativo.' },
  { regra: 'RN-RESV-03', campo: 'saldoFgts', descricao: 'saldo do FGTS com letras', valores: { saldoFgts: 'abc' }, mensagem: 'Saldo do FGTS em formato inválido.' },
  { regra: 'RN-RESV-03', campo: 'saldoFgts', descricao: 'saldo do FGTS acima do máximo', valores: { saldoFgts: '1000000,00' }, mensagem: 'O saldo do FGTS máximo aceito é R$ 999.999,99.' },
];

test.describe('Rescisão: valores que DEVEM ser rejeitados', () => {
  for (const r of rejeicoes) {
    test(`[${r.regra}] ${r.descricao}`, async ({ rescisao }) => {
      cobre(r.regra, RISCO_DADO);
      await rescisao.preencherECalcular(r.valores);

      await expect(rescisao.erro(r.campo)).toHaveText(r.mensagem);
      await expect(rescisao.campo(r.campo)).toHaveAttribute('aria-invalid', 'true');
      await expect(rescisao.termo, 'nenhum termo de rescisão com dado inválido').toHaveCount(0);
    });
  }
});

const aceitacoes: Array<{ regra: string; descricao: string; valores: Partial<PreenchimentoRescisao> }> = [
  { regra: 'RN-RESV-02', descricao: 'desligamento no mesmo dia da admissão', valores: { admissao: '2025-03-10', desligamento: '2025-03-10' } },
  { regra: 'RN-RESV-02', descricao: 'dez dependentes (máximo)', valores: { dependentes: '10' } },
  { regra: 'RN-RESV-03', descricao: 'saldo do FGTS zero', valores: { saldoFgts: '0' } },
  { regra: 'RN-RESV-03', descricao: 'saldo do FGTS no máximo', valores: { saldoFgts: '999999,99' } },
];

test.describe('Rescisão: valores nos limites que DEVEM ser aceitos', () => {
  for (const a of aceitacoes) {
    test(`[${a.regra}] ${a.descricao}`, async ({ rescisao }) => {
      cobre(a.regra, 'Rejeitar indevidamente um dado válido (falso positivo de validação)');
      await rescisao.preencherECalcular(a.valores);

      await expect(rescisao.erros, 'nenhuma mensagem de erro deve aparecer').toHaveCount(0);
      await expect(rescisao.termo).toBeVisible();
    });
  }
});

test.describe('Rescisão: comportamento do formulário', () => {
  test('[RN-RESV-01] um erro esconde o termo anterior e a mensagem some depois da correção', async ({ rescisao }) => {
    cobre('RN-RESV-01', 'Termo antigo permanece na tela ou mensagem de erro que não some após a correção');
    await rescisao.preencherECalcular();
    await expect(rescisao.termo).toBeVisible();

    await rescisao.preencherECalcular({ salario: '' });
    await expect(rescisao.termo).toHaveCount(0);
    await expect(rescisao.erro('salario')).toBeVisible();

    await rescisao.preencherECalcular({ salario: '3000,00' });
    await expect(rescisao.erros).toHaveCount(0);
    await expect(rescisao.termo).toBeVisible();
  });
});
