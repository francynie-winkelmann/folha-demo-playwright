const formatador = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como moeda brasileira, ex.: 162100 -> "R$ 1.621,00". */
export function formatarCentavos(centavos: number): string {
  return formatador.format(centavos / 100);
}
