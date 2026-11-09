import { defineConfig } from 'vitest/config';

// Testes unitários rápidos (sem navegador) da regra de negócio em src/domain.
// Ficam em "unitarios/" e usam o sufixo ".teste.ts" para o Playwright (que lê "tests/") não os executar.
export default defineConfig({
  test: {
    include: ['unitarios/**/*.teste.ts'],
    environment: 'node',
  },
});
