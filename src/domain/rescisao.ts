import { calcularFolha, calcularInss } from './calculo';
import { anosCompletos, aniversarioEm, diasNoMes, lerDataValida, paraDias, somarDias, somarMeses, type Data } from './datas';
import { defeitoAtivo } from './defeitos';

/**
 * Rescisão do contrato (v2 do FolhaDemo): dispensa sem justa causa e pedido de demissão.
 * Tudo em centavos inteiros; cada verba é arredondada UMA vez, a partir do salário (RN-RES-12).
 * Regras completas e limites declarados: docs/regras-de-negocio.md (seção "Rescisão").
 */

export type TipoRescisao = 'sem_justa_causa' | 'pedido_demissao';

export interface EntradaRescisao {
  tipo: TipoRescisao;
  salarioCentavos: number;
  dependentes: number;
  admissao: string; // AAAA-MM-DD
  desligamento: string; // AAAA-MM-DD (último dia trabalhado)
  saldoFgtsCentavos: number;
  feriasVencidas: boolean; // há 1 período completo de férias ainda não gozado
  avisoCumprido: boolean; // só vale no pedido de demissão
}

export interface ResultadoRescisao {
  // informações de apoio
  anosCompletos: number;
  avisoDias: number;
  dataProjetada: string;
  avos13: number;
  avosFerias: number;
  // verbas (proventos)
  saldoSalarioCentavos: number;
  avisoIndenizadoCentavos: number;
  feriasVencidasCentavos: number;
  tercoFeriasVencidasCentavos: number;
  feriasProporcionaisCentavos: number;
  tercoFeriasProporcionaisCentavos: number;
  decimoTerceiroCentavos: number;
  // descontos
  inssSaldoCentavos: number;
  irrfSaldoCentavos: number;
  inss13Centavos: number;
  irrf13Centavos: number;
  descontoAvisoCentavos: number;
  // totais
  totalProventosCentavos: number;
  totalDescontosCentavos: number;
  liquidoCentavos: number;
  // FGTS (não entra no líquido: é depositado na conta do trabalhador)
  fgtsRescisorioCentavos: number;
  multaFgtsCentavos: number;
}

/** Divide num/den arredondando meio para cima (valores não negativos). */
function dividir(num: number, den: number): number {
  return Math.floor((2 * num + den) / (2 * den));
}

const formatarData = (d: Data): string =>
  `${d.ano}-${String(d.mes).padStart(2, '0')}-${String(d.dia).padStart(2, '0')}`;

/** Quantos dias do mês `mes` do ano `ano` o contrato esteve vigente, entre `inicio` e `fim` (inclusive). */
function diasVigentesNoMes(ano: number, mes: number, inicio: Data, fim: Data): number {
  const primeiro = Math.max(paraDias({ ano, mes, dia: 1 }), paraDias(inicio));
  const ultimo = Math.min(paraDias({ ano, mes, dia: diasNoMes(ano, mes) }), paraDias(fim));
  return Math.max(0, ultimo - primeiro + 1);
}

/** Avos de 13º no ano da data final: cada mês com 15 ou mais dias de vínculo conta 1/12 (RN-RES-04). */
function avosDecimoTerceiro(admissao: Data, fim: Data, minimoDias: number): number {
  let avos = 0;
  for (let mes = 1; mes <= fim.mes; mes++) {
    if (diasVigentesNoMes(fim.ano, mes, admissao, fim) >= minimoDias) avos += 1;
  }
  return avos;
}

/** Avos de férias proporcionais: meses desde o último aniversário de admissão (RN-RES-04). */
function avosFeriasProporcionais(admissao: Data, fim: Data, minimoDias: number): number {
  const anos = anosCompletos(admissao, fim);
  const inicioPeriodo = aniversarioEm(admissao, admissao.ano + anos);
  let meses = (fim.ano - inicioPeriodo.ano) * 12 + (fim.mes - inicioPeriodo.mes);
  if (paraDias(fim) < paraDias(somarMeses(inicioPeriodo, meses))) meses -= 1;
  const sobra = paraDias(fim) - paraDias(somarMeses(inicioPeriodo, meses)) + 1;
  return Math.min(12, meses + (sobra >= minimoDias ? 1 : 0));
}

