import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from '@playwright/test';
import type { Esperado } from '../oraculo/calculadora-independente';
import type { EntradaEsperadaRescisao, EsperadoRescisao } from '../oraculo/rescisao-independente';

/** Funcionário FICTÍCIO e válido. O CPF é gerado por algoritmo; não pertence a ninguém de propósito. */
export const FUNCIONARIO_VALIDO = {
  nome: 'Maria da Silva Exemplo',
  cpf: '529.982.247-25',
  salario: '3000,00',
  admissao: '2020-01-15',
  dependentes: '0',
} as const;

export interface CasoCalculo {
  id: string;
  regra: string;
  risco: string;
  descricao: string;
  entrada: { salario: string; salarioCentavos: number; dependentes: number };
  esperado: Esperado;
  amostra_conferencia: boolean;
  conferido_por: string | null;
  conferido_em: string | null;
}

export function carregarCasos(): { versao_tabelas: string; casos: CasoCalculo[] } {
  const caminho = resolve('tests/oraculo/casos-calculo.json');
  return JSON.parse(readFileSync(caminho, 'utf-8'));
}

/**
 * Registra no relatório qual regra de negócio e qual risco o teste cobre.
 * Isso alimenta a rastreabilidade (regra -> risco -> teste -> evidência).
 */
export function cobre(regras: string | string[], risco: string): void {
  const lista = Array.isArray(regras) ? regras : [regras];
  test.info().annotations.push(
    ...lista.map((regra) => ({ type: 'regra', description: regra })),
    { type: 'risco', description: risco },
  );
}

/** Data de hoje (AAAA-MM-DD) no fuso de Brasília, o mesmo fuso configurado no navegador dos testes. */
export function dataBrasilia(deslocamentoDias = 0): string {
  const ms = Date.now() + deslocamentoDias * 24 * 60 * 60 * 1000;
  return new Date(ms).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export interface CasoRescisao {
  id: string;
  regra: string;
  risco: string;
  descricao: string;
  entrada: EntradaEsperadaRescisao;
  esperado: EsperadoRescisao;
  amostra_conferencia: boolean;
  conferido_por: string | null;
  conferido_em: string | null;
}

export function carregarCasosRescisao(): { versao_tabelas: string; casos: CasoRescisao[] } {
  return JSON.parse(readFileSync(resolve('tests/oraculo/casos-rescisao.json'), 'utf-8'));
}

/** Converte centavos para o texto digitado na tela, ex.: 300000 -> "3000,00". */
export function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}
