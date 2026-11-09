/**
 * Grava a REFERÊNCIA APROVADA (golden master) da folha mensal: as saídas da versão atual do código
 * para a grade de entradas. Só deve ser rodado quando a pessoa responsável APROVAR o comportamento atual
 * como o novo "certo" (por exemplo, após conferir a mudança com a regra de negócio).
 *
 *   npm run regressao:referencia -- --aprovar --versao "v1 (Fase 2A)" --por "Nome"
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COLUNAS, entradasDaGrade, linhaDe } from './regressao-comum';

const args = process.argv.slice(2);
const valor = (nome: string): string | undefined => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!args.includes('--aprovar')) {
  console.error('Gravar uma nova referência exige --aprovar (e indicar --versao e --por). Nada foi alterado.');
  process.exit(1);
}
const versao = valor('--versao');
const por = valor('--por');
if (!versao || !por) {
  console.error('Informe --versao "texto" e --por "nome de quem aprovou".');
  process.exit(1);
}

const sha = (c: string) => createHash('sha256').update(readFileSync(resolve(c))).digest('hex');
const linhas = entradasDaGrade().map(([s, d]) => linhaDe(s, d));

const saida = {
  _aviso: 'Referência aprovada (golden master) da folha mensal. Gerada por scripts/regressao-referencia.ts. Não edite à mão.',
  versao,
  aprovada_por: por,
  gerada_em: new Date().toISOString(),
  gerada_a_partir_de: {
    'src/domain/calculo.ts': sha('src/domain/calculo.ts'),
    'tabelas/2026.json': sha('tabelas/2026.json'),
  },
  colunas: COLUNAS,
  linhas,
};
writeFileSync(resolve('regressao/referencia.json'), JSON.stringify(saida).replace(/\],\[/g, '],\n[') + '\n');
console.log(`Referência gravada: ${linhas.length} combinações (${versao}).`);
