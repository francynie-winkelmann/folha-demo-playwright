/**
 * Gera tests/oraculo/casos-rescisao.json (resultado esperado da rescisão, parte 1 de 2) usando a
 * CALCULADORA INDEPENDENTE (tests/oraculo/rescisao-independente.ts). O app nunca é consultado.
 *
 * Rodar:  npm run oraculos:gerar
 * Os casos marcados com "amostra_conferencia": true devem ser conferidos por uma pessoa
 * (campos "conferido_por" e "conferido_em").
 */
import { writeFileSync } from 'node:fs';
import { calcularRescisaoEsperada, type EntradaEsperadaRescisao } from '../tests/oraculo/rescisao-independente';

interface Definicao {
  id: string;
  regra: string;
  risco: string;
  descricao: string;
  entrada: EntradaEsperadaRescisao;
  amostra: boolean;
}

const SJC = 'sem_justa_causa' as const;
const PD = 'pedido_demissao' as const;

const base = (parcial: Partial<EntradaEsperadaRescisao>): EntradaEsperadaRescisao => ({
  tipo: SJC,
  salarioCentavos: 300000,
  dependentes: 0,
  admissao: '2024-03-10',
  desligamento: '2025-08-20',
  saldoFgtsCentavos: 0,
  feriasVencidas: false,
  avisoCumprido: true,
  ...parcial,
});

const D = (id: string, regra: string, descricao: string, risco: string, parcial: Partial<EntradaEsperadaRescisao>, amostra = false): Definicao => ({
  id,
  regra,
  risco,
  descricao,
  entrada: base(parcial),
  amostra,
});

const R_SALDO = 'Saldo de salário calculado com dias errados';
const R_AVISO = 'Aviso prévio pago a menos ou a mais';
const R_AVOS = 'Férias proporcionais e 13º com número de avos errado';
const R_TRIB = 'Tributo retido sobre verba errada';
const R_FGTS = 'FGTS ou multa de 40% pagos de forma indevida';
const R_LIQ = 'Líquido da rescisão incorreto';

