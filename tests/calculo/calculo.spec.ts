import { test, expect } from '../fixtures';
import { carregarCasos, cobre } from '../helpers/dados';

/**
 * Cálculo da folha, dirigido por dados (data-driven).
 *
 * O resultado esperado de cada caso vem de tests/oraculo/casos-calculo.json, gerado
 * pela calculadora INDEPENDENTE. Em nenhum momento o esperado é lido da tela.
 * Todos os valores são comparados em centavos, sem depender da formatação.
 */
const { casos } = carregarCasos();

test.describe('Cálculo da folha mensal: INSS, IRRF, redutor e FGTS', () => {
  for (const caso of casos) {
    test(`[${caso.regra}] ${caso.id}: ${caso.descricao}`, async ({ folha }) => {
      // Todo caso confere também FGTS e líquido, por isso também cobre RN-FGTS-01 e RN-LIQ-01.
      cobre([caso.regra, 'RN-FGTS-01', 'RN-LIQ-01'], caso.risco);

      await folha.preencherECalcular({
        salario: caso.entrada.salario,
        dependentes: String(caso.entrada.dependentes),
      });

      await expect(folha.holerite).toBeVisible();
      expect(await folha.centavos('salario'), 'salário bruto exibido').toBe(caso.entrada.salarioCentavos);
      expect(await folha.valoresDoHolerite(), `valores do holerite (em centavos) para ${caso.descricao}`).toEqual(
        caso.esperado,
      );
    });
  }
});
