/**
 * Gera a matriz de rastreabilidade: regra de negócio -> risco -> teste -> resultado.
 *
 * Entradas:
 *   - docs/regras-de-negocio.md  (lista oficial das regras: linhas "| RN-XXX-NN | texto |")
 *   - reports/resultados.json    (relatório JSON do Playwright, gerado por `npm test`)
 * Saídas:
 *   - docs/qualidade/rastreabilidade.md e .json
 *
 * Falha (código 1) quando: há regra SEM nenhum teste, há teste citando regra que não existe no documento,
 * ou há teste sem regra associada. Assim a matriz não "apodrece" sem ninguém notar.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Anotacao { type: string; description?: string }
interface ResultadoPw { status: string }
interface TestePw { annotations: Anotacao[]; status: string; results: ResultadoPw[] }
interface SpecPw { title: string; file: string; tags?: string[]; tests: TestePw[] }
interface SuitePw { specs?: SpecPw[]; suites?: SuitePw[] }

// Entradas: Playwright (suíte principal) e, se existir, o resultado do BDD (npm run test:bdd).
const entradas = process.argv.length > 2 ? process.argv.slice(2) : ['reports/resultados.json', 'reports/resultados-bdd.json'];
const dir = 'docs/qualidade';

function coletarSpecs(s: SuitePw, acc: SpecPw[] = []): SpecPw[] {
  acc.push(...(s.specs ?? []));
  (s.suites ?? []).forEach((x) => coletarSpecs(x, acc));
  return acc;
}

// 1) Regras oficiais
const regras = new Map<string, string>();
for (const linha of readFileSync(resolve('docs/regras-de-negocio.md'), 'utf-8').split('\n')) {
  const m = linha.match(/^\|\s*(RN-[A-Z]+-\d+)\s*\|\s*(.+?)\s*\|\s*$/);
  if (m) regras.set(m[1]!, m[2]!);
}

// 2) Testes e resultados
interface SpecComOrigem extends SpecPw { origem: 'playwright' | 'bdd' }
const specs: SpecComOrigem[] = [];
for (const arquivo of entradas) {
  if (!existsSync(resolve(arquivo))) {
    if (arquivo === 'reports/resultados.json') throw new Error(`Rode "npm test" antes: ${arquivo} não existe.`);
    continue; // BDD é opcional
  }
  const relatorio = JSON.parse(readFileSync(resolve(arquivo), 'utf-8')) as { suites: SuitePw[] };
  const origem = arquivo.includes('bdd') ? 'bdd' : 'playwright';
  specs.push(...relatorio.suites.flatMap((s) => coletarSpecs(s)).map((sp) => ({ ...sp, origem }) as SpecComOrigem));
}

interface Execucao { teste: string; arquivo: string; origem: string; resultado: 'passou' | 'falhou' | 'instável' | 'ignorado' }
const porRegra = new Map<string, { testes: Execucao[]; riscos: Set<string> }>();
const semRegra: string[] = [];

for (const spec of specs) {
  for (const t of spec.tests) {
    // Playwright: anotações cobre(...). BDD: tags @RN-XXX-NN no cenário (o risco é o próprio comportamento descrito).
    const regrasDoTeste = [
      ...t.annotations.filter((a) => a.type === 'regra').map((a) => a.description!),
      ...(spec.tags ?? []).filter((x) => /^RN-[A-Z]+-\d+$/.test(x)),
    ];
    const riscos = t.annotations.filter((a) => a.type === 'risco').map((a) => a.description!);
    if (spec.origem === 'bdd') riscos.push(`Comportamento descrito no cenário BDD: ${spec.title}`);
    const resultado: Execucao['resultado'] =
      t.status === 'expected' ? 'passou' : t.status === 'flaky' ? 'instável' : t.status === 'skipped' ? 'ignorado' : 'falhou';
    if (regrasDoTeste.length === 0) semRegra.push(`${spec.file}: ${spec.title}`);
    for (const r of regrasDoTeste) {
      const reg = porRegra.get(r) ?? { testes: [], riscos: new Set<string>() };
      reg.testes.push({ teste: spec.title, arquivo: spec.file, origem: spec.origem, resultado });
      riscos.forEach((x) => reg.riscos.add(x));
      porRegra.set(r, reg);
    }
  }
}

// 3) Verificações
const regrasSemTeste = [...regras.keys()].filter((r) => !porRegra.has(r));
const regrasDesconhecidas = [...porRegra.keys()].filter((r) => !regras.has(r));

// 4) Saída
const linhas: string[] = [];
linhas.push('# Matriz de rastreabilidade');
linhas.push('');
linhas.push('> Gerada automaticamente por `npm run rastreabilidade` a partir de `docs/regras-de-negocio.md` e do resultado real da última execução do Playwright (e do BDD, quando rodado). **Não edite à mão.**');
linhas.push('');
linhas.push('Como ler: cada regra de negócio aponta para os riscos que ela protege e para os testes que a verificam, com o resultado da execução.');
linhas.push('');
const total = [...porRegra.values()].reduce((n, r) => n + r.testes.length, 0);
linhas.push(`- Regras documentadas: **${regras.size}**`);
linhas.push(`- Regras com ao menos um teste: **${regras.size - regrasSemTeste.length}**`);
linhas.push(`- Regras SEM teste: **${regrasSemTeste.length}**${regrasSemTeste.length ? ` (${regrasSemTeste.join(', ')})` : ''}`);
linhas.push(`- Testes executados: **${specs.length}** (vínculos regra↔teste: ${total}); destes, **${specs.filter((x) => x.origem === 'bdd').length}** são cenários BDD`);
linhas.push('');
linhas.push('| Regra | O que diz | Testes | (BDD) | Passou | Falhou | Riscos cobertos |');
linhas.push('|---|---|---:|---:|---:|---:|---|');
const json: unknown[] = [];
for (const [id, texto] of regras) {
  const r = porRegra.get(id);
  const n = r?.testes.length ?? 0;
  const ok = r?.testes.filter((t) => t.resultado === 'passou').length ?? 0;
  const bdd = r?.testes.filter((t) => t.origem === 'bdd').length ?? 0;
  const ruim = n - ok;
  const riscos = r ? [...r.riscos].join('; ') : '—';
  const marca = n === 0 ? '⚠️ **SEM TESTE**' : '';
  linhas.push(`| ${id} | ${texto.replace(/\|/g, '/')}${marca ? " " + marca : ""} | ${n} | ${bdd} | ${ok} | ${ruim} | ${riscos} |`);
  json.push({ regra: id, texto, testes: n, passaram: ok, falharam: ruim, riscos: r ? [...r.riscos] : [], lista: r?.testes ?? [] });
}
if (regrasDesconhecidas.length) {
  linhas.push('', `## ⚠️ Testes citando regras que não existem no documento`, '', regrasDesconhecidas.map((r) => `- ${r}`).join('\n'));
}
if (semRegra.length) {
  linhas.push('', '## ⚠️ Testes sem regra associada', '', semRegra.map((t) => `- ${t}`).join('\n'));
}

mkdirSync(resolve(dir), { recursive: true });
writeFileSync(resolve(dir, 'rastreabilidade.md'), linhas.join('\n') + '\n');
writeFileSync(resolve(dir, 'rastreabilidade.json'), JSON.stringify({ regras: json, semTeste: regrasSemTeste, desconhecidas: regrasDesconhecidas, testesSemRegra: semRegra }, null, 2) + '\n');

console.log(`Rastreabilidade: ${regras.size} regras, ${regrasSemTeste.length} sem teste, ${regrasDesconhecidas.length} desconhecidas, ${semRegra.length} testes sem regra.`);
if (regrasSemTeste.length || regrasDesconhecidas.length || semRegra.length) process.exit(1);
