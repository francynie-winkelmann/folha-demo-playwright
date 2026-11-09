import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

/**
 * Configuração só do BDD. O playwright-bdd lê os arquivos .feature e gera os testes do Playwright em
 * .features-gen/ (pasta gerada, fora do Git). Rodar com:  npm run test:bdd
 */
const PORTA = 4173;

const testDir = defineBddConfig({
  features: 'bdd/*.feature',
  steps: ['bdd/passos/*.ts'],
  outputDir: '.features-gen',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['json', { outputFile: 'reports/resultados-bdd.json' }]],
  use: { baseURL: `http://localhost:${PORTA}`, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}) },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
