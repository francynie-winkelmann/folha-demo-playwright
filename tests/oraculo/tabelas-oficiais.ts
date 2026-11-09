/**
 * TRANSCRIÇÃO 2 DE 2 das tabelas de 2026 (a transcrição 1 está em tabelas/2026.json,
 * usada pelo app). Foram digitadas separadamente de propósito: se uma delas tiver erro
 * de digitação, as duas deixam de bater e a suíte acusa.
 *
 * Atenção: as duas partem das MESMAS fontes. Se a fonte estiver errada, o erro se repete
 * nas duas. Por isso a conferência humana com o site oficial continua obrigatória
 * (ver docs/regras-de-negocio.md).
 *
 * Fontes: Portaria Interministerial MPS/MF nº 13/2026 (INSS); tabela mensal do IRRF e
 * redutor da Lei 15.270/2025 (Receita Federal).
 */

/** Início de cada faixa do INSS, em centavos (R$ 0,00 / 1.621,00 / 2.902,84 / 4.354,27). */
export const INSS_INICIOS = [0n, 162100n, 290284n, 435427n] as const;
/** Alíquota de cada faixa, em pontos-base (7,5% / 9% / 12% / 14%). */
export const INSS_ALIQUOTAS = [750n, 900n, 1200n, 1400n] as const;
/** Teto do salário de contribuição: R$ 8.475,55. */
export const INSS_TETO = 847555n;

/** IRRF mensal: limite superior da base de cálculo, alíquota (bps) e parcela a deduzir (centavos). */
export const IRRF_FAIXAS: ReadonlyArray<{ ate: bigint | null; aliquota: bigint; parcela: bigint }> = [
  { ate: 242880n, aliquota: 0n, parcela: 0n }, //          até R$ 2.428,80: isento
  { ate: 282665n, aliquota: 750n, parcela: 18216n }, //     R$ 2.428,81 a 2.826,65
  { ate: 375105n, aliquota: 1500n, parcela: 39416n }, //    R$ 2.826,66 a 3.751,05
  { ate: 466468n, aliquota: 2250n, parcela: 67549n }, //    R$ 3.751,06 a 4.664,68
  { ate: null, aliquota: 2750n, parcela: 90873n }, //       acima de R$ 4.664,68
];

export const IRRF_DEPENDENTE = 18959n; //       R$ 189,59 por dependente
export const IRRF_SIMPLIFICADO = 60720n; //     R$ 607,20 (25% do limite da faixa isenta)

/** Redutor da Lei 15.270/2025. */
export const REDUTOR_ATE = 500000n; //          até R$ 5.000,00: zera o imposto (máx. R$ 312,89)
export const REDUTOR_MAXIMO = 31289n; //        R$ 312,89
export const REDUTOR_FIM = 735000n; //          a partir de R$ 7.350,00 não há redução
export const REDUTOR_CONSTANTE = 97862n; //     R$ 978,62
export const REDUTOR_COEFICIENTE = 133145n; //  0,133145 (em milionésimos)

export const FGTS_ALIQUOTA = 800n; //           8%
