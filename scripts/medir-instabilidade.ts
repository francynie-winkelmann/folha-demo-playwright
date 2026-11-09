/**
 * Mede instabilidade ("flaky"): roda a suíte N vezes seguidas, SEM retentativas, e aponta qualquer teste
 * que não deu o mesmo resultado em todas as repetições (ou cujo tempo variou muito).
 *
 * Uso: npm run instabilidade            (3 repetições)
 *      REPETICOES=5 npm run instabilidade
 * Saída: docs/qualidade/instabilidade.md e .json
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface ResultadoPw { status: string; duration: number }
interface TestePw { status: string; results: ResultadoPw[] }
interface SpecPw { title: string; file: string; tests: TestePw[] }
interface SuitePw { specs?: SpecPw[]; suites?: SuitePw[] }

const repeticoes = Number(process.env.REPETICOES ?? 3);
if (!Number.isInteger(repeticoes) || repeticoes < 2) throw new Error('REPETICOES deve ser um inteiro >= 2');
const saidaJson = 'reports/instabilidade.json';

const env: NodeJS.ProcessEnv = { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: saidaJson };
const r = spawnSync('npx', ['playwright', 'test', `--repeat-each=${repeticoes}`, '--retries=0', '--reporter=json'], {
  env,
  stdio: ['ignore', 'ignore', 'inherit'],
  shell: process.platform === 'win32',
});
if (r.error) throw r.error;

function coletar(s: SuitePw, acc: SpecPw[] = []): SpecPw[] {
  acc.push(...(s.specs ?? []));
  (s.suites ?? []).forEach((x) => coletar(x, acc));
  return acc;
}

const rel = JSON.parse(readFileSync(resolve(saidaJson), 'utf-8')) as { suites: SuitePw[] };
const specs = rel.suites.flatMap((s) => coletar(s));

interface Linha { teste: string; arquivo: string; execucoes: number; passou: number; falhou: number; minMs: number; maxMs: number; instavel: boolean }
const linhas: Linha[] = [];
for (const spec of specs) {
  const resultados = spec.tests.flatMap((t) => t.results.map((x) => ({ status: x.status, ms: x.duration })));
  const passou = resultados.filter((x) => x.status === 'passed').length;
  const ms = resultados.map((x) => x.ms);
  linhas.push({
    teste: spec.title,
    arquivo: spec.file,
    execucoes: resultados.length,
    passou,
    falhou: resultados.length - passou,
    minMs: Math.min(...ms),
    maxMs: Math.max(...ms),
    instavel: passou > 0 && passou < resultados.length, // passou em umas e falhou em outras
  });
}

const instaveis = linhas.filter((l) => l.instavel);
const sempreFalham = linhas.filter((l) => l.passou === 0);
const execucoesTotais = linhas.reduce((n, l) => n + l.execucoes, 0);
const lentosVariaveis = linhas.filter((l) => l.maxMs > 3000 && l.maxMs > 3 * Math.max(l.minMs, 1)).sort((a, b) => b.maxMs - a.maxMs).slice(0, 5);

const md: string[] = [];
md.push('# Controle de instabilidade (flaky)');
md.push('');
md.push('> Gerado por `npm run instabilidade`. **Não edite à mão.**');
md.push('');
md.push('Um teste é **instável** quando, com o mesmo código e os mesmos dados, ora passa e ora falha. Teste instável é perigoso');
md.push('porque a equipe aprende a ignorar falhas ("roda de novo que passa") e passa a ignorar também os defeitos reais.');
md.push('Por isso este projeto roda com **zero retentativas** (`retries: 0`): uma falha nunca é escondida por uma segunda tentativa.');
md.push('');
md.push(`- Testes distintos: **${linhas.length}**`);
md.push(`- Repetições por teste: **${repeticoes}** (execuções totais: ${execucoesTotais})`);
md.push(`- Testes **instáveis** (resultado diferente entre repetições): **${instaveis.length}**`);
md.push(`- Testes que **falharam em todas** as repetições: **${sempreFalham.length}**`);
md.push('');
md.push(instaveis.length === 0 && sempreFalham.length === 0
  ? `**Conclusão:** nas ${repeticoes} repetições nenhum teste mudou de resultado.`
  : '**Conclusão:** há testes que precisam de investigação (lista abaixo).');
md.push('');
if (instaveis.length) {
  md.push('## Testes instáveis', '', '| Teste | Passou | Falhou |', '|---|---:|---:|');
  instaveis.forEach((l) => md.push(`| ${l.teste} | ${l.passou} | ${l.falhou} |`));
  md.push('');
}
if (sempreFalham.length) {
  md.push('## Testes que falham sempre', '', ...sempreFalham.map((l) => `- ${l.teste}`), '');
}
if (lentosVariaveis.length) {
  md.push('## Testes com maior variação de tempo (sinal de alerta, não é falha)', '', '| Teste | Mais rápido | Mais lento |', '|---|---:|---:|');
  lentosVariaveis.forEach((l) => md.push(`| ${l.teste} | ${l.minMs} ms | ${l.maxMs} ms |`));
  md.push('');
}
md.push('## Limites desta medição', '');
md.push(`- ${repeticoes} repetições reduzem, mas **não eliminam**, a chance de uma instabilidade rara passar despercebida. Quanto mais repetições, mais confiança.`);
md.push('- Executado numa única máquina e navegador (Chromium). Instabilidades que só aparecem em CI sob carga, ou em outros navegadores, não são vistas aqui.');
md.push('- Os testes rodam em paralelo (`fullyParallel`), o que já ajuda a expor dependência de ordem ou de estado compartilhado.');

mkdirSync(resolve('docs/qualidade'), { recursive: true });
writeFileSync(resolve('docs/qualidade/instabilidade.md'), md.join('\n') + '\n');
writeFileSync(resolve('docs/qualidade/instabilidade.json'), JSON.stringify({ repeticoes, testes: linhas.length, instaveis: instaveis.map((l) => l.teste), sempreFalham: sempreFalham.map((l) => l.teste) }, null, 2) + '\n');
console.log(`Instabilidade: ${linhas.length} testes x ${repeticoes}; instáveis=${instaveis.length}; sempre falham=${sempreFalham.length}`);
process.exit(instaveis.length || sempreFalham.length ? 1 : 0);
