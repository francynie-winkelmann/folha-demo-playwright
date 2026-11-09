/**
 * Gera a evidência de UMA execução: o que rodou, em qual versão do código, com qual resultado,
 * e uma "impressão digital" (SHA-256) dos arquivos que sustentam o resultado.
 *
 * Entradas: reports/resultados.json (Playwright) e, se existir, reports/mutacao/mutation.json (Stryker).
 * Saídas:   reports/evidencia/manifesto.json (artefato de CI) e docs/qualidade/evidencia.md (resumo legível).
 *
 * Limite honesto: o SHA-256 mostra se um arquivo mudou depois da execução; ele NÃO prova quem o gerou.
 * A prova forte é o próprio CI (execução registrada no GitHub com o commit e o log), que este manifesto referencia.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface SuitePw { specs?: { tests: { status: string }[] }[]; suites?: SuitePw[] }

const sha256 = (caminho: string): string => createHash('sha256').update(readFileSync(resolve(caminho))).digest('hex');

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function contar(s: SuitePw, c: Record<string, number>): void {
  for (const spec of s.specs ?? []) for (const t of spec.tests) c[t.status] = (c[t.status] ?? 0) + 1;
  (s.suites ?? []).forEach((x) => contar(x, c));
}

const arquivoResultados = 'reports/resultados.json';
if (!existsSync(resolve(arquivoResultados))) throw new Error(`Rode "npm test" antes: ${arquivoResultados} não existe.`);

const rel = JSON.parse(readFileSync(resolve(arquivoResultados), 'utf-8')) as { suites: SuitePw[]; stats?: { startTime?: string; duration?: number } };
const c: Record<string, number> = {};
rel.suites.forEach((s) => contar(s, c));
const total = Object.values(c).reduce((a, b) => a + b, 0);

let bdd: { total: number; passaram: number } | null = null;
if (existsSync(resolve('reports/resultados-bdd.json'))) {
  const rb = JSON.parse(readFileSync(resolve('reports/resultados-bdd.json'), 'utf-8')) as { suites: SuitePw[] };
  const cb: Record<string, number> = {};
  rb.suites.forEach((s) => contar(s, cb));
  bdd = { total: Object.values(cb).reduce((a, b) => a + b, 0), passaram: cb['expected'] ?? 0 };
}

const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf-8')) as { version: string; devDependencies: Record<string, string> };
const estaNoCI = process.env.GITHUB_ACTIONS === 'true';
const commit = process.env.GITHUB_SHA ?? git(['rev-parse', 'HEAD']);
const alterado = git(['status', '--porcelain']);

let mutacao: { nota: number } | null = null;
if (existsSync(resolve('reports/mutacao/mutation.json'))) {
  const m = JSON.parse(readFileSync(resolve('reports/mutacao/mutation.json'), 'utf-8')) as { files: Record<string, { mutants: { status: string }[] }> };
  // Mesma conta do Stryker: ignorados e erros de execução ficam fora da nota.
  const todos = Object.values(m.files).flatMap((f) => f.mutants).filter((x) => ['Killed', 'Timeout', 'Survived', 'NoCoverage'].includes(x.status));
  const mortos = todos.filter((x) => x.status === 'Killed' || x.status === 'Timeout').length;
  mutacao = { nota: Math.round((mortos / Math.max(todos.length, 1)) * 10000) / 100 };
}

const manifesto = {
  projeto: 'folha-demo-playwright',
  versaoDoProjeto: pkg.version,
  geradoEm: new Date().toISOString(),
  ambiente: estaNoCI ? 'GitHub Actions' : 'máquina local',
  execucaoNoCI: estaNoCI && process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  codigo: {
    commit: commit ?? 'indisponível (pasta sem git)',
    arvoreLimpa: alterado === null ? null : alterado === '',
  },
  versoes: {
    node: process.version,
    playwright: pkg.devDependencies['@playwright/test'],
    typescript: pkg.devDependencies['typescript'],
    sistemaOperacional: process.platform,
  },
  resultado: {
    total,
    passaram: c['expected'] ?? 0,
    falharam: c['unexpected'] ?? 0,
    instaveis: c['flaky'] ?? 0,
    ignorados: c['skipped'] ?? 0,
    notaDeMutacao: mutacao?.nota ?? null,
    bdd,
  },
  impressoesDigitais: {
    'reports/resultados.json': sha256(arquivoResultados),
    ...(bdd ? { 'reports/resultados-bdd.json': sha256('reports/resultados-bdd.json') } : {}),
    'tests/oraculo/casos-rescisao.json': sha256('tests/oraculo/casos-rescisao.json'),
    'regressao/referencia.json': sha256('regressao/referencia.json'),
    'tests/oraculo/casos-calculo.json': sha256('tests/oraculo/casos-calculo.json'),
    'tabelas/2026.json': sha256('tabelas/2026.json'),
    'docs/regras-de-negocio.md': sha256('docs/regras-de-negocio.md'),
  },
};

mkdirSync(resolve('reports/evidencia'), { recursive: true });
writeFileSync(resolve('reports/evidencia/manifesto.json'), JSON.stringify(manifesto, null, 2) + '\n');

const r = manifesto.resultado;
const md = [
  '# Evidência da última execução',
  '',
  '> Gerada por `npm run evidencia` após `npm test`. **Não edite à mão.** O manifesto completo (`reports/evidencia/manifesto.json`) é anexado como artefato em cada execução do CI.',
  '',
  '| Item | Valor |',
  '|---|---|',
  `| Gerada em | ${manifesto.geradoEm} |`,
  `| Onde rodou | ${manifesto.ambiente}${manifesto.execucaoNoCI ? ` ([execução](${manifesto.execucaoNoCI}))` : ''} |`,
  `| Commit | \`${manifesto.codigo.commit}\` ${manifesto.codigo.arvoreLimpa === false ? '(**com alterações não commitadas**)' : ''} |`,
  `| Versões | Node ${manifesto.versoes.node}, Playwright ${manifesto.versoes.playwright}, TypeScript ${manifesto.versoes.typescript} |`,
  `| Resultado dos testes de tela/oráculo | **${r.passaram} de ${r.total} passaram**, ${r.falharam} falharam, ${r.instaveis} instáveis, ${r.ignorados} ignorados |`,
  `| Cenários BDD | ${r.bdd ? `**${r.bdd.passaram} de ${r.bdd.total} passaram**` : 'não rodados nesta execução'} |`,
  `| Nota de mutação | ${r.notaDeMutacao === null ? 'não medida nesta execução' : `${r.notaDeMutacao}%`} |`,
  '',
  '## Impressões digitais (SHA-256)',
  '',
  'Permitem verificar depois se os arquivos que sustentam este resultado foram alterados.',
  '',
  '| Arquivo | SHA-256 |',
  '|---|---|',
  ...Object.entries(manifesto.impressoesDigitais).map(([a, h]) => `| \`${a}\` | \`${h}\` |`),
  '',
  '## Limites',
  '',
  '- O SHA-256 detecta alteração posterior; não prova autoria. A prova forte é a execução registrada no CI (log, commit e artefatos).',
  '- Resultado vale para o commit indicado. Código alterado depois exige nova execução.',
  '',
].join('\n');
writeFileSync(resolve('docs/qualidade/evidencia.md'), md);
console.log(`Evidência gerada: ${r.passaram}/${r.total} passaram; commit ${manifesto.codigo.commit}`);
if (r.falharam > 0 || r.instaveis > 0) process.exit(1);
