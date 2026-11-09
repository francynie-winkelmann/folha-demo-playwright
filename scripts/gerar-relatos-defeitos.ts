/**
 * Gera os 13 relatos de defeito em docs/defeitos/ (um .md por defeito + um índice) com PRINTS reais.
 *
 * Para cada defeito plantado:
 *  1. calcula o resultado ESPERADO pela calculadora independente (nunca pela tela);
 *  2. abre a aplicação SEM o defeito e confere que ela bate com o esperado (se não bater, o relato não é gerado);
 *  3. abre a aplicação COM o defeito ligado, repete os mesmos passos e lê o que a tela mostra;
 *  4. tira dois prints (correto x com defeito) e escreve o relato.
 *
 * Os textos de severidade e prioridade são julgamento humano de QA e ficam neste arquivo, revisáveis.
 * Rodar:  npm run defeitos:relatar   (usa PW_CHANNEL=chrome se definido)
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { DEFEITOS, type DefeitoId } from '../src/domain/defeitos';
import { calcularEsperado } from '../tests/oraculo/calculadora-independente';
import { calcularRescisaoEsperada, type EntradaEsperadaRescisao } from '../tests/oraculo/rescisao-independente';
import { FolhaPage } from '../tests/pages/FolhaPage';
import { RescisaoPage, type PreenchimentoRescisao } from '../tests/pages/RescisaoPage';
import { FUNCIONARIO_VALIDO, centavosParaTexto } from '../tests/helpers/dados';

const PORTA = 4173;
const DIR = 'docs/defeitos';
const IMG = `${DIR}/img`;

type Sev = 'Crítica' | 'Alta' | 'Média' | 'Baixa';

interface Relato {
  numero: number;
  id: keyof typeof DEFEITOS;
  titulo: string;
  modulo: 'Folha mensal' | 'Cadastro' | 'Rescisão';
  regra: string;
  severidade: Sev;
  porqueSeveridade: string;
  prioridade: Sev;
  porquePrioridade: string;
  /** Cenário de reprodução. */
  mensal?: { salario: number; dependentes: number };
  cadastro?: { campo: 'salario' | 'cpf'; valor: string; rotulo: string };
  rescisao?: EntradaEsperadaRescisao;
}

const BASE_RESC: EntradaEsperadaRescisao = {
  tipo: 'sem_justa_causa',
  salarioCentavos: 300000,
  dependentes: 0,
  admissao: '2020-01-10',
  desligamento: '2025-08-20',
  saldoFgtsCentavos: 1000000,
  feriasVencidas: false,
  avisoCumprido: false,
};

