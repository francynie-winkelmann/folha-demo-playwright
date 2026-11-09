import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { test } from './fixtures';

const { Given, When, Then } = createBdd(test);

/** "10/07/2022" -> "2022-07-10" */
const dataIso = (br: string): string => {
  const [d, m, a] = br.split('/');
  return `${a}-${m}-${d}`;
};
/** "R$ 3.000,00" -> "3000,00" (formato digitado na tela) */
const valorTela = (brl: string): string => brl.replace('R$', '').trim().replace(/\./g, '');
const moeda = (brl: string): string => brl.replace(/\s/g, ' ');

// ---- Dado ----
Given('um funcionário com salário de {string} e nenhum dependente', async ({ dados }, salario: string) => {
  dados.salario = valorTela(salario);
  dados.dependentes = '0';
});

Given('que ele foi admitido em {string}', async ({ dados }, data: string) => {
  dados.admissao = dataIso(data);
});

Given('foi dispensado sem justa causa em {string}', async ({ dados }, data: string) => {
  dados.tipo = 'sem_justa_causa';
  dados.desligamento = dataIso(data);
});

Given('pediu demissão em {string}', async ({ dados }, data: string) => {
  dados.tipo = 'pedido_demissao';
  dados.desligamento = dataIso(data);
  dados.avisoCumprido = true;
});

Given('pediu demissão em {string} sem cumprir o aviso prévio', async ({ dados }, data: string) => {
  dados.tipo = 'pedido_demissao';
  dados.desligamento = dataIso(data);
  dados.avisoCumprido = false;
});

Given('o saldo do FGTS é {string}', async ({ dados }, saldo: string) => {
  dados.saldoFgts = valorTela(saldo);
});

// ---- Quando ----
When('a rescisão é calculada', async ({ rescisao, dados }) => {
  await rescisao.preencherECalcular(dados);
  await expect(rescisao.termo).toBeVisible();
});

// ---- Então ----
Then('o aviso prévio indenizado é de {int} dias', async ({ page }, dias: number) => {
  await expect(page.getByTestId('rescisao-aviso-dias')).toHaveAttribute('data-valor', String(dias));
});

Then('o valor do aviso prévio indenizado é {string}', async ({ page }, valor: string) => {
  await expect(page.getByTestId('rescisao-aviso-indenizado')).toHaveText(moeda(valor));
});

Then('a multa de 40% do FGTS é {string}', async ({ page }, valor: string) => {
  await expect(page.getByTestId('rescisao-multa-fgts')).toHaveText(moeda(valor));
});

Then('não há aviso prévio indenizado', async ({ page }) => {
  await expect(page.getByTestId('rescisao-aviso-dias')).toHaveAttribute('data-valor', '0');
  await expect(page.getByTestId('rescisao-aviso-indenizado')).toHaveAttribute('data-centavos', '0');
});

Then('o desconto de aviso prévio é {string}', async ({ page }, valor: string) => {
  await expect(page.getByTestId('rescisao-desconto-aviso')).toHaveText(moeda(valor));
});

Then('ele recebe {int} avos de 13º salário', async ({ page }, avos: number) => {
  await expect(page.getByTestId('rescisao-avos-13')).toHaveAttribute('data-valor', String(avos));
});

Then('o termo informa saldo devedor', async ({ rescisao }) => {
  await expect(rescisao.saldoDevedor).toBeVisible();
});
