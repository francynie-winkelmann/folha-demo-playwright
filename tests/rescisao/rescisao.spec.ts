import { test, expect } from '../fixtures';
import { carregarCasosRescisao, centavosParaTexto, cobre } from '../helpers/dados';

/**
 * Cálculo da rescisão dirigido por dados. O esperado vem de tests/oraculo/casos-rescisao.json,
 * gerado pela calculadora independente (nunca da tela). Cada caso confere TODOS os valores do termo.
 */
const { casos } = carregarCasosRescisao();

test.describe('Rescisão: verbas, tributos e FGTS', () => {
  for (const caso of casos) {
    test(`[${caso.regra}] ${caso.id}: ${caso.descricao}`, async ({ rescisao }) => {
      // Todo caso confere também o líquido e o arredondamento por verba.
      cobre([caso.regra, 'RN-RES-11', 'RN-RES-12'], caso.risco);

      const e = caso.entrada;
      await rescisao.preencherECalcular({
        tipo: e.tipo,
        salario: centavosParaTexto(e.salarioCentavos),
        dependentes: String(e.dependentes),
        admissao: e.admissao,
        desligamento: e.desligamento,
        saldoFgts: centavosParaTexto(e.saldoFgtsCentavos),
        feriasVencidas: e.feriasVencidas,
        avisoCumprido: e.avisoCumprido,
      });

      await expect(rescisao.termo).toBeVisible();
      expect(await rescisao.valoresDoTermo()).toEqual(caso.esperado);
    });
  }

  test('[RN-RES-11] líquido negativo mostra o aviso de saldo devedor; líquido positivo não', async ({ rescisao }) => {
    cobre('RN-RES-11', 'Saldo devedor do trabalhador exibido como se fosse valor a receber');
    const negativo = casos.find((c) => c.esperado.liquidoCentavos < 0)!;
    const positivo = casos.find((c) => c.esperado.liquidoCentavos > 0)!;
    const e = negativo.entrada;
    await rescisao.preencherECalcular({
      tipo: e.tipo, salario: centavosParaTexto(e.salarioCentavos), dependentes: String(e.dependentes), admissao: e.admissao,
      desligamento: e.desligamento, saldoFgts: centavosParaTexto(e.saldoFgtsCentavos), feriasVencidas: e.feriasVencidas, avisoCumprido: e.avisoCumprido,
    });
    await expect(rescisao.saldoDevedor).toBeVisible();

    const p = positivo.entrada;
    await rescisao.preencherECalcular({
      tipo: p.tipo, salario: centavosParaTexto(p.salarioCentavos), dependentes: String(p.dependentes), admissao: p.admissao,
      desligamento: p.desligamento, saldoFgts: centavosParaTexto(p.saldoFgtsCentavos), feriasVencidas: p.feriasVencidas, avisoCumprido: p.avisoCumprido,
    });
    await expect(rescisao.termo).toBeVisible();
    await expect(rescisao.saldoDevedor).toHaveCount(0);
  });
});