const RELATOS: Relato[] = [
  { numero: 1, id: 'inss_sem_progressividade', titulo: 'INSS calculado sobre o salário inteiro com a alíquota da última faixa', modulo: 'Folha mensal', regra: 'RN-INSS-01', severidade: 'Crítica', porqueSeveridade: 'Afeta quase todos os funcionários e todo mês, com valor financeiro relevante.', prioridade: 'Alta', porquePrioridade: 'Deve ser corrigido antes de qualquer fechamento de folha.', mensal: { salario: 300000, dependentes: 0 } },
  { numero: 2, id: 'inss_sem_teto', titulo: 'INSS ultrapassa o teto de contribuição em salários altos', modulo: 'Folha mensal', regra: 'RN-INSS-02', severidade: 'Alta', porqueSeveridade: 'Desconto acima do máximo legal; atinge só quem ganha acima do teto.', prioridade: 'Alta', porquePrioridade: 'Desconto indevido do trabalhador, com risco de ação e retrabalho de guia.', mensal: { salario: 1500000, dependentes: 0 } },
  { numero: 3, id: 'arredondamento_antecipado', titulo: 'INSS arredonda cada faixa antes de somar e gera 1 centavo de diferença', modulo: 'Folha mensal', regra: 'RN-ARR-01', severidade: 'Média', porqueSeveridade: 'A diferença por pessoa é de 1 centavo.', prioridade: 'Média', porquePrioridade: 'O erro se acumula na guia e na conciliação de muitos funcionários; precisa de decisão do negócio sobre a regra de arredondamento.', mensal: { salario: 300000, dependentes: 0 } },
  { numero: 4, id: 'irrf_base_sem_inss', titulo: 'Base do IRRF não desconta o INSS', modulo: 'Folha mensal', regra: 'RN-IRRF-01', severidade: 'Alta', porqueSeveridade: 'Imposto retido maior que o devido para salários acima da faixa do redutor.', prioridade: 'Alta', porquePrioridade: 'Retenção indevida recorrente e visível no holerite.', mensal: { salario: 800000, dependentes: 0 } },
  { numero: 5, id: 'irrf_dependente_so_primeiro', titulo: 'Dedução por dependente aplicada apenas ao primeiro dependente', modulo: 'Folha mensal', regra: 'RN-IRRF-01', severidade: 'Alta', porqueSeveridade: 'IRRF maior que o devido para quem tem 2 ou mais dependentes.', prioridade: 'Alta', porquePrioridade: 'Atinge famílias e é fácil de ser percebida pelo funcionário.', mensal: { salario: 600000, dependentes: 2 } },
  { numero: 6, id: 'irrf_sem_reducao', titulo: 'Redutor da Lei 15.270/2025 não é aplicado ao IRRF', modulo: 'Folha mensal', regra: 'RN-IRRF-03', severidade: 'Alta', porqueSeveridade: 'Retenção de imposto indevida para quem ganha até R$ 7.350,00.', prioridade: 'Alta', porquePrioridade: 'Descumpre lei vigente e atinge a maior parte dos salários.', mensal: { salario: 600000, dependentes: 0 } },
  { numero: 7, id: 'cadastro_salario_invalido', titulo: 'Cadastro aceita salário zero', modulo: 'Cadastro', regra: 'RN-CAD-03', severidade: 'Média', porqueSeveridade: 'Dado inválido entra no cálculo, mas o valor financeiro é zero.', prioridade: 'Média', porquePrioridade: 'Pode gerar holerite vazio e mascarar erro de digitação.', cadastro: { campo: 'salario', valor: '0,00', rotulo: 'Salário bruto (R$)' } },
  { numero: 8, id: 'cpf_sem_digito_verificador', titulo: 'Cadastro não confere os dígitos verificadores do CPF', modulo: 'Cadastro', regra: 'RN-CAD-02', severidade: 'Média', porqueSeveridade: 'Funcionário fica cadastrado com documento inválido.', prioridade: 'Média', porquePrioridade: 'Gera rejeição em obrigações acessórias (eSocial) e retrabalho no cadastro.', cadastro: { campo: 'cpf', valor: '529.982.247-26', rotulo: 'CPF' } },
  { numero: 9, id: 'res_multa_em_pedido_demissao', titulo: 'Multa de 40% do FGTS calculada no pedido de demissão', modulo: 'Rescisão', regra: 'RN-RES-09', severidade: 'Crítica', porqueSeveridade: 'Mostra pagamento de multa que não é devida, com valor alto.', prioridade: 'Alta', porquePrioridade: 'Pagamento indevido em dinheiro; deve ser corrigido antes de qualquer uso.', rescisao: { ...BASE_RESC, tipo: 'pedido_demissao', admissao: '2022-03-10', avisoCumprido: true } },
  { numero: 10, id: 'res_aviso_sem_3_dias_por_ano', titulo: 'Aviso prévio fixo em 30 dias, sem os 3 dias por ano de serviço', modulo: 'Rescisão', regra: 'RN-RES-02', severidade: 'Alta', porqueSeveridade: 'Aviso e verbas proporcionais pagos a menos para quem tem mais de 1 ano de casa.', prioridade: 'Alta', porquePrioridade: 'Gera passivo trabalhista.', rescisao: BASE_RESC },
  { numero: 11, id: 'res_sem_projecao_aviso', titulo: 'Avos de férias e 13º ignoram a projeção do aviso prévio', modulo: 'Rescisão', regra: 'RN-RES-03', severidade: 'Alta', porqueSeveridade: 'Férias proporcionais e 13º pagos a menos.', prioridade: 'Alta', porquePrioridade: 'Gera passivo trabalhista e não aparece como erro óbvio na tela.', rescisao: BASE_RESC },
  { numero: 12, id: 'res_inss_sobre_aviso', titulo: 'INSS incide sobre o aviso prévio indenizado', modulo: 'Rescisão', regra: 'RN-RES-08', severidade: 'Alta', porqueSeveridade: 'Desconto indevido sobre verba indenizatória, com valor alto.', prioridade: 'Alta', porquePrioridade: 'Reduz o líquido do trabalhador por um desconto que a lei não prevê.', rescisao: BASE_RESC },
  { numero: 13, id: 'res_avos_qualquer_dia', titulo: 'Mês conta como avo mesmo com menos de 15 dias', modulo: 'Rescisão', regra: 'RN-RES-04', severidade: 'Média', porqueSeveridade: 'Férias proporcionais pagas a mais por 1 avo.', prioridade: 'Média', porquePrioridade: 'Pagamento a maior; fica abaixo dos defeitos que lesam o trabalhador ou geram multa indevida.', rescisao: { ...BASE_RESC, admissao: '2022-03-10', desligamento: '2025-08-10' } },
];

