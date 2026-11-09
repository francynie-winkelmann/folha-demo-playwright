/**
 * CALCULADORA INDEPENDENTE DA RESCISÃO (resultado esperado, parte 1 de 2).
 *
 * Escrita de propósito de outro jeito que o código do sistema (src/domain/rescisao.ts):
 *  - BigInt em vez de number;
 *  - aritmética de datas própria (algoritmo "dias desde a época" de Howard Hinnant), sem Date;
 *  - avos contados mês a mês, dia a dia, em laços simples, em vez de fórmulas;
 *  - INSS e IRRF vêm da calculadora independente da folha mensal (calcularEsperado).
 * Segue as regras RN-RES-01 a RN-RES-12 de docs/regras-de-negocio.md.
 */
import { calcularEsperado } from './calculadora-independente';

export interface EntradaEsperadaRescisao {
  tipo: 'sem_justa_causa' | 'pedido_demissao';
  salarioCentavos: number;
  dependentes: number;
  admissao: string;
  desligamento: string;
  saldoFgtsCentavos: number;
  feriasVencidas: boolean;
  avisoCumprido: boolean;
}

export interface EsperadoRescisao {
  anosCompletos: number;
  avisoDias: number;
  dataProjetada: string;
  avos13: number;
  avosFerias: number;
  saldoSalarioCentavos: number;
  avisoIndenizadoCentavos: number;
  feriasVencidasCentavos: number;
  tercoFeriasVencidasCentavos: number;
  feriasProporcionaisCentavos: number;
  tercoFeriasProporcionaisCentavos: number;
  decimoTerceiroCentavos: number;
  inssSaldoCentavos: number;
  irrfSaldoCentavos: number;
  inss13Centavos: number;
  irrf13Centavos: number;
  descontoAvisoCentavos: number;
  totalProventosCentavos: number;
  totalDescontosCentavos: number;
  liquidoCentavos: number;
  fgtsRescisorioCentavos: number;
  multaFgtsCentavos: number;
}

// ---- Calendário próprio ----------------------------------------------------

/** Número de dias desde 01/01/1970 para uma data civil (algoritmo de Howard Hinnant). */
function diasDesdeEpoca(a: number, m: number, d: number): number {
  const ano = m <= 2 ? a - 1 : a;
  const era = Math.floor(ano / 400);
  const anoDaEra = ano - era * 400;
  const diaDoAno = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const diaDaEra = anoDaEra * 365 + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100) + diaDoAno;
  return era * 146097 + diaDaEra - 719468;
}

/** Inverso de diasDesdeEpoca. */
function dataDeDias(n: number): [number, number, number] {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const diaDaEra = z - era * 146097;
  const anoDaEra = Math.floor((diaDaEra - Math.floor(diaDaEra / 1460) + Math.floor(diaDaEra / 36524) - Math.floor(diaDaEra / 146096)) / 365);
  const diaDoAno = diaDaEra - (365 * anoDaEra + Math.floor(anoDaEra / 4) - Math.floor(anoDaEra / 100));
  const mp = Math.floor((5 * diaDoAno + 2) / 153);
  const dia = diaDoAno - Math.floor((153 * mp + 2) / 5) + 1;
  const mes = mp < 10 ? mp + 3 : mp - 9;
  const ano = anoDaEra + era * 400 + (mes <= 2 ? 1 : 0);
  return [ano, mes, dia];
}

type D = [number, number, number];
const ler = (t: string): D => t.split('-').map(Number) as D;
const dias = (x: D): number => diasDesdeEpoca(x[0], x[1], x[2]);
const texto = (x: D): string => `${String(x[0]).padStart(4, '0')}-${String(x[1]).padStart(2, '0')}-${String(x[2]).padStart(2, '0')}`;
const maisDias = (x: D, n: number): D => dataDeDias(dias(x) + n);

/** Tamanho do mês medido pelo calendário: do dia 1 deste mês ao dia 1 do próximo. */
function tamanhoDoMes(ano: number, mes: number): number {
  const proximo: D = mes === 12 ? [ano + 1, 1, 1] : [ano, mes + 1, 1];
  return dias(proximo) - dias([ano, mes, 1]);
}

/** Aniversário no ano dado; 29/02 vira 01/03 em ano em que fevereiro tem 28 dias. */
function aniversario(adm: D, ano: number): D {
  if (adm[1] === 2 && adm[2] === 29 && tamanhoDoMes(ano, 2) === 28) return [ano, 3, 1];
  return [ano, adm[1], adm[2]];
}

/** Anos completos: conta quantos aniversários já passaram (laço simples). */
function anosDeServico(adm: D, ate: D): number {
  let anos = 0;
  while (dias(aniversario(adm, adm[0] + anos + 1)) <= dias(ate)) anos += 1;
  return anos;
}