const definicoes: Definicao[] = [
  D('r01', 'RN-RES-01', 'Desligamento no dia 31: o mês comercial conta 30 dias', R_SALDO, { desligamento: '2025-08-31' }),
  D('r02', 'RN-RES-01', 'Desligamento no dia 1: um único dia de saldo', R_SALDO, { desligamento: '2025-08-01' }),
  D('r03', 'RN-RES-02', 'Menos de 1 ano de casa: aviso de 30 dias', R_AVISO, { admissao: '2025-03-10' }),
  D('r04', 'RN-RES-02', '3 anos completos: aviso de 39 dias', R_AVISO, { admissao: '2022-01-05', desligamento: '2025-06-20' }, true),
  D('r05', 'RN-RES-02', 'A projeção do aviso completa mais um ano: +3 dias (2 anos + projeção = 39)', R_AVISO, { admissao: '2022-07-10', desligamento: '2025-07-01' }, true),
  D('r06', 'RN-RES-02', 'A projeção NÃO chega ao aniversário: sem os 3 dias extras (36)', R_AVISO, { admissao: '2022-08-05', desligamento: '2025-06-29' }),
  D('r07', 'RN-RES-02', 'Mais de 25 anos de casa: aviso limitado a 90 dias', R_AVISO, { admissao: '2000-01-10', desligamento: '2025-05-15' }),
  D('r08', 'RN-RES-02', 'Admissão em 29/02: o aniversário cai em 01/03 nos anos não bissextos', R_AVISO, { admissao: '2020-02-29', desligamento: '2025-02-28' }),
  D('r09', 'RN-RES-03', 'A projeção do aviso acrescenta um avo de 13º e de férias', R_AVOS, { admissao: '2020-01-10', desligamento: '2025-06-20' }),
  D('r10', 'RN-RES-04', 'Pedido de demissão: exatamente 15 dias no mês conta como avo', R_AVOS, { tipo: PD, admissao: '2024-01-02', desligamento: '2025-05-15' }),
  D('r11', 'RN-RES-04', 'Pedido de demissão: 14 dias no mês não conta como avo', R_AVOS, { tipo: PD, admissao: '2024-01-02', desligamento: '2025-05-14' }),
  D('r12', 'RN-RES-04', 'Admitido no ano com 15 dias no mês de admissão: conta', R_AVOS, { tipo: PD, admissao: '2025-03-17', desligamento: '2025-09-30' }),
  D('r13', 'RN-RES-04', 'Admitido no ano com 14 dias no mês de admissão: não conta', R_AVOS, { tipo: PD, admissao: '2025-03-18', desligamento: '2025-09-30' }),
  D('r14', 'RN-RES-04', 'Férias proporcionais: sobra de 16 dias após os meses completos conta 1 avo', R_AVOS, { tipo: PD, admissao: '2023-04-10', desligamento: '2025-10-25' }),
  D('r15', 'RN-RES-04', 'Férias proporcionais: sobra de 14 dias não conta', R_AVOS, { tipo: PD, admissao: '2023-04-10', desligamento: '2025-10-23' }),
  D('r16', 'RN-RES-04', 'Férias proporcionais no limite de 12 avos', R_AVOS, { tipo: PD, admissao: '2023-04-10', desligamento: '2025-04-09' }),
  D('r17', 'RN-RES-05', 'Férias vencidas: 1 salário + 1/3', 'Férias vencidas esquecidas ou sem o terço', { feriasVencidas: true }),
  D('r18', 'RN-RES-06', 'Férias proporcionais com o terço', 'Terço constitucional omitido ou calculado sobre valor arredondado', { tipo: PD, admissao: '2024-01-02', desligamento: '2025-07-20', salarioCentavos: 234567 }),
  D('r19', 'RN-RES-07', '13º proporcional de ano completo (12 avos)', R_AVOS, { tipo: PD, admissao: '2024-01-10', desligamento: '2025-12-31' }),
  D('r20', 'RN-RES-08', 'Redutor da Lei 15.270 também no 13º (13º de R$ 6.500,00)', R_TRIB, { tipo: PD, salarioCentavos: 650000, admissao: '2020-01-02', desligamento: '2025-12-20' }, true),
  D('r21', 'RN-RES-08', 'Salário alto com 2 dependentes: INSS e IRRF do saldo e do 13º separados', R_TRIB, { salarioCentavos: 1200000, dependentes: 2, admissao: '2019-05-06', desligamento: '2025-10-28' }),
  D('r22', 'RN-RES-08', 'Aviso prévio longo não sofre INSS nem IRRF', R_TRIB, { salarioCentavos: 400000, admissao: '2015-02-02', desligamento: '2025-04-10' }),
  D('r23', 'RN-RES-09', 'Sem justa causa: multa de 40% sobre saldo do FGTS + FGTS rescisório', R_FGTS, { saldoFgtsCentavos: 2500000 }, true),
  D('r24', 'RN-RES-09', 'Pedido de demissão: sem multa de 40%', R_FGTS, { tipo: PD, saldoFgtsCentavos: 2500000 }),
  D('r25', 'RN-RES-10', 'Pedido de demissão com aviso cumprido: nenhum desconto', R_LIQ, { tipo: PD, avisoCumprido: true }),
  D('r26', 'RN-RES-10', 'Pedido de demissão sem cumprir o aviso: desconta 30 dias', R_LIQ, { tipo: PD, avisoCumprido: false }),
  D('r27', 'RN-RES-11', 'Pedido de demissão sem aviso e com poucos dias: líquido negativo (saldo devedor)', R_LIQ, { tipo: PD, avisoCumprido: false, salarioCentavos: 200000, admissao: '2025-01-02', desligamento: '2025-02-05' }),
  D('r28', 'RN-RES-12', 'Salário com centavos: cada verba arredondada uma só vez', 'Diferença de centavos acumulada', { salarioCentavos: 123457, admissao: '2023-09-14', desligamento: '2025-03-17', feriasVencidas: true, saldoFgtsCentavos: 1234567 }),
  D('r29', 'RN-RES-08', 'Três dependentes sem justa causa', R_TRIB, { dependentes: 3, salarioCentavos: 750000, admissao: '2021-11-03', desligamento: '2025-09-18' }),
];

const saidaCasos = definicoes.map((d) => ({
  id: d.id,
  regra: d.regra,
  risco: d.risco,
  descricao: d.descricao,
  entrada: d.entrada,
  esperado: calcularRescisaoEsperada(d.entrada),
  amostra_conferencia: d.amostra,
  conferido_por: null as string | null,
  conferido_em: null as string | null,
}));

writeFileSync(
  'tests/oraculo/casos-rescisao.json',
  JSON.stringify(
    {
      _aviso: 'Arquivo GERADO por scripts/gerar-casos-rescisao.ts com a calculadora independente. Não edite os valores à mão. Valores em centavos.',
      versao_tabelas: '2026-01',
      gerado_por: 'tests/oraculo/rescisao-independente.ts',
      casos: saidaCasos,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Gerados ${saidaCasos.length} casos de rescisão.`);
