/**
 * Mede a TAXA DE DETECÇÃO da suíte de testes.
 *
 *  1. Roda a suíte SEM defeitos: ela precisa passar 100%.
 *  2. Liga UM defeito por vez (parâmetro ?defeitos= via variável DEFEITOS) e roda a suíte:
 *     ela precisa FALHAR. Se passar, o defeito "escapou" e os testes têm uma lacuna.
 *  3. Grava docs/qualidade/deteccao.json e docs/qualidade/deteccao.md.
 *
 * Rodar:  npm run defeitos:medir
 * Mais rápido (para na primeira falha, sem contar os testes que falharam):
 *         MEDICAO_RAPIDA=1 npm run defeitos:medir
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ALTERACOES_ESCONDIDAS, DEFEITOS, type DefeitoId } from '../src/domain/defeitos';

const PORTA = 4173;
const RAPIDA = process.env.MEDICAO_RAPIDA === '1';

interface ResultadoRodada {
  passou: number;
  falhou: number;
  instaveis: number;
  falhas: string[];
}

function coletarFalhas(suite: any, saida: string[]): void {
  for (const spec of suite.specs ?? []) {
    if (spec.ok === false) saida.push(String(spec.title));
  }
  for (const filha of suite.suites ?? []) coletarFalhas(filha, saida);
}

function rodar(rotulo: string, defeitos: string): ResultadoRodada {
  mkdirSync('test-results', { recursive: true });
  const arquivo = `test-results/medicao-${rotulo}.json`;
  const env: NodeJS.ProcessEnv = { ...process.env, DEFEITOS: defeitos, PLAYWRIGHT_JSON_OUTPUT_NAME: arquivo };
  delete env.CI; // evita regras de CI que impediriam reaproveitar o servidor local
  const args = ['playwright', 'test', '--reporter=json'];
  if (RAPIDA && defeitos) args.push('--max-failures=1');
  spawnSync('npx', args, { env, stdio: 'ignore', shell: process.platform === 'win32' });

  if (!existsSync(arquivo)) throw new Error(`O Playwright não gerou o relatório ${arquivo}`);
  const relatorio = JSON.parse(readFileSync(arquivo, 'utf-8'));
  const falhas: string[] = [];
  for (const suite of relatorio.suites ?? []) coletarFalhas(suite, falhas);
  return {
    passou: relatorio.stats.expected,
    falhou: relatorio.stats.unexpected,
    instaveis: relatorio.stats.flaky,
    falhas,
  };
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://localhost:${PORTA}/`);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((ok) => setTimeout(ok, 500));
  }
  throw new Error('O servidor de pré-visualização não subiu a tempo.');
}

async function main(): Promise<void> {
  console.log('Construindo o app...');
  const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: process.platform === 'win32' });
  if (build.status !== 0) process.exit(1);

  const servidor: ChildProcess = spawn(
    process.execPath,
    ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORTA), '--strictPort'],
    { stdio: 'ignore' },
  );
  const encerrar = () => servidor.kill();
  process.on('exit', encerrar);
  await esperarServidor();

  console.log('Rodada de referência (sem defeitos)...');
  const base = rodar('base', '');
  console.log(`  passaram ${base.passou}, falharam ${base.falhou}, instáveis ${base.instaveis}`);

  const linhas = [];
  for (const id of Object.keys(DEFEITOS) as (keyof typeof DEFEITOS)[]) {
    console.log(`Defeito ${id}...`);
    const r = rodar(id, id);
    const detectado = r.falhou > 0;
    console.log(`  ${detectado ? 'DETECTADO' : 'ESCAPOU'} (${r.falhou} testes falharam)`);
    linhas.push({
      id,
      descricao: DEFEITOS[id].descricao,
      risco: DEFEITOS[id].risco,
      detectado,
      testes_que_falharam: RAPIDA ? null : r.falhou,
      exemplos: r.falhas.slice(0, 3),
    });
  }

  // Alterações escondidas: medidas à parte, FORA da taxa de detecção (servem ao experimento de regressão).
  const escondidas = [];
  for (const id of Object.keys(ALTERACOES_ESCONDIDAS) as (keyof typeof ALTERACOES_ESCONDIDAS)[]) {
    console.log(`Alteração escondida ${id}...`);
    const r = rodar(id, id);
    console.log(`  ${r.falhou > 0 ? 'PERCEBIDA' : 'NÃO PERCEBIDA'} pela suíte de tela (${r.falhou} testes falharam)`);
    escondidas.push({
      id,
      descricao: ALTERACOES_ESCONDIDAS[id].descricao,
      percebida_pela_suite_de_tela: r.falhou > 0,
      testes_que_falharam: RAPIDA ? null : r.falhou,
    });
  }
  encerrar();

  const detectados = linhas.filter((l) => l.detectado).length;
  const taxa = Math.round((detectados / linhas.length) * 1000) / 10;
  const referenciaOk = base.falhou === 0 && base.instaveis === 0;

  const resumo = {
    gerado_em: new Date().toISOString(),
    modo: RAPIDA ? 'rapido' : 'completo',
    referencia: { passaram: base.passou, falharam: base.falhou, instaveis: base.instaveis, ok: referenciaOk },
    defeitos_plantados: linhas.length,
    defeitos_detectados: detectados,
    taxa_de_deteccao_percentual: taxa,
    defeitos: linhas,
    alteracoes_escondidas: escondidas,
  };

  mkdirSync('docs/qualidade', { recursive: true });
  writeFileSync('docs/qualidade/deteccao.json', JSON.stringify(resumo, null, 2) + '\n');

  const md = [
    '# Taxa de detecção de defeitos plantados',
    '',
    `Gerado em ${resumo.gerado_em} (modo ${resumo.modo}).`,
    '',
    `- Rodada de referência (sem defeitos): **${base.passou} passaram, ${base.falhou} falharam, ${base.instaveis} instáveis** ${referenciaOk ? '(ok)' : '(ATENÇÃO: a suíte deveria passar 100%)'}`,
    `- Defeitos plantados: **${linhas.length}**; detectados: **${detectados}**; taxa de detecção: **${taxa}%**`,
    '',
    '| Defeito | Risco | Detectado? | Testes que falharam | Exemplo |',
    '|---|---|---|---|---|',
    ...linhas.map(
      (l) =>
        `| \`${l.id}\` | ${l.risco} | ${l.detectado ? 'Sim' : '**NÃO (lacuna)**'} | ${l.testes_que_falharam ?? 'n/d'} | ${l.exemplos[0] ?? '-'} |`,
    ),
    '',
    '## Alterações escondidas (fora da taxa de detecção)',
    '',
    'Mudanças sutis, ligadas só neste experimento, usadas para comparar a suíte de tela com a regressão antes × depois (`regressao.md`).',
    '',
    '| Alteração | Percebida pela suíte de tela? | Testes que falharam |',
    '|---|---|---|',
    ...escondidas.map((e) => `| \`${e.id}\`: ${e.descricao} | ${e.percebida_pela_suite_de_tela ? 'Sim' : '**NÃO**'} | ${e.testes_que_falharam ?? 'n/d'} |`),
    '',
  ].join('\n');
  writeFileSync('docs/qualidade/deteccao.md', md);

  console.log(`\nTaxa de detecção: ${taxa}% (${detectados}/${linhas.length}). Relatório em docs/qualidade/deteccao.md`);
  if (!referenciaOk || detectados < linhas.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