const reais = (c: number): string => `R$ ${(c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dataBr = (iso: string): string => iso.split('-').reverse().join('/');

const ROTULO_MENSAL: Record<string, string> = {
  inss: 'INSS', baseIrrf: 'Base do IRRF', irrfTabela: 'IRRF pela tabela', reducao: 'Redutor', irrf: 'IRRF retido', fgts: 'FGTS (empregador)', liquido: 'Líquido',
};
const ROTULO_RESC: Record<string, string> = {
  anosCompletos: 'Anos completos', avisoDias: 'Dias de aviso prévio', dataProjetada: 'Data projetada', avos13: 'Avos de 13º', avosFerias: 'Avos de férias',
  saldoSalarioCentavos: 'Saldo de salário', avisoIndenizadoCentavos: 'Aviso prévio indenizado', feriasVencidasCentavos: 'Férias vencidas', tercoFeriasVencidasCentavos: '1/3 férias vencidas',
  feriasProporcionaisCentavos: 'Férias proporcionais', tercoFeriasProporcionaisCentavos: '1/3 férias proporcionais', decimoTerceiroCentavos: '13º proporcional',
  inssSaldoCentavos: 'INSS sobre o saldo', irrfSaldoCentavos: 'IRRF sobre o saldo', inss13Centavos: 'INSS sobre o 13º', irrf13Centavos: 'IRRF sobre o 13º', descontoAvisoCentavos: 'Desconto de aviso',
  totalProventosCentavos: 'Total de proventos', totalDescontosCentavos: 'Total de descontos', liquidoCentavos: 'Líquido', fgtsRescisorioCentavos: 'FGTS rescisório', multaFgtsCentavos: 'Multa de 40% do FGTS',
};

interface Linha { item: string; esperado: string; obtido: string }
interface Observado { linhas: Linha[]; resumoDiferencas: Linha[]; textoPasso: string[]; dados: string[]; imgCorreto: string; imgDefeito: string }

function fmt(chave: string, v: number | string): string {
  if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? dataBr(v) : v;
  return chave.endsWith('Centavos') || ['inss', 'baseIrrf', 'irrfTabela', 'reducao', 'irrf', 'fgts', 'liquido'].includes(chave) ? reais(v) : String(v);
}

async function esperarServidor(): Promise<void> {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://localhost:${PORTA}/`)).ok) return; } catch { /* ainda subindo */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Servidor de preview não subiu');
}

