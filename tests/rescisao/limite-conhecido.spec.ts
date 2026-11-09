import { test, expect } from '../fixtures';
import { cobre, centavosParaTexto } from '../helpers/dados';
import { calcularRescisaoEsperada } from '../oraculo/rescisao-independente';

/**
 * LIMITE CONHECIDO (documentado em docs/regras-de-negocio.md e em docs/plano-de-testes.md).
 *
 * O sistema calcula o 13º só com os avos do ano da data projetada do aviso e SUPÕE que o 13º do ano
 * anterior já foi pago. Este teste não esconde isso: ele fixa o comportamento atual para que uma mudança
 * futura nele seja percebida e decidida por uma pessoa.
 *
 * Caso: salário R$ 3.000,00, admissão 10/01/2020, desligamento 20/11/2025, sem justa causa.
 * A data projetada cai em janeiro de 2026 (menos de 15 dias), então o 13º calculado é R$ 0,00.
 * Se o 13º de 2025 não tivesse sido pago, faltariam R$ 3.000,00 (R$ 0,00 aqui é limite, não acerto).
 */
test('[RN-RES-13] limite conhecido: 13º do ano anterior não é recalculado (esperado R$ 0,00)', async ({ rescisao }) => {
  cobre('RN-RES-13', 'Limite assumido: 13º do ano anterior suposto como já pago');

  const entrada = {
    tipo: 'sem_justa_causa' as const,
    salarioCentavos: 300000,
    dependentes: 0,
    admissao: '2020-01-10',
    desligamento: '2025-11-20',
    saldoFgtsCentavos: 0,
    feriasVencidas: false,
    avisoCumprido: true,
  };
  const esperado = calcularRescisaoEsperada(entrada);
  expect(esperado.decimoTerceiroCentavos).toBe(0);

  await rescisao.preencherECalcular({
    tipo: entrada.tipo,
    salario: centavosParaTexto(entrada.salarioCentavos),
    dependentes: '0',
    admissao: entrada.admissao,
    desligamento: entrada.desligamento,
    saldoFgts: centavosParaTexto(0),
    feriasVencidas: false,
    avisoCumprido: true,
  });
  await expect(rescisao.termo).toBeVisible();
  expect((await rescisao.valoresDoTermo()).decimoTerceiroCentavos).toBe(0);
});
