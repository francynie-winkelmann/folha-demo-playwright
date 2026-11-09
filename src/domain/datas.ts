/**
 * Datas de calendário SEM fuso horário.
 *
 * Folha trabalha com datas de calendário ("dia 15 de março"), não com instantes. Por isso as contas aqui
 * usam apenas ano/mês/dia e contagem de dias desde 01/01/1970 (UTC), nunca a hora local do computador.
 */

export interface Data {
  ano: number;
  mes: number; // 1 a 12
  dia: number; // 1 a 31
}

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function ehBissexto(ano: number): boolean {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

export function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) return ehBissexto(ano) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

/**
 * Lê "AAAA-MM-DD" e devolve null se não for uma data real de calendário.
 * Atenção: Date.parse('2023-02-30') NÃO serve para validar, pois aceita dia 30 de fevereiro.
 */
export function lerDataValida(texto: string): Data | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasNoMes(ano, mes)) return null;
  return { ano, mes, dia };
}

export function paraDias(d: Data): number {
  return Math.round(Date.UTC(d.ano, d.mes - 1, d.dia) / MS_POR_DIA);
}

export function deDias(dias: number): Data {
  const x = new Date(dias * MS_POR_DIA);
  return { ano: x.getUTCFullYear(), mes: x.getUTCMonth() + 1, dia: x.getUTCDate() };
}

export function somarDias(d: Data, dias: number): Data {
  return deDias(paraDias(d) + dias);
}

/**
 * Soma meses mantendo o dia; se o dia não existir no mês de destino, usa o último dia do mês
 * (31/01 + 1 mês = 28 ou 29/02).
 */
export function somarMeses(d: Data, meses: number): Data {
  const indice = d.ano * 12 + (d.mes - 1) + meses;
  const ano = Math.floor(indice / 12);
  const mes = (indice % 12) + 1;
  return { ano, mes, dia: Math.min(d.dia, diasNoMes(ano, mes)) };
}

/**
 * Anos completos entre duas datas. Convenção: quem entrou em 29/02 faz aniversário em 01/03
 * nos anos não bissextos.
 */
export function anosCompletos(inicio: Data, fim: Data): number {
  let anos = fim.ano - inicio.ano;
  const aniversarioEsteAno = aniversarioEm(inicio, fim.ano);
  if (paraDias(fim) < paraDias(aniversarioEsteAno)) anos -= 1;
  return Math.max(0, anos);
}

/** Aniversário da data `inicio` no ano indicado (29/02 vira 01/03 em ano não bissexto). */
export function aniversarioEm(inicio: Data, ano: number): Data {
  if (inicio.mes === 2 && inicio.dia === 29 && !ehBissexto(ano)) return { ano, mes: 3, dia: 1 };
  return { ano, mes: inicio.mes, dia: inicio.dia };
}