async function main(): Promise<void> {
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(IMG, { recursive: true });

  let servidor: ChildProcess | null = null;
  try {
    const ja = await fetch(`http://localhost:${PORTA}/`).then((r) => r.ok).catch(() => false);
    if (!ja) {
      const b = spawnSync('npm', ['run', 'build'], { stdio: 'ignore', shell: process.platform === 'win32' });
      if (b.status !== 0) throw new Error('Build falhou');
      servidor = spawn('npm', ['run', 'preview'], { stdio: 'ignore', shell: process.platform === 'win32' });
      await esperarServidor();
    }

    const navegador = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
    const contexto = await navegador.newContext({ baseURL: `http://localhost:${PORTA}`, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', viewport: { width: 1100, height: 900 } });
    const pagina = await contexto.newPage();

    const gerados: Array<{ r: Relato; sev: string }> = [];

    for (const r of RELATOS) {
      const obs = await observar(r, pagina);
      escreverRelato(r, obs);
      gerados.push({ r, sev: r.severidade });
      console.log(`DEF-${String(r.numero).padStart(2, '0')} ${r.id}: ${obs.resumoDiferencas.length} diferença(s)`);
    }
    escreverIndice(gerados.map((g) => g.r));
    await navegador.close();
  } finally {
    servidor?.kill();
    delete process.env['DEFEITOS'];
  }
}

async function observar(r: Relato, pagina: import('@playwright/test').Page): Promise<Observado> {
  const prefixo = `DEF-${String(r.numero).padStart(2, '0')}`;
  const imgCorreto = `img/${prefixo}-correto.png`;
  const imgDefeito = `img/${prefixo}-com-defeito.png`;
  const shot = async (arq: string) => pagina.screenshot({ path: `${DIR}/${arq}`, fullPage: true });

  // ---------- Folha mensal ----------
  if (r.mensal) {
    const esp = calcularEsperado(r.mensal.salario, r.mensal.dependentes);
    const ler = async (defeito: string, arq: string) => {
      process.env['DEFEITOS'] = defeito;
      const f = new FolhaPage(pagina);
      await f.abrir();
      await f.preencherECalcular({ salario: centavosParaTexto(r.mensal!.salario), dependentes: String(r.mensal!.dependentes) });
      const v = await f.valoresDoHolerite();
      await shot(arq);
      return v as Record<string, number>;
    };
    const certo = await ler('', imgCorreto);
    const defeituoso = await ler(r.id, imgDefeito);
    const e = esp as unknown as Record<string, number>;
    for (const k of Object.keys(e)) if (certo[k] !== e[k]) throw new Error(`${r.id}: sem defeito a tela não bate com o oráculo em ${k}`);
    const linhas = Object.keys(ROTULO_MENSAL).filter((k) => k in e).map((k) => ({ item: ROTULO_MENSAL[k]!, esperado: fmt(k, e[k]!), obtido: fmt(k, defeituoso[k]!) }));
    const dif = Object.keys(ROTULO_MENSAL).filter((k) => k in e && defeituoso[k] !== e[k]).map((k) => ({ item: ROTULO_MENSAL[k]!, esperado: fmt(k, e[k]!), obtido: fmt(k, defeituoso[k]!) }));
    if (dif.length === 0) throw new Error(`${r.id}: o cenário escolhido não mostra diferença`);
    return {
      linhas, resumoDiferencas: dif, imgCorreto, imgDefeito,
      dados: [`Nome: ${FUNCIONARIO_VALIDO.nome} (fictício)`, `CPF: ${FUNCIONARIO_VALIDO.cpf} (fictício)`, `Admissão: ${dataBr(FUNCIONARIO_VALIDO.admissao)}`, `Salário bruto: ${reais(r.mensal.salario)}`, `Dependentes: ${r.mensal.dependentes}`],
      textoPasso: ['Abrir a aplicação com o defeito ligado.', 'Preencher o cadastro com os dados abaixo.', 'Clicar em **Calcular folha**.', 'Conferir os valores do holerite.'],
    };
  }

  // ---------- Cadastro ----------
  if (r.cadastro) {
    const c = r.cadastro;
    const ler = async (defeito: string, arq: string) => {
      process.env['DEFEITOS'] = defeito;
      const f = new FolhaPage(pagina);
      await f.abrir();
      await f.preencherECalcular({ [c.campo]: c.valor });
      const holerite = await f.holerite.count();
      const erros = await f.erros.count();
      await shot(arq);
      return { holerite, erros };
    };
    const certo = await ler('', imgCorreto);
    const defeituoso = await ler(r.id, imgDefeito);
    if (certo.holerite !== 0 || certo.erros === 0) throw new Error(`${r.id}: sem defeito o cadastro deveria ser recusado`);
    if (defeituoso.holerite === 0) throw new Error(`${r.id}: com defeito o cadastro deveria ser aceito`);
    const dif = [{ item: 'Resultado do cadastro inválido', esperado: `Recusado com mensagem de erro (${certo.erros} aviso)`, obtido: 'Aceito: holerite gerado' }];
    return {
      linhas: dif, resumoDiferencas: dif, imgCorreto, imgDefeito,
      dados: [`${c.rotulo}: ${c.valor}`, 'Demais campos: dados fictícios válidos'],
      textoPasso: ['Abrir a aplicação com o defeito ligado.', `Preencher o cadastro com o valor inválido de **${c.rotulo}** e os demais campos válidos.`, 'Clicar em **Calcular folha**.', 'Observar se o cadastro foi recusado.'],
    };
  }

  // ---------- Rescisão ----------
  const en = r.rescisao!;
  const esp = calcularRescisaoEsperada(en) as unknown as Record<string, number | string>;
  const preench: PreenchimentoRescisao = {
    tipo: en.tipo, salario: centavosParaTexto(en.salarioCentavos), dependentes: String(en.dependentes), admissao: en.admissao,
    desligamento: en.desligamento, saldoFgts: centavosParaTexto(en.saldoFgtsCentavos), feriasVencidas: en.feriasVencidas, avisoCumprido: en.avisoCumprido,
  };
  const ler = async (defeito: string, arq: string) => {
    process.env['DEFEITOS'] = defeito;
    const p = new RescisaoPage(pagina);
    await p.abrir();
    await p.preencherECalcular(preench);
    const v = (await p.valoresDoTermo()) as unknown as Record<string, number | string>;
    await shot(arq);
    return v;
  };
  const certo = await ler('', imgCorreto);
  const defeituoso = await ler(r.id, imgDefeito);
  for (const k of Object.keys(ROTULO_RESC)) if (certo[k] !== esp[k]) throw new Error(`${r.id}: sem defeito a tela não bate com o oráculo em ${k}`);
  const todas = Object.keys(ROTULO_RESC).map((k) => ({ k, item: ROTULO_RESC[k]!, esperado: fmt(k, esp[k]!), obtido: fmt(k, defeituoso[k]!), difere: defeituoso[k] !== esp[k] }));
  const dif = todas.filter((x) => x.difere);
  if (dif.length === 0) throw new Error(`${r.id}: o cenário escolhido não mostra diferença`);
  const nomeTipo = en.tipo === 'sem_justa_causa' ? 'Dispensa sem justa causa' : 'Pedido de demissão';
  return {
    linhas: dif, resumoDiferencas: dif, imgCorreto, imgDefeito,
    dados: [
      `Tipo: ${nomeTipo}`, `Salário bruto: ${reais(en.salarioCentavos)}`, `Dependentes: ${en.dependentes}`, `Admissão: ${dataBr(en.admissao)}`,
      `Desligamento (último dia trabalhado): ${dataBr(en.desligamento)}`, `Saldo do FGTS: ${reais(en.saldoFgtsCentavos)}`,
      `Férias vencidas: ${en.feriasVencidas ? 'sim' : 'não'}`, `Aviso prévio cumprido: ${en.avisoCumprido ? 'sim' : 'não'}`,
    ],
    textoPasso: ['Abrir a aplicação com o defeito ligado e ir para a aba **Rescisão**.', 'Preencher o formulário com os dados abaixo.', 'Clicar em **Calcular rescisão**.', 'Conferir os itens do termo de rescisão.'],
  };
}

function tabela(linhas: Linha[]): string {
  return ['| Item | Esperado | Obtido com o defeito |', '|---|---|---|', ...linhas.map((l) => `| ${l.item} | ${l.esperado} | ${l.obtido} |`)].join('\n');
}

function escreverRelato(r: Relato, o: Observado): void {
  const nome = `DEF-${String(r.numero).padStart(2, '0')}`;
  const d = DEFEITOS[r.id];
  const md = `# ${nome}: ${r.titulo}

| Campo | Valor |
|---|---|
| Módulo | ${r.modulo} |
| Regra de negócio | ${r.regra} (\`docs/regras-de-negocio.md\`) |
| Identificador técnico | \`${r.id}\` |
| Severidade | **${r.severidade}**: ${r.porqueSeveridade} |
| Prioridade | **${r.prioridade}**: ${r.porquePrioridade} |
| Origem | Defeito **plantado de propósito** para demonstração (sistema fictício) |
| Ambiente | FolhaDemo local (build de preview), Chrome, fuso America/Sao_Paulo |
| Status | **Fechado (simulado)**: detectado pela suíte; correção = desligar o defeito |

## Como ligar o defeito

Na URL: \`/?defeitos=${r.id}\` ou, nos scripts, \`DEFEITOS=${r.id}\`.

## Passos para reproduzir

${o.textoPasso.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Dados usados (todos fictícios)**

${o.dados.map((x) => `- ${x}`).join('\n')}

## Resultado esperado x obtido

O esperado vem da calculadora independente (não da tela). ${r.modulo === 'Rescisão' ? 'A tabela mostra só os itens que divergem.' : r.modulo === 'Folha mensal' ? 'A tabela mostra todos os itens do holerite.' : ''}

${tabela(o.linhas)}

## Impacto

${d.risco}.

## Evidência

Sem o defeito (comportamento correto):

![Sem o defeito](${o.imgCorreto})

Com o defeito ligado:

![Com o defeito](${o.imgDefeito})

## Como a suíte detecta

Executando a suíte com \`DEFEITOS=${r.id}\`, ao menos um teste falha (ver \`docs/qualidade/deteccao.md\`). Sem o defeito, todos passam.

## Ciclo de vida

Novo → Em análise → Em correção → Corrigido → Reteste (com regressão em volta) → **Fechado**. Por ser defeito simulado, "corrigir" é desligá-lo; o reteste é a suíte completa passar sem ele.
`;
  writeFileSync(`${DIR}/${nome}.md`, md, 'utf-8');
}

function escreverIndice(rs: Relato[]): void {
  const linhas = rs.map((r) => {
    const nome = `DEF-${String(r.numero).padStart(2, '0')}`;
    return `| [${nome}](${nome}.md) | ${r.titulo} | ${r.modulo} | ${r.severidade} | ${r.prioridade} | ${r.regra} |`;
  });
  const md = `# Relatos de defeito

> Gerado por \`npm run defeitos:relatar\`. **Não edite à mão**: severidade e prioridade ficam em \`scripts/gerar-relatos-defeitos.ts\`.

São 13 defeitos **plantados de propósito**. Cada relato traz passos, dados, esperado x obtido (esperado vindo da calculadora independente), impacto e dois prints reais: sem e com o defeito.

**Severidade** é o tamanho do estrago; **prioridade** é a ordem de conserto. Os dois julgamentos são humanos e estão justificados em cada relato.

| ID | Título | Módulo | Severidade | Prioridade | Regra |
|---|---|---|---|---|---|
${linhas.join('\n')}
`;
  writeFileSync(`${DIR}/README.md`, md, 'utf-8');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
