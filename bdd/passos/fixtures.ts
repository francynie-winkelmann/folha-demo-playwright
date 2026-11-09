import { test as base } from 'playwright-bdd';
import { RESCISAO_VALIDA, RescisaoPage, type PreenchimentoRescisao } from '../../tests/pages/RescisaoPage';

/**
 * Fixtures do BDD. O playwright-bdd exige estender o "test" dele; por isso a fixture `rescisao`
 * (a mesma da suíte principal, com o mesmo Page Object) é declarada de novo aqui.
 *
 * `dados` é o "mundo" do cenário: os passos "Dado" vão montando os dados, e só o "Quando" digita na tela.
 */
export const test = base.extend<{ rescisao: RescisaoPage; dados: PreenchimentoRescisao }>({
  rescisao: async ({ page }, use) => {
    const rescisao = new RescisaoPage(page);
    await rescisao.abrir();
    await use(rescisao);
  },
  dados: async ({}, use) => {
    await use({ ...RESCISAO_VALIDA, avisoCumprido: true });
  },
});
