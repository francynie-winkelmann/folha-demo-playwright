import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { carregarCasos, carregarCasosRescisao, cobre } from '../helpers/dados';
import { calcularRescisaoEsperada } from './rescisao-independente';
import { calcularEsperado, inssEsperado, irrfDadoBase } from './calculadora-independente';
import * as oficial from './tabelas-oficiais';

/**
 * Testes DOS RESULTADOS ESPERADOS (não usam navegador).
 * Garantem que as duas fontes de "esperado" estão sãs e concordam entre si:
 *   1) a tabela de casos em arquivo (casos-calculo.json);
 *   2) a calculadora independente.
 * E que a calculadora bate com exemplos publicados pela Receita Federal.
 */

test.describe('Resultado esperado: confiança nas duas fontes', () => {
  test('[RN-ORA-01] a tabela de casos coincide com a calculadora independente', () => {
    cobre('RN-ORA-01', 'Arquivo de casos editado à mão ou desatualizado em relação à calculadora');
    const { casos } = carregarCasos();
    expect(casos.length).toBeGreaterThan(0);
    for (const caso of casos) {
      expect(
        calcularEsperado(caso.entrada.salarioCentavos, caso.entrada.dependentes),
        `caso ${caso.id}`,
      ).toEqual(caso.esperado);
    }
    // Idem para a rescisão (casos-rescisao.json x calculadora independente da rescisão)
    const rescisao = carregarCasosRescisao().casos;
    expect(rescisao.length).toBeGreaterThan(0);
    for (const caso of rescisao) {
      expect(calcularRescisaoEsperada(caso.entrada), `rescisão ${caso.id}`).toEqual(caso.esperado);
    }
  });

  test('[RN-ORA-02] as duas transcrições das tabelas (app e testes) são idênticas', () => {
    cobre('RN-ORA-02', 'Erro de digitação em uma das tabelas de INSS/IRRF');
    const app = JSON.parse(readFileSync(resolve('tabelas/2026.json'), 'utf-8'));

    expect(app.inss.faixas.map((f: { aliquota_bps: number }) => BigInt(f.aliquota_bps))).toEqual([...oficial.INSS_ALIQUOTAS]);
    expect(app.inss.faixas.map((f: { ate_centavos: number }) => BigInt(f.ate_centavos))).toEqual([
      ...oficial.INSS_INICIOS.slice(1),
      oficial.INSS_TETO,
    ]);
    expect(BigInt(app.inss.teto_centavos)).toBe(oficial.INSS_TETO);

    expect(
      app.irrf.faixas.map((f: { ate_centavos: number | null; aliquota_bps: number; parcela_deduzir_centavos: number }) => ({
        ate: f.ate_centavos === null ? null : BigInt(f.ate_centavos),
        aliquota: BigInt(f.aliquota_bps),
        parcela: BigInt(f.parcela_deduzir_centavos),
      })),
    ).toEqual(oficial.IRRF_FAIXAS);
    expect(BigInt(app.irrf.deducao_dependente_centavos)).toBe(oficial.IRRF_DEPENDENTE);
    expect(BigInt(app.irrf.desconto_simplificado_centavos)).toBe(oficial.IRRF_SIMPLIFICADO);
    expect(BigInt(app.irrf.reducao.limite_isencao_centavos)).toBe(oficial.REDUTOR_ATE);
    expect(BigInt(app.irrf.reducao.limite_final_centavos)).toBe(oficial.REDUTOR_FIM);
    expect(BigInt(app.irrf.reducao.maximo_ate_isencao_centavos)).toBe(oficial.REDUTOR_MAXIMO);
    expect(BigInt(app.irrf.reducao.constante_centavos)).toBe(oficial.REDUTOR_CONSTANTE);
    expect(BigInt(app.irrf.reducao.coeficiente_micros)).toBe(oficial.REDUTOR_COEFICIENTE);
    expect(BigInt(app.fgts.aliquota_bps)).toBe(oficial.FGTS_ALIQUOTA);
  });

  test('[RN-ORA-03] a calculadora bate com os exemplos oficiais da Receita Federal (redutor da Lei 15.270/2025)', () => {
    cobre('RN-ORA-03', 'Calculadora de referência com a fórmula do redutor errada');

    // Exemplo 1 (renda R$ 4.500,00; desconto simplificado): base 3.892,80 -> imposto 200,39, zerado pela redução.
    const ex1 = irrfDadoBase(389280n, 450000n);
    expect([ex1.irrfTabela, ex1.reducao, ex1.irrf]).toEqual([20039n, 20039n, 0n]);

    // Exemplo 2 (renda R$ 6.000,00; desconto simplificado): base 5.392,80 -> imposto 574,29; redução 179,75; IRRF 394,54.
    const ex2 = irrfDadoBase(539280n, 600000n);
    expect([ex2.irrfTabela, ex2.reducao, ex2.irrf]).toEqual([57429n, 17975n, 39454n]);

    // Exemplo 3 (renda R$ 5.000,00; desconto simplificado): base 4.392,80 -> imposto 312,89; redução máxima 312,89; IRRF 0.
    const ex3 = irrfDadoBase(439280n, 500000n);
    expect([ex3.irrfTabela, ex3.reducao, ex3.irrf]).toEqual([31289n, 31289n, 0n]);
  });

  test('[RN-ORA-04] INSS máximo de R$ 988,09 no teto e nunca decresce com o aumento do salário', () => {
    cobre('RN-ORA-04', 'Calculadora de referência com INSS incoerente');
    expect(inssEsperado(847555n)).toBe(98809n);
    let anterior = 0n;
    for (let s = 0n; s <= 1_200_000n; s += 37n) {
      const atual = inssEsperado(s);
      expect(atual >= anterior, `INSS decresceu em ${s}`).toBe(true);
      expect(atual <= 98809n).toBe(true);
      anterior = atual;
    }
  });

  test('[RN-ORA-05] informa quantos casos ainda aguardam conferência humana com a fonte oficial', () => {
    cobre('RN-ORA-05', 'Esperado nunca conferido por uma pessoa com a fonte oficial');
    const { casos } = carregarCasos();
    const amostra = casos.filter((c) => c.amostra_conferencia);
    const amostraRescisao = carregarCasosRescisao().casos.filter((c) => c.amostra_conferencia);
    amostra.push(...(amostraRescisao as unknown as typeof amostra));
    const pendentes = amostra.filter((c) => !c.conferido_por);
    test.info().annotations.push({
      type: 'conferência humana',
      description: `${amostra.length - pendentes.length} de ${amostra.length} casos da amostra conferidos (pendentes: ${pendentes.map((c) => c.id).join(', ') || 'nenhum'})`,
    });
    expect(amostra.length).toBeGreaterThan(0);
  });
});
