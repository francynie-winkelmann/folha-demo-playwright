/**
 * Sessão exploratória 2 (executada pela IA): navegação por teclado e semântica de acessibilidade.
 * Rodar:  PW_CHANNEL=chrome npx tsx scripts/exploratorio-teclado.ts
 */
import { chromium, type Page } from '@playwright/test';

async function focoAtual(p: Page): Promise<string> {
  return p.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return '(corpo da página)';
    const nome = el.getAttribute('aria-label') || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.textContent?.trim().slice(0, 40) || '';
    const cs = getComputedStyle(el);
    const visivel = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? 'contorno visível' : (cs.boxShadow !== 'none' ? 'sombra de foco' : 'SEM indicador de foco');
    return `<${el.tagName.toLowerCase()}${el.getAttribute('role') ? ` role=${el.getAttribute('role')}` : ''}> "${nome}" [${visivel}]`;
  });
}

(async () => {
  const nav = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
  const ctx = await nav.newContext({ baseURL: 'http://localhost:4173', locale: 'pt-BR', viewport: { width: 1100, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('/');

  console.log('== Estrutura da página ==');
  console.log(await p.evaluate(() => JSON.stringify({
    lang: document.documentElement.lang, titulo: document.title, h1: document.querySelectorAll('h1').length,
    main: document.querySelectorAll('main,[role=main]').length, tablist: document.querySelectorAll('[role=tablist]').length,
    tabs: document.querySelectorAll('[role=tab]').length, tabpanel: document.querySelectorAll('[role=tabpanel]').length,
    abaComAriaControls: [...document.querySelectorAll('[role=tab]')].filter((t) => t.hasAttribute('aria-controls')).length,
    inputsSemRotulo: [...document.querySelectorAll('input,select')].filter((i: any) => !(i.labels && i.labels.length) && !i.getAttribute('aria-label')).length,
  })));

  console.log('\n== Ordem do Tab, aba "Folha mensal" ==');
  for (let i = 1; i <= 10; i++) { await p.keyboard.press('Tab'); console.log(`${i}. ${await focoAtual(p)}`); }

  console.log('\n== Setas na lista de abas ==');
  await p.getByRole('tab', { name: 'Folha mensal' }).focus();
  await p.keyboard.press('ArrowRight');
  console.log('Após ArrowRight, foco em:', await focoAtual(p), '| aba Rescisão selecionada?', await p.getByRole('tab', { name: 'Rescisão' }).getAttribute('aria-selected'));
  await p.keyboard.press('End');
  console.log('Após End, foco em:', await focoAtual(p));

  console.log('\n== Enter e Espaço na aba Rescisão ==');
  await p.getByRole('tab', { name: 'Rescisão' }).focus();
  await p.keyboard.press('Enter');
  console.log('Enter ativou a aba?', await p.getByRole('tab', { name: 'Rescisão' }).getAttribute('aria-selected'));

  console.log('\n== Envio do formulário só com o teclado (Rescisão) ==');
  await p.getByRole('button', { name: 'Calcular rescisão' }).focus();
  await p.keyboard.press('Enter');
  console.log('Foco após enviar vazio:', await focoAtual(p));
  const alertas = await p.getByRole('alert').allInnerTexts();
  console.log(`Alertas na tela: ${alertas.length} -> ${alertas.join(' | ')}`);
  console.log(await p.evaluate(() => JSON.stringify({
    camposComAriaInvalid: document.querySelectorAll('[aria-invalid=true]').length,
    camposComAriaDescribedby: document.querySelectorAll('[aria-describedby]').length,
    regiaoAoVivo: document.querySelectorAll('[aria-live],[role=status]').length,
  })));

  console.log('\n== Resultado após cálculo válido ==');
  await p.getByLabel('Tipo de desligamento').selectOption('sem_justa_causa');
  await p.getByLabel('Salário bruto (R$)', { exact: true }).fill('3000,00');
  await p.getByLabel('Dependentes (IRRF)').fill('0');
  await p.getByLabel('Data de admissão').fill('2022-03-10');
  await p.getByLabel('Data de desligamento (último dia trabalhado)').fill('2025-08-20');
  await p.getByLabel('Saldo do FGTS (R$)').fill('0,00');
  await p.getByRole('button', { name: 'Calcular rescisão' }).click();
  console.log('Foco após calcular:', await focoAtual(p));
  console.log(await p.evaluate(() => JSON.stringify({
    resultadoEmRegiaoNomeada: !!document.querySelector('[data-testid=rescisao][aria-label],[data-testid=rescisao][aria-labelledby],section[aria-label],section[aria-labelledby]'),
    resultadoComAriaLive: !!document.querySelector('[data-testid=rescisao][aria-live],[aria-live] [data-testid=rescisao]'),
    tabelaOuListaDeDefinicao: document.querySelectorAll('[data-testid=rescisao] table, [data-testid=rescisao] dl').length,
  })));

  console.log('\n== Zoom 200% (viewport 550px) ==');
  await p.setViewportSize({ width: 550, height: 900 });
  console.log(await p.evaluate(() => JSON.stringify({ rolagemHorizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth })));

  await nav.close();
})();
