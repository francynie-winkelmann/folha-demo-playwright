import { test as base } from '@playwright/test';
import { FolhaPage } from './pages/FolhaPage';
import { RescisaoPage } from './pages/RescisaoPage';

/** Fixture: cada teste recebe a tela já aberta, em página limpa. */
export const test = base.extend<{ folha: FolhaPage; rescisao: RescisaoPage }>({
  folha: async ({ page }, use) => {
    const folha = new FolhaPage(page);
    await folha.abrir();
    await use(folha);
  },
  /** Fixture da aba Rescisão: abre o app e já vai para a aba. */
  rescisao: async ({ page }, use) => {
    const rescisao = new RescisaoPage(page);
    await rescisao.abrir();
    await use(rescisao);
  },
});

export { expect } from '@playwright/test';
