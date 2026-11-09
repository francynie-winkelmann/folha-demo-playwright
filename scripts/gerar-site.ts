/**
 * Gera o site do portfólio em site-dist/ (HTML estático, sem framework).
 *
 * Todos os números vêm dos relatórios gerados em docs/qualidade/ e da contagem real dos testes unitários.
 * Se um relatório não existir ou mudar de formato, o script FALHA em vez de publicar um número inventado.
 *
 * Rodar:  npm run site     (depois, para ver: npx vite preview --outDir site-dist  ou abrir site-dist/index.html)
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const REPO = 'https://github.com/francynie-winkelmann/folha-demo-playwright';
const CONFIG = {
  nome: 'Francynie Winkelmann',
  titulo: 'QA com IA aplicada a teste, especializada em folha de pagamento',
  // Preencha para exibir o botão no site. Vazio = o botão não aparece.
  linkedin: '',
};
const SAIDA = 'site-dist';

// ---------------------------------------------------------------- coleta dos números reais
function ler(caminho: string): string {
  if (!existsSync(caminho)) throw new Error(`Relatório ausente: ${caminho}. Rode os testes e os geradores antes.`);
  return readFileSync(caminho, 'utf-8');
}
function pegar(texto: string, regex: RegExp, rotulo: string): RegExpMatchArray {
  const m = texto.match(regex);
  if (!m) throw new Error(`Não achei "${rotulo}" no relatório (o formato mudou?)`);
  return m;
}
const json = (c: string) => JSON.parse(ler(c));

function coletar() {
  const ev = ler('docs/qualidade/evidencia.md');
  const telas = pegar(ev, /Resultado dos testes[^|]*\|\s*\*\*(\d+) de (\d+) passaram/, 'resultado dos testes de tela');
  const bdd = pegar(ev, /Cenários BDD\s*\|\s*\*\*(\d+) de (\d+) passaram/, 'cenários BDD');
  const mutEv = pegar(ev, /Nota de mutação\s*\|\s*([\d.]+)%/, 'nota de mutação');
  const geradaEm = pegar(ev, /Gerada em\s*\|\s*(\d{4}-\d{2}-\d{2})/, 'data da evidência')[1]!;

  const mut = ler('docs/qualidade/mutacao.md');
  const linhasMut = [...mut.matchAll(/^\|\s*[^|]+\|\s*\*{0,2}([\d,]+)%\*{0,2}\s*\|\s*(\d+)/gm)];
  const ultima = linhasMut[linhasMut.length - 1];
  const primeira = linhasMut[0];
  if (!ultima || !primeira) throw new Error('Tabela de rodadas de mutação não encontrada');

  mkdirSync('test-results', { recursive: true });
  const saidaUnit = 'test-results/unitarios.json';
  // shell no Windows: lá o npx é um .cmd e não abre sem shell.
  const exec = spawnSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${saidaUnit}`], { encoding: 'utf-8', shell: process.platform === 'win32' });
  if (exec.error) throw new Error(`Não consegui rodar os testes unitários: ${exec.error.message}`);
  const u = JSON.parse(ler(saidaUnit));
  if (u.numFailedTests !== 0) throw new Error(`Testes unitários falhando (${u.numFailedTests}); o site não será gerado`);

  const det = json('docs/qualidade/deteccao.json');
  const reg = json('docs/qualidade/regressao.json');
  const ins = json('docs/qualidade/instabilidade.json');
  const rast = json('docs/qualidade/rastreabilidade.json');
  const casosMensal = json('tests/oraculo/casos-calculo.json').casos.length as number;
  const casosResc = json('tests/oraculo/casos-rescisao.json').casos.length as number;

  return {
    geradaEm,
    telas: { ok: Number(telas[1]), total: Number(telas[2]) },
    bdd: { ok: Number(bdd[1]), total: Number(bdd[2]) },
    unit: { ok: u.numPassedTests as number, total: u.numTotalTests as number },
    mutacao: { nota: mutEv[1]!.replace('.', ','), sobreviventes: Number(ultima[2]), notaInicial: primeira[1]!, rodadas: linhasMut.length },
    deteccao: { plantados: det.defeitos_plantados as number, detectados: det.defeitos_detectados as number, taxa: det.taxa_de_deteccao_percentual as number, base: det.referencia.passaram as number, modo: det.modo as string, escondidas: (det.alteracoes_escondidas as unknown[]).length },
    regressao: { comparadas: reg.comparadas as number, inesperadas: reg.inesperadas as number, experimento: reg.experimentos[0] as { id: string; alteradas: number; detectada: boolean } },
    instabilidade: { repeticoes: ins.repeticoes as number, testes: ins.testes as number, instaveis: (ins.instaveis as unknown[]).length },
    rastreabilidade: { regras: (rast.regras as unknown[]).length, semTeste: (rast.semTeste as unknown[]).length },
    casos: { mensal: casosMensal, rescisao: casosResc },
  };
}
type Dados = ReturnType<typeof coletar>;

// ---------------------------------------------------------------- HTML
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

const CSS = `
:root{--texto:#1f2933;--suave:#52606d;--linha:#d9e2ec;--fundo:#fff;--faixa:#f5f7fa;--destaque:#0b5cad;--aviso:#fff8e1;--aviso-borda:#e0b84a}
*{box-sizing:border-box}
body{margin:0;font:17px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--texto);background:var(--fundo)}
a{color:var(--destaque)}a:hover{text-decoration-thickness:2px}
a:focus-visible,button:focus-visible{outline:3px solid #f5a623;outline-offset:2px}
.pular{position:absolute;left:-999px;top:0;background:#fff;padding:.5rem 1rem;z-index:10}.pular:focus{left:.5rem;top:.5rem}
header.topo{border-bottom:1px solid var(--linha);background:#fff}
.larg{max-width:780px;margin:0 auto;padding:0 20px}
.topo .larg{display:flex;flex-wrap:wrap;gap:8px 24px;align-items:center;justify-content:space-between;padding-top:14px;padding-bottom:14px}
.marca{font-weight:700;text-decoration:none;color:var(--texto)}
nav ul{display:flex;flex-wrap:wrap;gap:4px 20px;margin:0;padding:0;list-style:none}
nav a{text-decoration:none}nav a[aria-current=page]{font-weight:700;text-decoration:underline}
main{padding:32px 0 56px}
h1{font-size:2rem;line-height:1.25;margin:0 0 .5rem}h2{font-size:1.35rem;margin:2.2rem 0 .6rem}h3{font-size:1.1rem;margin:1.6rem 0 .4rem}
.sub{color:var(--suave);font-size:1.15rem;margin:0 0 1.2rem}
.aviso{background:var(--aviso);border:1px solid var(--aviso-borda);border-radius:8px;padding:12px 16px;margin:1.2rem 0;font-size:.95rem}
.num{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:1.2rem 0;padding:0;list-style:none}
.num li{border:1px solid var(--linha);border-radius:10px;padding:14px;background:var(--faixa)}
.num strong{display:block;font-size:1.7rem;line-height:1.2}.num span{color:var(--suave);font-size:.92rem}
table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.95rem}
th,td{border-bottom:1px solid var(--linha);padding:8px 10px;text-align:left;vertical-align:top}th{background:var(--faixa)}
.tabela{overflow-x:auto}
code{background:var(--faixa);padding:1px 6px;border-radius:4px;font-size:.92em}
pre code{background:none;padding:0;color:inherit}
pre{background:#102a43;color:#f0f4f8;padding:12px 16px;border-radius:8px;overflow-x:auto;font-size:.92rem}
.cartoes{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;padding:0;list-style:none}
.cartoes li{border:1px solid var(--linha);border-radius:10px;padding:16px}
.cartoes h3{margin-top:0}
.botao{display:inline-block;background:var(--destaque);color:#fff;text-decoration:none;padding:9px 18px;border-radius:8px;margin:0 8px 8px 0}
.botao.claro{background:#fff;color:var(--destaque);border:1px solid var(--destaque)}
footer{border-top:1px solid var(--linha);padding:22px 0;color:var(--suave);font-size:.9rem}
@media (max-width:520px){body{font-size:16px}h1{font-size:1.65rem}}
@media print{header.topo nav,footer .botoes{display:none}}
`;

function pagina(opt: { profundidade: 0 | 1; ativo: 'inicio' | 'casos' | 'painel'; titulo: string; descricao: string; corpo: string; d: Dados }): string {
  const r = opt.profundidade === 0 ? '' : '../';
  const item = (chave: string, href: string, texto: string) =>
    `<li><a href="${href}"${opt.ativo === chave ? ' aria-current="page"' : ''}>${texto}</a></li>`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opt.titulo)} | ${esc(CONFIG.nome)}</title>
<meta name="description" content="${esc(opt.descricao)}">
<style>${CSS}</style>
</head>
<body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<header class="topo"><div class="larg">
<a class="marca" href="${r}index.html">${esc(CONFIG.nome)}</a>
<nav aria-label="Principal"><ul>
${item('inicio', `${r}index.html`, 'Início')}
${item('casos', `${r}casos/index.html`, 'Estudos de caso')}
${item('painel', `${r}painel.html`, 'Painel de qualidade')}
<li><a href="${r}demo/">Demonstração</a></li>
<li><a href="${REPO}">Código</a></li>
</ul></nav>
</div></header>
<main id="conteudo"><div class="larg">
${opt.corpo}
</div></main>
<footer><div class="larg">
<p>Projeto de demonstração com sistema <strong>fictício</strong>: nenhum dado, regra interna ou código de empresa. Números lidos dos relatórios do repositório, evidência de ${dataBr(opt.d.geradaEm)}.</p>
</div></footer>
</body>
</html>
`;
}

const numeros = (itens: Array<[string, string]>) =>
  `<ul class="num">${itens.map(([v, t]) => `<li><strong>${v}</strong><span>${t}</span></li>`).join('')}</ul>`;

function caso(d: Dados, o: { slug: string; titulo: string; resumo: string; problema: string; fiz: string[]; prova: string; numeros: Array<[string, string]>; limite: string[]; reproduzir: string; docs: Array<[string, string]> }) {
  const corpo = `
<p><a href="index.html">← Estudos de caso</a></p>
<h1>${esc(o.titulo)}</h1>
<p class="sub">${esc(o.resumo)}</p>
<h2>O problema</h2>
<p>${o.problema}</p>
<h2>O que eu fiz</h2>
<ul>${o.fiz.map((x) => `<li>${x}</li>`).join('')}</ul>
<h2>A prova</h2>
<p>${o.prova}</p>
${numeros(o.numeros)}
<h2>Limites, ditos com honestidade</h2>
<ul>${o.limite.map((x) => `<li>${x}</li>`).join('')}</ul>
<h2>Como reproduzir</h2>
<pre><code>${esc(o.reproduzir)}</code></pre>
<p>Documentos: ${o.docs.map(([t, h]) => `<a href="${REPO}/blob/main/${h}">${esc(t)}</a>`).join(' · ')}</p>`;
  return pagina({ profundidade: 1, ativo: 'casos', titulo: o.titulo, descricao: o.resumo, corpo, d });
}

function montar(d: Dados): Record<string, string> {
  const arquivos: Record<string, string> = {};

  // ------------- Início
  arquivos['index.html'] = pagina({
    profundidade: 0, ativo: 'inicio', d,
    titulo: 'Portfólio de QA com IA',
    descricao: 'Portfólio de testes de software com IA aplicada, num sistema fictício de folha de pagamento, com provas de que os testes funcionam.',
    corpo: `
<h1>${esc(CONFIG.nome)}</h1>
<p class="sub">${esc(CONFIG.titulo)}</p>
<p>Atuo com qualidade de software em sistemas de folha de pagamento, onde um centavo errado é multiplicado por milhares de funcionários. Este portfólio mostra <strong>como eu provo que os testes funcionam</strong>, e não só que eles passam, usando IA como apoio e revisão humana nas decisões que importam.</p>
<p class="aviso">Tudo aqui roda sobre o <strong>FolhaDemo</strong>, um sistema inventado para demonstração, com defeitos plantados de propósito. Nada vem de empresa, cliente ou base real.</p>
<p>${CONFIG.linkedin ? `<a class="botao" href="${esc(CONFIG.linkedin)}">LinkedIn</a>` : ''}<a class="botao" href="painel.html">Ver o painel de qualidade</a><a class="botao claro" href="casos/index.html">Estudos de caso</a><a class="botao claro" href="demo/">Testar a demonstração</a></p>
<h2>Em números (execução de ${dataBr(d.geradaEm)})</h2>
${numeros([
  [`${d.telas.ok} de ${d.telas.total}`, 'testes de tela e de resultado esperado passando'],
  [`${d.unit.ok} de ${d.unit.total}`, 'testes unitários passando'],
  [`${d.mutacao.nota}%`, 'nota de mutação (testes percebem erro plantado no código)'],
  [`${d.deteccao.detectados} de ${d.deteccao.plantados}`, 'defeitos plantados detectados'],
  [`${d.regressao.inesperadas}`, `diferenças inesperadas em ${d.regressao.comparadas.toLocaleString('pt-BR')} combinações da regressão`],
  [`${d.rastreabilidade.regras} regras`, `de negócio, ${d.rastreabilidade.semTeste} sem teste`],
])}
<p>Cada número tem sua origem e seus limites explicados no <a href="painel.html">painel de qualidade</a>.</p>
<h2>Como trabalho</h2>
<ul>
<li><strong>Risco primeiro:</strong> cada teste aponta a regra de negócio e o risco que cobre.</li>
<li><strong>Resposta certa vinda de outro caminho:</strong> o resultado esperado nunca é copiado da tela nem do código testado.</li>
<li><strong>Testo os testes:</strong> mutação, defeitos plantados, regressão e controle de instabilidade.</li>
<li><strong>IA com revisão humana:</strong> a IA acelera; a validação das regras e a aprovação de referências são minhas.</li>
<li><strong>Prova guardada:</strong> evidência por execução, com impressão digital (SHA-256) dos arquivos.</li>
</ul>`,
  });

  // ------------- Índice dos casos
  arquivos['casos/index.html'] = pagina({
    profundidade: 1, ativo: 'casos', d,
    titulo: 'Estudos de caso',
    descricao: 'Quatro formas de provar que testes de software realmente pegam erro.',
    corpo: `
<h1>Estudos de caso</h1>
<p class="sub">Quatro formas de provar que os testes pegam erro de verdade.</p>
<ul class="cartoes">
<li><h3><a href="oraculo-independente.html">1. Como saber a resposta certa</a></h3><p>Um resultado esperado calculado por outro caminho, para o teste não concordar com o erro do código.</p></li>
<li><h3><a href="teste-de-mutacao.html">2. Testando os testes</a></h3><p>Alterar o código de propósito e ver se algum teste reclama. Nota de ${d.mutacao.nota}%.</p></li>
<li><h3><a href="defeitos-plantados.html">3. Defeitos plantados</a></h3><p>${d.deteccao.plantados} erros realistas de folha e rescisão, ligados um a um, e quantos a suíte achou.</p></li>
<li><h3><a href="regressao-antes-depois.html">4. Regressão antes × depois</a></h3><p>Comparar ${d.regressao.comparadas.toLocaleString('pt-BR')} resultados com a versão aprovada e achar uma mudança de 1 centavo.</p></li>
</ul>`,
  });

  // ------------- Caso 1
  arquivos['casos/oraculo-independente.html'] = caso(d, {
    slug: 'oraculo', titulo: 'Como saber a resposta certa sem copiar o código',
    resumo: 'Um segundo cálculo, escrito de outro jeito, serve de gabarito para os testes.',
    problema: 'Se o gabarito do teste vem do mesmo código que está sendo testado, o teste concorda com os próprios erros e passa sempre. Em folha de pagamento, isso esconde erros de centavos que se multiplicam.',
    fiz: [
      'Escrevi uma <strong>calculadora independente</strong> da folha e outra da rescisão, de outro jeito: números inteiros grandes (BigInt) e aritmética de datas própria, sem usar as funções de data do navegador.',
      `Gerei as tabelas de casos a partir dessa calculadora (<strong>${d.casos.mensal}</strong> casos da folha mensal e <strong>${d.casos.rescisao}</strong> da rescisão), com valores de fronteira de faixa, teto, dia 31, 29/02 e virada de ano.`,
      'Guardei <strong>duas transcrições</strong> das tabelas de INSS e IRRF (a do sistema e a do teste) e um teste que confere se são idênticas.',
      'Comparei o sistema com o gabarito em <strong>3.000 combinações pseudoaleatórias fixas</strong> de datas, salários e opções, e em todos os dias de um ano bissexto e de um comum.',
    ],
    prova: 'O sistema e a calculadora independente chegam ao mesmo valor em todos os casos, e a diferença de modelagem já revelou um erro real: o navegador aceita 30 de fevereiro em <code>Date.parse</code>.',
    numeros: [[String(d.casos.mensal + d.casos.rescisao), 'casos em tabela'], ['3.000', 'combinações pseudoaleatórias fixas'], ['0', 'divergências'], ['1', 'erro real achado na modelagem de datas']],
    limite: [
      'A mesma pessoa (eu, com IA) escreveu o sistema e o gabarito. Concordar prova <strong>consistência</strong>, não que a lei foi seguida.',
      'As tabelas de INSS e IRRF e as regras de rescisão foram validadas por mim como analista de folha, mas a <strong>conferência com fonte oficial está pendente</strong>.',
      'O gabarito cobre as regras do escopo declarado; aviso trabalhado e justa causa estão fora.',
    ],
    reproduzir: 'npm ci\nnpm run test:unit\nnpm run oraculos:gerar',
    docs: [['Regras de negócio', 'docs/regras-de-negocio.md'], ['Plano de testes', 'docs/plano-de-testes.md']],
  });

  // ------------- Caso 2
  arquivos['casos/teste-de-mutacao.html'] = caso(d, {
    slug: 'mutacao', titulo: 'Testando os testes com mutação',
    resumo: 'Alterar o código de propósito para ver se os testes percebem.',
    problema: 'Teste que passa não é teste bom. Um teste fraco passa mesmo quando o código está errado, e a cobertura de linhas não mostra isso: ela só diz que a linha rodou.',
    fiz: [
      'Usei o <strong>Stryker</strong>, que troca <code>&gt;=</code> por <code>&gt;</code>, remove validações e muda números, criando centenas de versões erradas do código (mutantes). Se algum teste falha, o mutante foi morto.',
      'Analisei cada mutante que sobreviveu e, para cada lacuna real, escrevi um teste novo.',
      'Simplifiquei dois trechos de código redundantes em vez de escrever teste para código inútil.',
      'Configurei o CI para falhar se a nota ficar abaixo de 70%.',
    ],
    prova: `A nota subiu de ${d.mutacao.notaInicial}% na primeira rodada para <strong>${d.mutacao.nota}%</strong> na última (${d.mutacao.rodadas} rodadas). Os ${d.mutacao.sobreviventes} mutantes que sobraram foram analisados um a um e são <em>equivalentes</em>: a mudança não altera nenhum resultado possível.`,
    numeros: [[`${d.mutacao.nota}%`, 'nota de mutação'], [String(d.mutacao.sobreviventes), 'sobreviventes, todos equivalentes'], ['70%', 'meta mínima no CI'], ['1', 'teste que dependia do dia em que rodava, corrigido']],
    limite: [
      'Nota alta não prova ausência de erro: prova que <strong>pequenas alterações no código seriam percebidas</strong>.',
      'A mutação cobre o código de cálculo e validação, não a interface.',
      'Os mutantes equivalentes foram classificados por mim; uma revisão independente seria melhor.',
    ],
    reproduzir: 'npm ci\nnpm run mutacao   # cerca de 25 segundos',
    docs: [['Relatório de mutação', 'docs/qualidade/mutacao.md']],
  });

  // ------------- Caso 3
  arquivos['casos/defeitos-plantados.html'] = caso(d, {
    slug: 'defeitos', titulo: 'Defeitos plantados: a suíte acha o que deveria achar?',
    resumo: 'Erros realistas de folha e rescisão, ligados um por vez, para medir a taxa de detecção.',
    problema: 'Dizer "os testes passam" não responde à pergunta importante: se houvesse um erro, os testes o encontrariam?',
    fiz: [
      `Plantei <strong>${d.deteccao.plantados} defeitos</strong> realistas (por exemplo, multa de 40% do FGTS cobrada em pedido de demissão, ou INSS sem teto), todos desligados por padrão e acionados por um parâmetro.`,
      'Escrevi um medidor que roda a suíte uma vez sem defeito (precisa passar) e uma vez com cada defeito (precisa falhar).',
      `Incluí ${d.deteccao.escondidas} <strong>alteração escondida</strong> de 1 centavo, fora da taxa, para o experimento de regressão.`,
      'Escrevi um relato de defeito para cada um, com passos, valor esperado x obtido, severidade, prioridade e prints reais.',
    ],
    prova: `A suíte passou sem defeitos (${d.deteccao.base} testes na rodada de referência) e falhou em <strong>${d.deteccao.detectados} dos ${d.deteccao.plantados}</strong> defeitos.`,
    numeros: [[`${d.deteccao.taxa}%`, 'taxa de detecção'], [String(d.deteccao.plantados), 'defeitos plantados'], ['8 + 5', 'folha mensal + rescisão'], ['13', 'relatos de defeito com prints']],
    limite: [
      'Quem planta os defeitos e quem escreve os testes é a mesma pessoa: 100% mostra consistência, não ausência de pontos cegos. Por isso medi também com mutação.',
      `A medição mais recente foi feita em modo rápido (para na primeira falha), então não há contagem de testes que falharam por defeito.`,
    ],
    reproduzir: 'npm ci\nnpm run defeitos:medir     # cerca de 15 minutos\nnpm run defeitos:relatar   # gera os 13 relatos com prints',
    docs: [['Taxa de detecção', 'docs/qualidade/deteccao.md'], ['Relatos de defeito', 'docs/defeitos/README.md']],
  });

  // ------------- Caso 4
  arquivos['casos/regressao-antes-depois.html'] = caso(d, {
    slug: 'regressao', titulo: 'Regressão antes × depois: achar a mudança que ninguém avisou',
    resumo: 'Comparar o cálculo de hoje com uma versão de referência aprovada, combinação por combinação.',
    problema: 'Uma mudança de tabela ou de arredondamento pode alterar centavos de milhares de holerites sem nenhuma tela mudar. Teste de tela comum não vê isso.',
    fiz: [
      `Guardei uma <strong>referência</strong> (golden master) com ${d.regressao.comparadas.toLocaleString('pt-BR')} combinações de salário e dependentes, incluindo cada fronteira de faixa ±1 centavo.`,
      'A cada versão, o cálculo roda de novo e cada diferença vira um item que uma pessoa classifica como esperada ou inesperada.',
      'Fiz um <strong>experimento controlado</strong>: liguei de propósito uma mudança escondida (FGTS truncando o centavo em vez de arredondar) para provar que a comparação a percebe.',
    ],
    prova: `Sem mudança, a regressão deu <strong>${d.regressao.inesperadas} diferenças inesperadas</strong> nas ${d.regressao.comparadas.toLocaleString('pt-BR')} combinações. Com a mudança escondida, <strong>${d.regressao.experimento.alteradas} combinações mudaram</strong>${d.regressao.experimento.detectada ? ' e a regressão apontou todas' : ''}.`,
    numeros: [[d.regressao.comparadas.toLocaleString('pt-BR'), 'combinações comparadas'], ['0', 'diferenças inesperadas'], [String(d.regressao.experimento.alteradas), 'mudaram no experimento'], ['1 centavo', 'tamanho da mudança escondida']],
    limite: [
      'A referência atual foi gerada a partir do código entregue na Fase 2A e <strong>ainda aguarda aprovação humana</strong>. Sem essa aprovação, ela só congela o comportamento existente, sem garantir que ele está certo.',
      'A regressão cobre a folha mensal. A rescisão é coberta por casos em tabela e pelo gabarito independente.',
    ],
    reproduzir: 'npm ci\nnpm run regressao',
    docs: [['Relatório de regressão', 'docs/qualidade/regressao.md']],
  });

  // ------------- Painel
  const linhas: Array<[string, string, string, string]> = [
    ['Testes de tela e de resultado esperado', `${d.telas.ok} de ${d.telas.total} passaram`, 'docs/qualidade/evidencia.md', 'Sem retentativas automáticas.'],
    ['Testes unitários', `${d.unit.ok} de ${d.unit.total} passaram`, 'unitarios/', 'Contagem feita ao gerar este site.'],
    ['Cenários BDD', `${d.bdd.ok} de ${d.bdd.total} passaram`, 'bdd/', 'Só a rescisão tem cenários em Gherkin.'],
    ['Nota de mutação', `${d.mutacao.nota}%`, 'docs/qualidade/mutacao.md', `${d.mutacao.sobreviventes} sobreviventes, todos equivalentes. Meta mínima no CI: 70%.`],
    ['Defeitos plantados detectados', `${d.deteccao.detectados} de ${d.deteccao.plantados} (${d.deteccao.taxa}%)`, 'docs/qualidade/deteccao.md', 'Mesma autora planta e testa; medição em modo rápido.'],
    ['Regressão antes × depois', `${d.regressao.inesperadas} inesperadas em ${d.regressao.comparadas.toLocaleString('pt-BR')}`, 'docs/qualidade/regressao.md', 'Referência aguardando aprovação humana.'],
    ['Testes instáveis', `${d.instabilidade.instaveis} em ${d.instabilidade.testes} testes × ${d.instabilidade.repeticoes} repetições`, 'docs/qualidade/instabilidade.md', 'Medição anterior aos testes da Fase 2C; precisa ser repetida.'],
    ['Regras de negócio sem teste', `${d.rastreabilidade.semTeste} de ${d.rastreabilidade.regras}`, 'docs/qualidade/rastreabilidade.md', 'O CI falha se uma regra ficar sem teste.'],
  ];
  arquivos['painel.html'] = pagina({
    profundidade: 0, ativo: 'painel', d,
    titulo: 'Painel de qualidade',
    descricao: 'Indicadores reais de qualidade dos testes do FolhaDemo, com fonte e limites de cada um.',
    corpo: `
<h1>Painel de qualidade</h1>
<p class="sub">Execução de ${dataBr(d.geradaEm)}. Cada indicador tem sua fonte e o que ele <em>não</em> prova.</p>
<div class="tabela"><table>
<thead><tr><th scope="col">Indicador</th><th scope="col">Valor</th><th scope="col">Fonte</th><th scope="col">Observação</th></tr></thead>
<tbody>
${linhas.map(([a, b, c, e]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td><td><a href="${REPO}/${c.endsWith('/') ? 'tree' : 'blob'}/main/${c}">${esc(c)}</a></td><td>${esc(e)}</td></tr>`).join('\n')}
</tbody></table></div>
<h2>O que este painel não afirma</h2>
<ul>
<li><strong>Tabelas e regras ainda não conferidas com fonte oficial.</strong> Os testes verificam o código contra a regra escrita, não a regra contra a lei.</li>
<li><strong>Mesma autora</strong> para sistema, gabarito e defeitos plantados.</li>
<li><strong>Referência de regressão sem aprovação humana.</strong></li>
<li><strong>Não executados:</strong> testes de integração, de API e de contrato (planejados), desempenho, outros navegadores além do Chrome, telas de celular.</li>
<li><strong>Acessibilidade:</strong> uma sessão exploratória por IA achou barreiras (abas sem comportamento de teclado e resultado não anunciado); nenhum leitor de tela real foi usado.</li>
</ul>
<p>O plano completo, com riscos e critérios de saída, está no <a href="${REPO}/blob/main/docs/plano-de-testes.md">plano de testes</a>.</p>`,
  });

  return arquivos;
}

const dados = coletar();
rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(`${SAIDA}/casos`, { recursive: true });
const arquivos = montar(dados);
for (const [caminho, conteudo] of Object.entries(arquivos)) writeFileSync(`${SAIDA}/${caminho}`, conteudo, 'utf-8');
console.log(`Site gerado em ${SAIDA}/ com ${Object.keys(arquivos).length} páginas (evidência de ${dados.geradaEm}).`);
