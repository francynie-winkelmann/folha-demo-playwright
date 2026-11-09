/**
 * Regressão "antes × depois" da folha mensal (golden master / approval testing).
 *
 * Compara as saídas atuais do cálculo com a referência aprovada (regressao/referencia.json) para cada
 * combinação da grade e gera um RELATÓRIO DE IMPACTO. Cada diferença é classificada como ESPERADA
 * (coluna listada em regressao/mudancas-aprovadas.json) ou INESPERADA. Qualquer inesperada reprova.
 *
 * Também roda um EXPERIMENTO CONTROLADO: liga uma alteração escondida de propósito e mostra que a
 * regressão a percebe.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ALTERACOES_ESCONDIDAS } from '../src/domain/defeitos';
import { COLUNAS, linhaDe, type Linha } from './regressao-comum';

interface Referencia {
  versao: string;
  aprovada_por: string;
  gerada_em: string;
  colunas: string[];
  linhas: Linha[];
}
interface Aprovadas {
  mudancas: Array<{ coluna: string; motivo: string; aprovado_por: string; data: string }>;
}

const ref = JSON.parse(readFileSync(resolve('regressao/referencia.json'), 'utf-8')) as Referencia;
const aprovadas = (JSON.parse(readFileSync(resolve('regressao/mudancas-aprovadas.json'), 'utf-8')) as Aprovadas).mudancas;
if (JSON.stringify(ref.colunas) !== JSON.stringify(COLUNAS)) throw new Error('As colunas da referência não batem com o código. Regere a referência.');

interface Diferenca {
  salario: number;
  dependentes: number;
  coluna: string;
  antes: number;
  depois: number;
  classe: 'esperada' | 'inesperada';
}

function comparar(): { total: number; iguais: number; diferencas: Diferenca[]; entradasAlteradas: number } {
  const diferencas: Diferenca[] = [];
  let entradasAlteradas = 0;
  for (const antes of ref.linhas) {
    const depois = linhaDe(antes[0], antes[1]);
    let mudou = false;
    COLUNAS.forEach((coluna, i) => {
      if (antes[i] !== depois[i]) {
        mudou = true;
        const aprovada = aprovadas.some((a) => a.coluna === coluna);
        diferencas.push({ salario: antes[0], dependentes: antes[1], coluna, antes: antes[i]!, depois: depois[i]!, classe: aprovada ? 'esperada' : 'inesperada' });
      }
    });
    if (mudou) entradasAlteradas += 1;
  }
  return { total: ref.linhas.length, iguais: ref.linhas.length - entradasAlteradas, diferencas, entradasAlteradas };
}

const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const porColuna = (ds: Diferenca[]) => {
  const m = new Map<string, number>();
  ds.forEach((d) => m.set(d.coluna, (m.get(d.coluna) ?? 0) + 1));
  return [...m].map(([c, n]) => `${c}: ${n}`).join('; ') || 'nenhuma';
};

// 1) Regressão real: código atual × referência aprovada
delete process.env['DEFEITOS'];
const real = comparar();
const inesperadas = real.diferencas.filter((d) => d.classe === 'inesperada');

// 2) Experimento controlado: liga a alteração escondida e compara de novo
const experimentos = (Object.keys(ALTERACOES_ESCONDIDAS) as Array<keyof typeof ALTERACOES_ESCONDIDAS>).map((id) => {
  process.env['DEFEITOS'] = id;
  const r = comparar();
  delete process.env['DEFEITOS'];
  return { id, ...ALTERACOES_ESCONDIDAS[id], r };
});

const md: string[] = [];
md.push('# Regressão antes × depois (folha mensal)');
md.push('');
md.push('> Gerado por `npm run regressao`. **Não edite à mão.**');
md.push('');
md.push('**O que é:** a referência aprovada (*golden master*) guarda o que a folha mensal calculava na versão anterior, para centenas de');
md.push('combinações de salário e dependentes. A cada nova versão, o cálculo roda de novo nas mesmas entradas e cada diferença vira um');
md.push('item do relatório, que uma pessoa classifica como **esperada** (mudança pretendida e aprovada) ou **inesperada** (regressão).');
md.push('');
md.push('## Resultado desta versão');
md.push('');
md.push(`- Referência: **${ref.versao}**, gravada em ${ref.gerada_em.slice(0, 10)}. Aprovação: ${ref.aprovada_por}.`);
md.push(`- Combinações comparadas: **${real.total}** (salário × dependentes, incluindo as fronteiras de todas as faixas ±1 centavo).`);
md.push(`- Idênticas: **${real.iguais}**. Com diferença: **${real.entradasAlteradas}**.`);
md.push(`- Diferenças esperadas (aprovadas): **${real.diferencas.length - inesperadas.length}**. Inesperadas: **${inesperadas.length}**.`);
md.push(`- **Veredito: ${inesperadas.length === 0 ? 'APROVADO. A folha mensal calcula exatamente como na versão anterior.' : 'REPROVADO. Há regressão não aprovada.'}**`);
if (inesperadas.length > 0) {
  md.push('', '### Diferenças inesperadas (primeiras 15)', '', '| Salário | Dep. | Campo | Antes | Depois |', '|---:|---:|---|---:|---:|');
  inesperadas.slice(0, 15).forEach((d) => md.push(`| ${reais(d.salario)} | ${d.dependentes} | ${d.coluna} | ${reais(d.antes)} | ${reais(d.depois)} |`));
}
md.push('', '## Experimento controlado: a regressão percebe uma alteração escondida?', '');
md.push('Para provar que a comparação funciona, liga-se de propósito uma alteração sutil (desligada por padrão) e roda-se a mesma comparação.');
md.push('');
for (const x of experimentos) {
  const ds = x.r.diferencas;
  md.push(`### \`${x.id}\``, '');
  md.push(`- O que muda: ${x.descricao}.`);
  md.push(`- Risco: ${x.risco}.`);
  md.push(`- Resultado: **${x.r.entradasAlteradas} de ${x.r.total} combinações mudaram** (${((x.r.entradasAlteradas / x.r.total) * 100).toFixed(1)}%). Campos afetados: ${porColuna(ds)}.`);
  md.push(`- Veredito da regressão com a alteração ligada: **${ds.some((d) => d.classe === 'inesperada') ? 'REPROVADO, alteração detectada' : 'passou, alteração NÃO detectada'}**.`);
  const exemplos = ds.filter((d) => d.salario >= 100000).slice(0, 5);
  if (exemplos.length) {
    md.push('', '| Salário | Dep. | Campo | Antes | Depois |', '|---:|---:|---|---:|---:|');
    exemplos.forEach((d) => md.push(`| ${reais(d.salario)} | ${d.dependentes} | ${d.coluna} | ${reais(d.antes)} | ${reais(d.depois)} |`));
  }
  md.push('');
}
md.push('## Limites desta técnica', '');
md.push('- A referência registra o que o sistema **fazia**, não necessariamente o que está **certo**. Por isso ela só vale se a versão anterior foi validada (aqui, pelo oráculo independente e pela suíte funcional: ver `rastreabilidade.md`).');
md.push('- Cobre a folha mensal (grade finita de entradas). Não cobre a rescisão, que é nova na v2 e não tem "antes".');
md.push('- Mudanças aprovadas ficam registradas em `regressao/mudancas-aprovadas.json`, com motivo e responsável; nova referência só é gravada com `--aprovar`.');
writeFileSync(resolve('docs/qualidade/regressao.md'), md.join('\n') + '\n');
writeFileSync(
  resolve('docs/qualidade/regressao.json'),
  JSON.stringify(
    {
      referencia: ref.versao,
      comparadas: real.total,
      iguais: real.iguais,
      inesperadas: inesperadas.length,
      experimentos: experimentos.map((x) => ({ id: x.id, alteradas: x.r.entradasAlteradas, detectada: x.r.diferencas.some((d) => d.classe === 'inesperada') })),
    },
    null,
    2,
  ) + '\n',
);
console.log(`Regressão: ${real.total} comparadas, ${inesperadas.length} inesperadas. Experimentos: ${experimentos.map((x) => `${x.id}=${x.r.entradasAlteradas}`).join(', ')}`);
if (inesperadas.length > 0) process.exit(1);
if (experimentos.some((x) => !x.r.diferencas.some((d) => d.classe === 'inesperada'))) {
  console.error('O experimento controlado NÃO foi detectado: a regressão está cega.');
  process.exit(1);
}