export function calcularRescisao(e: EntradaRescisao): ResultadoRescisao {
  // Stryker disable all: pontos de injeção de defeito proposital (desligados por padrão)
  const semTresDiasPorAno = defeitoAtivo('res_aviso_sem_3_dias_por_ano');
  const semProjecao = defeitoAtivo('res_sem_projecao_aviso');
  const inssSobreAviso = defeitoAtivo('res_inss_sobre_aviso');
  const multaSempre = defeitoAtivo('res_multa_em_pedido_demissao');
  const minimoDiasAvo = defeitoAtivo('res_avos_qualquer_dia') ? 1 : 15;
  // Stryker restore all

  const adm = lerDataValida(e.admissao);
  const des = lerDataValida(e.desligamento);
  if (!adm || !des) throw new Error('Datas inválidas: valide a entrada antes de calcular a rescisão.');

  const salario = e.salarioCentavos;
  const semJustaCausa = e.tipo === 'sem_justa_causa';

  // RN-RES-01: saldo de salário = dias do mês até o desligamento, com mês comercial de 30 dias
  const diasSaldo = Math.min(des.dia, 30);
  const saldoSalario = dividir(salario * diasSaldo, 30);

  // RN-RES-02: aviso prévio indenizado = 30 dias + 3 por ano completo (máx. 90);
  // se a projeção completar mais um ano de serviço, +3 dias.
  const anos = anosCompletos(adm, des);
  let avisoDias = 0;
  if (semJustaCausa) {
    avisoDias = Math.min(90, 30 + 3 * anos);
    const anosNaProjecao = anosCompletos(adm, somarDias(des, avisoDias));
    if (anosNaProjecao > anos) avisoDias = Math.min(90, avisoDias + 3);
    // Stryker disable next-line all: ponto de injeção de defeito proposital
    if (semTresDiasPorAno) avisoDias = 30;
  }
  const avisoIndenizado = dividir(salario * avisoDias, 30);

  // RN-RES-03: o aviso indenizado conta como tempo de serviço (projeção) para os avos
  // Stryker disable next-line all: ponto de injeção de defeito proposital
  const dataProjetada = semJustaCausa && !semProjecao ? somarDias(des, avisoDias) : des;

  // RN-RES-04: avos
  const avos13 = avosDecimoTerceiro(adm, dataProjetada, minimoDiasAvo);
  const avosFerias = avosFeriasProporcionais(adm, dataProjetada, minimoDiasAvo);

  // RN-RES-05, 06, 07
  const feriasVencidas = e.feriasVencidas ? salario : 0;
  const tercoFeriasVencidas = e.feriasVencidas ? dividir(salario, 3) : 0;
  const feriasProporcionais = dividir(salario * avosFerias, 12);
  const tercoFeriasProporcionais = dividir(salario * avosFerias, 36);
  const decimoTerceiro = dividir(salario * avos13, 12);

  // RN-RES-08: INSS e IRRF só sobre saldo de salário e 13º, cada um calculado separadamente
  const sobreSaldo = calcularFolha({ salarioCentavos: saldoSalario, dependentes: e.dependentes });
  const sobre13 = calcularFolha({ salarioCentavos: decimoTerceiro, dependentes: e.dependentes });
  let inssSaldo = sobreSaldo.inssCentavos;
  // Stryker disable next-line all: ponto de injeção de defeito proposital
  if (inssSobreAviso) inssSaldo += calcularInss(saldoSalario + avisoIndenizado) - calcularInss(saldoSalario);

  // RN-RES-09: FGTS rescisório (8%) e multa de 40% (só na dispensa sem justa causa)
  const fgtsRescisorio = dividir((saldoSalario + decimoTerceiro + avisoIndenizado) * 800, 10000);
  // Stryker disable next-line all: ponto de injeção de defeito proposital
  const temMulta = semJustaCausa || multaSempre;
  const multaFgts = temMulta ? dividir((e.saldoFgtsCentavos + fgtsRescisorio) * 4000, 10000) : 0;

  // RN-RES-10: pedido de demissão sem cumprir o aviso desconta 30 dias de salário
  const descontoAviso = !semJustaCausa && !e.avisoCumprido ? salario : 0;

  const totalProventos =
    saldoSalario + avisoIndenizado + feriasVencidas + tercoFeriasVencidas + feriasProporcionais + tercoFeriasProporcionais + decimoTerceiro;
  const totalDescontos = inssSaldo + sobreSaldo.irrfCentavos + sobre13.inssCentavos + sobre13.irrfCentavos + descontoAviso;

  return {
    anosCompletos: anos,
    avisoDias,
    dataProjetada: formatarData(dataProjetada),
    avos13,
    avosFerias,
    saldoSalarioCentavos: saldoSalario,
    avisoIndenizadoCentavos: avisoIndenizado,
    feriasVencidasCentavos: feriasVencidas,
    tercoFeriasVencidasCentavos: tercoFeriasVencidas,
    feriasProporcionaisCentavos: feriasProporcionais,
    tercoFeriasProporcionaisCentavos: tercoFeriasProporcionais,
    decimoTerceiroCentavos: decimoTerceiro,
    inssSaldoCentavos: inssSaldo,
    irrfSaldoCentavos: sobreSaldo.irrfCentavos,
    inss13Centavos: sobre13.inssCentavos,
    irrf13Centavos: sobre13.irrfCentavos,
    descontoAvisoCentavos: descontoAviso,
    totalProventosCentavos: totalProventos,
    totalDescontosCentavos: totalDescontos,
    liquidoCentavos: totalProventos - totalDescontos,
    fgtsRescisorioCentavos: fgtsRescisorio,
    multaFgtsCentavos: multaFgts,
  };
}
