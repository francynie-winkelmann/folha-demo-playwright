import { defineConfig, devices } from '@playwright/test';

const PORTA = 4173;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Sem retentativas: um teste que só passa na segunda tentativa esconde instabilidade.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  // O relatório JSON alimenta a rastreabilidade e as evidências (scripts/gerar-*.ts).
  reporter: [['list'], ['html', { open: 'never' }], ['json', { outputFile: 'reports/resultados.json' }]],
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Uso local opcional: PW_CHANNEL=chrome usa o Chrome já instalado, sem baixar o navegador do Playwright.
        ...(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
