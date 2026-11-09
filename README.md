# folha-demo-playwright

[![Testes](https://github.com/francynie-winkelmann/folha-demo-playwright/actions/workflows/ci.yml/badge.svg)](https://github.com/francynie-winkelmann/folha-demo-playwright/actions/workflows/ci.yml)

Aplicação de folha de pagamento **fictícia**, criada para demonstrar como eu testo um sistema com regras de cálculo
complexas e dados sensíveis, usando **Playwright + TypeScript** e IA como apoio, sempre com revisão humana e
evidência do que foi validado.

> **Aviso:** nada aqui vem de sistema, cliente ou base de qualquer empresa. Os dados são inventados e a aplicação
> tem **defeitos propositais** (desligados por padrão) para provar que os testes realmente os encontram.

## O que este projeto mostra

- **Análise funcional e cenários por risco:** cada teste aponta a regra de negócio e o risco que cobre
  (`docs/regras-de-negocio.md`). Veja os rótulos `[RN-...]` nos nomes dos testes e nas anotações do relatório.
- **Resultado esperado independente da tela.** Duas fontes, que se conferem entre si:
  1. uma tabela de casos (`tests/oraculo/casos-calculo.json`), gerada por
  2. uma calculadora independente, escrita em outro estilo (`tests/oraculo/calculadora-independente.ts`),
     validada contra exemplos publicados pela Receita Federal.
- **Defeitos plantados e taxa de detecção.** 13 defeitos propositais (8 da folha mensal, 5 da rescisão); a suíte deve passar sem eles e falhar com cada um
  (`npm run defeitos:medir`, resultado em `docs/qualidade/deteccao.md`).
- **Módulo de rescisão (v2):** dispensa sem justa causa e pedido de demissão, com aviso prévio proporcional (30 dias + 3 por ano, com projeção), avos de férias e 13º, multa de 40% do FGTS e tributação separada. O esperado vem de uma segunda calculadora independente, com aritmética de datas própria.
- **Regressão antes × depois (*golden master*):** compara 1.650 combinações da folha mensal com a referência aprovada da versão anterior e gera um relatório de impacto (`docs/qualidade/regressao.md`). Um experimento controlado liga uma alteração escondida de 1 centavo e mostra que a regressão a percebe.
- **BDD em português (Gherkin + playwright-bdd):** cenários de rescisão legíveis por quem é de folha, ligados às regras e à matriz de rastreabilidade (`bdd/`).
- **Testes que não escondem instabilidade:** sem retentativas automáticas, e uma medição que repete a suíte várias vezes
  e aponta qualquer teste que mude de resultado (`npm run instabilidade`, resultado em `docs/qualidade/instabilidade.md`).
- **Teste de mutação (Stryker):** altera o código de propósito para provar que os testes percebem. Nota atual **98,59%**,
  com os sobreviventes analisados um a um (`docs/qualidade/mutacao.md`).
- **Matriz de rastreabilidade gerada automaticamente:** regra de negócio → risco → teste → resultado. O CI falha se uma
  regra ficar sem teste (`docs/qualidade/rastreabilidade.md`).
- **Plano de testes e gestão de defeitos:** escopo, níveis (integração marcada como planejada), riscos priorizados e critérios de saída em `docs/plano-de-testes.md`; 13 relatos de defeito com passos, esperado x obtido e prints reais, com severidade e prioridade justificadas (`docs/defeitos/`, gerados por `npm run defeitos:relatar`).
- **Testes exploratórios:** duas sessões executadas por IA com navegador e uma sessão com roteiro para execução humana (`docs/exploratorio/`), com descobertas separadas de confirmações e dos limites do que foi feito.
- **Site do portfólio:** estudos de caso e painel de qualidade gerados a partir dos relatórios reais, sem número digitado à mão (`npm run site`, publicado pelo workflow `demo-pages.yml` no GitHub Pages junto da demonstração).
- **Evidência por execução:** commit, data, versões, resultado e impressões digitais (SHA-256) dos arquivos de apoio,
  anexados a cada execução do CI junto com o relatório HTML do Playwright (`docs/qualidade/evidencia.md`).

## Como rodar

Requisitos: Node.js 22 ou superior.

```bash
npm ci
npx playwright install chromium
npm test            # roda a suíte inteira (sobe o app sozinho)
npm run report      # abre o relatório HTML da última execução
```

Comandos de qualidade e auditoria:

| Comando | Para que serve | Tempo aprox. |
|---|---|---|
| `npm run test:unit` | Testes unitários da regra de negócio (Vitest), sem navegador | 1 s |
| `npm run mutacao` | Teste de mutação (Stryker) | 25 s |
| `npm run rastreabilidade` | Matriz regra → risco → teste → resultado (depois de `npm test`) | 1 s |
| `npm run evidencia` | Manifesto da execução com commit, versões e SHA-256 (depois de `npm test`) | 1 s |
| `npm run test:bdd` | Cenários BDD (Gherkin em português) | 10 s |
| `npm run regressao` | Regressão antes × depois da folha mensal + experimento controlado | 1 s |
| `npm run regressao:referencia -- --aprovar --versao "..." --por "Nome"` | Grava nova referência aprovada (só após aprovação humana) | 1 s |
| `npm run defeitos:medir` | Taxa de detecção dos defeitos propositais | cerca de 15 min |
| `npm run defeitos:relatar` | Gera os 13 relatos de defeito com prints (usa a aplicação local) | ≈ 1 min |
| `npm run site` | Gera o site do portfólio em `site-dist/` a partir dos relatórios | ≈ 10 s |
| `npm run instabilidade` | Repete a suíte (padrão 3x) procurando teste instável | ≈ 4 min por repetição |

Para ver a aplicação: `npm run dev` e abra o endereço mostrado.
Para ligar um defeito proposital: acrescente `?defeitos=inss_sem_teto` à URL (veja a lista abaixo).

## Defeitos propositais

| Chave | O que acontece | Risco |
|---|---|---|
| `inss_sem_progressividade` | Alíquota da faixa sobre o salário inteiro | INSS maior que o devido |
| `inss_sem_teto` | INSS passa do teto de contribuição | Desconto acima do máximo legal |
| `arredondamento_antecipado` | Arredonda cada faixa do INSS antes de somar | Diferença de centavos |
| `irrf_base_sem_inss` | Base do IRRF não desconta o INSS | Imposto maior que o devido |
| `irrf_dependente_so_primeiro` | Só o 1º dependente é deduzido | Imposto errado com 2 ou mais dependentes |
| `irrf_sem_reducao` | Ignora o redutor da Lei 15.270/2025 | Retenção indevida até R$ 7.350 |
| `cadastro_salario_invalido` | Aceita salário zero ou negativo | Dado inválido na folha |
| `cpf_sem_digito_verificador` | Não confere os dígitos do CPF | Documento inválido cadastrado |

## Estrutura

```
src/                código do app (domain/ tem o cálculo, os defeitos propositais e a validação)
tabelas/            tabelas de INSS e IRRF (valores em centavos, com vigência e fonte)
unitarios/          testes unitários rápidos da regra de negócio (Vitest) e base do teste de mutação
bdd/                cenários Gherkin em português (.feature) e definições dos passos
regressao/          referência aprovada (golden master) e mudanças aprovadas da folha mensal
tests/
  campos/           validação do cadastro (limites, formatos, mensagens)
  calculo/          cálculo da folha dirigido por dados (28 casos)
  rescisao/         rescisão: 29 casos dirigidos por dados e validação dos campos
  holerite/         apresentação e propriedades válidas para qualquer salário
  oraculo/          resultado esperado: tabela de casos, calculadora independente e testes dela
  pages/            Page Object (mapeia a tela; se o seletor muda, só este arquivo muda)
scripts/            geração dos casos, detecção de defeitos, relatos de defeito, sessões exploratórias, rastreabilidade, evidência e instabilidade
docs/               regras de negócio, segurança e relatórios de qualidade (docs/qualidade/)
.github/workflows/  CI (testes, mutação, detecção de defeitos, auditoria), controle semanal de instabilidade e publicação da demonstração
.github/dependabot.yml  atualizações semanais de dependências
```

## Limites declarados e pontos de atenção

- As tabelas de 2026 foram transcritas de páginas de consulta e conferidas por consistência interna e contra exemplos
  da Receita Federal, **mas ainda não conferidas diretamente nos documentos oficiais**. Veja `docs/regras-de-negocio.md`.
- A rescisão não cobre aviso trabalhado, justa causa, acordo (art. 484-A), médias de variáveis, estabilidades nem 13º de ano anterior à data projetada (assume-se já pago). Regras de rescisão ainda a validar em fonte oficial.
- Não testa férias e 13º do mês corrente, horas extras, pensão, desempenho, acessibilidade completa nem outros navegadores.
- As duas fontes de resultado esperado partem das mesmas fontes oficiais: se a fonte estiver errada, as duas erram juntas.
  Por isso a conferência humana é parte do processo.
- A IA ajudou a escrever o código e os cenários; as regras e os resultados precisam de revisão de uma pessoa.

## Publicar a demonstração

Em *Settings > Pages*, escolha *Source: GitHub Actions* e rode o fluxo manual **Publicar demonstração (GitHub Pages)**
na aba *Actions*.

## Licença

A definir.
