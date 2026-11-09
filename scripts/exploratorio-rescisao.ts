/**
 * Sessão exploratória 1 (executada pela IA): limites de datas na rescisão, incluindo a virada de ano.
 * Cada sondagem é digitada na tela e comparada à calculadora independente. Saída em texto, usada nas notas da sessão.
 * Rodar:  PW_CHANNEL=chrome npx tsx scripts/exploratorio-rescisao.ts
 */
import { chromium } from '@playwright/test';
import { RescisaoPage, type PreenchimentoRescisao } from '../tests/pages/RescisaoPage';
import { calcularRescisaoEsperada } from '../tests/oraculo/rescisao-independente';
import { centavosParaTexto } from '../tests/helpers/dados';

const base = { tipo: 'sem_justa_causa' as 'sem_justa_causa' | 'pedido_demissao', salarioCentavos: 300000, dependentes: 0, admissao: '2022-03-10', desligamento: '2025-08-20', saldoFgtsCentavos: 0, feriasVencidas: false, avisoCumprido: true };
type E = typeof base;
const sondas: Array<[string, Partial<E>]> = [
  ['S01 admissão = desligamento (mesmo dia)', { admissao: '2025-08-20' }],
  ['S02 desligamento um dia antes da admissão', { admissao: '2025-08-21' }],
  ['S03 admissão em 29/02 (bissexto), desligamento em 28/02 do ano seguinte', { admissao: '2020-02-29', desligamento: '2021-02-28' }],
  ['S04 admissão em 29/02, desligamento em 01/03 do ano seguinte (aniversário)', { admissao: '2020-02-29', desligamento: '2021-03-01' }],
  ['S05 desligamento em 31/12 (aviso projeta para o ano seguinte)', { admissao: '2020-01-10', desligamento: '2025-12-31' }],
  ['S06 desligamento em 01/01', { admissao: '2020-01-10', desligamento: '2025-01-01' }],
  ['S07 desligamento 20/12 (projeção em janeiro)', { admissao: '2020-01-10', desligamento: '2025-12-20' }],
  ['S08 desligamento 10/12 (projeção em janeiro, mês de dezembro com 10 dias)', { admissao: '2020-01-10', desligamento: '2025-12-10' }],
  ['S09 desligamento em fevereiro bissexto (29/02/2024)', { admissao: '2020-01-10', desligamento: '2024-02-29' }],
  ['S10 desligamento em fevereiro comum (28/02/2025)', { admissao: '2020-01-10', desligamento: '2025-02-28' }],
  ['S11 mês com 31 dias, desligamento no dia 31', { admissao: '2020-01-10', desligamento: '2025-08-31' }],
  ['S12 vínculo de 40 anos (limite de 90 dias de aviso)', { admissao: '1985-01-10', desligamento: '2025-08-20' }],
  ['S13 vínculo de 20 anos e 1 dia antes do aniversário', { admissao: '2005-08-21', desligamento: '2025-08-20' }],
  ['S14 data limite inferior 01/01/1900', { admissao: '1900-01-01', desligamento: '2025-08-20' }],
  ['S15 desligamento no limite superior 31/12/2100', { admissao: '2090-01-01', desligamento: '2100-12-31' }],
  ['S16 pedido de demissão sem aviso, 1 dia de vínculo no mês', { tipo: 'pedido_demissao', avisoCumprido: false, admissao: '2025-08-20', desligamento: '2025-08-20' }],
  ['S17 admissão em 29/02/2100 (2100 NÃO é bissexto)', { admissao: '2100-02-29', desligamento: '2100-12-31' }],
  ['S18 admissão em 29/02/1900 (1900 NÃO é bissexto)', { admissao: '1900-02-29' }],
  ['S19 desligamento em 01/01/2101 (acima do limite)', { desligamento: '2101-01-01' }],
  ['S20 admissão em 31/12/1899 (abaixo do limite)', { admissao: '1899-12-31' }],
  ['S21 admissão em 29/02/2000 (2000 É bissexto), desligamento em 28/02/2001', { admissao: '2000-02-29', desligamento: '2001-02-28' }],
  ['S22 salário de 1 centavo, vínculo de 1 mês', { salarioCentavos: 1, admissao: '2025-07-20', desligamento: '2025-08-20' }],
];

(async () => {
  const nav = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const ctx = await nav.newContext({ baseURL: 'http://localhost:4173', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  const pag = await ctx.newPage();
  const p = new RescisaoPage(pag);
  await p.abrir();
  for (const [nome, delta] of sondas) {
    const e = { ...base, ...delta };
    const f: PreenchimentoRescisao = { tipo: e.tipo, salario: centavosParaTexto(e.salarioCentavos), dependentes: String(e.dependentes), admissao: e.admissao, desligamento: e.desligamento, saldoFgts: '0,00', feriasVencidas: e.feriasVencidas, avisoCumprido: e.avisoCumprido };
    await p.preencherECalcular(f);
    const temTermo = (await p.termo.count()) > 0;
    if (!temTermo) {
      const msgs = await p.erros.allInnerTexts();
      console.log(`${nome}\n   -> recusado pela tela: ${msgs.join(' | ')}`);
      continue;
    }
    const tela = (await p.valoresDoTermo()) as unknown as Record<string, number | string>;
    const esp = calcularRescisaoEsperada(e) as unknown as Record<string, number | string>;
    const dif = Object.keys(esp).filter((k) => tela[k] !== esp[k]);
    console.log(`${nome}\n   -> aviso ${tela['avisoDias']}d, projetada ${tela['dataProjetada']}, avos13 ${tela['avos13']}, avosFérias ${tela['avosFerias']}, 13º ${(Number(tela['decimoTerceiroCentavos']) / 100).toFixed(2)}, líquido ${(Number(tela['liquidoCentavos']) / 100).toFixed(2)}${dif.length ? `  ** DIVERGE do oráculo em: ${dif.join(', ')}` : '  (igual ao oráculo)'}`);
  }
  await nav.close();
})();
