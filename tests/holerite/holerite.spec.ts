import { test, expect } from '../fixtures';
import { cobre, FUNCIONARIO_VALIDO } from '../helpers/dados';

test.describe('Holerite: apresentação e propriedades', () => {
  test('[RN-HOL-01] mostra nome e CPF exatamente como informados', async ({ folha }) => {
    cobre('RN-HOL-01', 'Holerite emitido para o funcionário errado');
    await folha.preencherECalcular();

    await expect(folha.page.getByTestId('holerite-nome')).toHaveText(FUNCIONARIO_VALIDO.nome);
    await expect(folha.page.getByTestId('holerite-cpf')).toHaveText(FUNCIONARIO_VALIDO.cpf);
  });

  test('[RN-HOL-02] valores são exibidos em reais, no padrão brasileiro', async ({ folha }) => {
    cobre('RN-HOL-02', 'Valor exibido de forma ambígua ou com formatação errada');
    await folha.preencherECalcular({ salario: '3000,00' });

    const texto = (await folha.item('salario').innerText()).replace(/ /g, ' ');
    expect(texto).toBe('R$ 3.000,00');
  });

  test('[RN-HOL-03] o FGTS é informado, mas não é descontado do salário líquido', async ({ folha }) => {
    cobre('RN-HOL-03', 'FGTS (custo do empregador) descontado indevidamente do funcionário');
    await folha.preencherECalcular({ salario: '3000,00' });

    const [salario, inss, irrf, liquido, fgts] = await Promise.all([
      folha.centavos('salario'),
      folha.centavos('inss'),
      folha.centavos('irrf'),
      folha.centavos('liquido'),
      folha.centavos('fgts'),
    ]);
    expect(fgts).toBe(24000);
    expect(liquido).toBe(salario - inss - irrf);
  });

  test('[RN-HOL-04] recalcular com outro salário atualiza o holerite', async ({ folha }) => {
    cobre('RN-HOL-04', 'Holerite desatualizado exibindo valores do cálculo anterior');
    await folha.preencherECalcular({ salario: '2000,00' });
    const antes = await folha.centavos('liquido');

    await folha.campo('salario').fill('9000,00');
    await folha.calcular();
    const depois = await folha.centavos('liquido');

    expect(depois).not.toBe(antes);
    expect(await folha.centavos('salario')).toBe(900000);
  });

  test('[RN-HOL-05] depois de um cálculo válido, um dado inválido esconde o holerite antigo', async ({ folha }) => {
    cobre('RN-HOL-05', 'Holerite antigo permanece na tela após erro de validação');
    await folha.preencherECalcular();
    await expect(folha.holerite).toBeVisible();

    await folha.campo('cpf').fill('123');
    await folha.calcular();

    await expect(folha.erro('cpf')).toBeVisible();
    await expect(folha.holerite).toBeHidden();
  });
});

/**
 * Testes de PROPRIEDADE: regras que precisam valer para qualquer salário, sem depender
 * de um valor esperado calculado. Funcionam como segunda barreira contra erros do cálculo.
 */
const SALARIOS = ['1000,00', '1621,00', '3000,00', '5000,00', '6000,00', '7350,00', '8475,55', '10000,00', '50000,00'];

test.describe('Holerite: propriedades que valem para qualquer salário', () => {
  for (const salario of SALARIOS) {
    test(`[RN-PROP-01] salário R$ ${salario}: líquido = bruto - INSS - IRRF, INSS dentro do teto, IRRF não negativo`, async ({
      folha,
    }) => {
      cobre('RN-PROP-01', 'Cálculo incoerente consigo mesmo ou fora dos limites legais');
      await folha.preencherECalcular({ salario });

      const v = await folha.valoresDoHolerite();
      const bruto = await folha.centavos('salario');

      expect(v.liquido).toBe(bruto - v.inss - v.irrf);
      expect(v.inss, 'INSS nunca passa do máximo legal (R$ 988,09)').toBeLessThanOrEqual(98809);
      expect(v.inss).toBeGreaterThanOrEqual(0);
      expect(v.irrf).toBeGreaterThanOrEqual(0);
      expect(v.irrf).toBe(Math.max(0, v.irrfTabela - v.reducao));
      expect(v.reducao, 'redução nunca maior que o imposto da tabela').toBeLessThanOrEqual(v.irrfTabela);
    });
  }
});