/** Data do mesmo dia `n` meses depois; se o dia não existe no mês, usa o último dia dele. */
function maisMeses(x: D, n: number): D {
  let ano = x[0];
  let mes = x[1];
  for (let i = 0; i < n; i++) {
    mes += 1;
    if (mes === 13) {
      mes = 1;
      ano += 1;
    }
  }
  return [ano, mes, Math.min(x[2], tamanhoDoMes(ano, mes))];
}

// ---- Dinheiro --------------------------------------------------------------

function meioParaCima(num: bigint, den: bigint): bigint {
  return (2n * num + den) / (2n * den);
}

// ---- Avos ------------------------------------------------------------------

function avosDe13(adm: D, fim: D): number {
  let avos = 0;
  for (let mes = 1; mes <= fim[1]; mes++) {
    // conta os dias do mês, um a um, em que o contrato estava vigente
    let vigentes = 0;
    for (let dia = 1; dia <= tamanhoDoMes(fim[0], mes); dia++) {
      const hoje = dias([fim[0], mes, dia]);
      if (hoje >= dias(adm) && hoje <= dias(fim)) vigentes += 1;
    }
    if (vigentes >= 15) avos += 1;
  }
  return avos;
}

function avosDeFerias(adm: D, fim: D): number {
  const inicio = aniversario(adm, adm[0] + anosDeServico(adm, fim));
  let meses = 0;
  while (dias(maisMeses(inicio, meses + 1)) <= dias(fim)) meses += 1;
  const sobra = dias(fim) - dias(maisMeses(inicio, meses)) + 1;
  return Math.min(12, meses + (sobra >= 15 ? 1 : 0));
}

// ---- Rescisão --------------------------------------------------------------

export function calcularRescisaoEsperada(e: EntradaEsperadaRescisao): EsperadoRescisao {
  const adm = ler(e.admissao);
  const des = ler(e.desligamento);
  const salario = BigInt(e.salarioCentavos);
  const sem = e.tipo === 'sem_justa_causa';

  const saldo = meioParaCima(salario * BigInt(Math.min(des[2], 30)), 30n);

  const anos = anosDeServico(adm, des);
  let avisoDias = 0;
  if (sem) {
    avisoDias = 30;
    for (let a = 0; a < anos; a++) avisoDias += 3;
    if (avisoDias > 90) avisoDias = 90;
    if (anosDeServico(adm, maisDias(des, avisoDias)) > anos) avisoDias = Math.min(90, avisoDias + 3);
  }
  const aviso = meioParaCima(salario * BigInt(avisoDias), 30n);
  const projetada = sem ? maisDias(des, avisoDias) : des;

  const avos13 = avosDe13(adm, projetada);
  const avosFerias = avosDeFerias(adm, projetada);

  const feriasVenc = e.feriasVencidas ? salario : 0n;
  const tercoVenc = e.feriasVencidas ? meioParaCima(salario, 3n) : 0n;
  const feriasProp = meioParaCima(salario * BigInt(avosFerias), 12n);
  const tercoProp = meioParaCima(salario * BigInt(avosFerias), 36n);
  const decimo = meioParaCima(salario * BigInt(avos13), 12n);

  const sobreSaldo = calcularEsperado(Number(saldo), e.dependentes);
  const sobre13 = calcularEsperado(Number(decimo), e.dependentes);

  const fgtsResc = meioParaCima((saldo + decimo + aviso) * 800n, 10000n);
  const multa = sem ? meioParaCima((BigInt(e.saldoFgtsCentavos) + fgtsResc) * 4000n, 10000n) : 0n;
  const descAviso = !sem && !e.avisoCumprido ? salario : 0n;

  const proventos = saldo + aviso + feriasVenc + tercoVenc + feriasProp + tercoProp + decimo;
  const descontos =
    BigInt(sobreSaldo.inss) + BigInt(sobreSaldo.irrf) + BigInt(sobre13.inss) + BigInt(sobre13.irrf) + descAviso;

  return {
    anosCompletos: anos,
    avisoDias,
    dataProjetada: texto(projetada),
    avos13,
    avosFerias,
    saldoSalarioCentavos: Number(saldo),
    avisoIndenizadoCentavos: Number(aviso),
    feriasVencidasCentavos: Number(feriasVenc),
    tercoFeriasVencidasCentavos: Number(tercoVenc),
    feriasProporcionaisCentavos: Number(feriasProp),
    tercoFeriasProporcionaisCentavos: Number(tercoProp),
    decimoTerceiroCentavos: Number(decimo),
    inssSaldoCentavos: sobreSaldo.inss,
    irrfSaldoCentavos: sobreSaldo.irrf,
    inss13Centavos: sobre13.inss,
    irrf13Centavos: sobre13.irrf,
    descontoAvisoCentavos: Number(descAviso),
    totalProventosCentavos: Number(proventos),
    totalDescontosCentavos: Number(descontos),
    liquidoCentavos: Number(proventos - descontos),
    fgtsRescisorioCentavos: Number(fgtsResc),
    multaFgtsCentavos: Number(multa),
  };
}
