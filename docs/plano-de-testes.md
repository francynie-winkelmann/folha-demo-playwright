# Plano de testes: FolhaDemo

Documento vivo. Descreve **o que** é testado, **o que não é**, **como**, com **quais riscos** e **quando o teste pode ser dado por concluído**.
Sistema fictício, sem nenhum dado real. Regras em `docs/regras-de-negocio.md`; resultados em `docs/qualidade/`.

| Campo | Valor |
|---|---|
| Responsável | Francynie Winkelmann (QA) |
| Apoio de IA | Claude (geração de código, casos e documentação), sempre com revisão humana |
| Versão das tabelas | a mesma de `tabelas/` (conferência com fonte oficial **pendente**) |
| Última revisão | 08/11/2026 |

## 1. Objetivo

Dar confiança de que o cálculo de **folha mensal** (INSS, IRRF, FGTS, líquido) e de **rescisão** (sem justa causa e pedido de demissão)
está correto, que erros planejados são encontrados e que a prova disso é rastreável e repetível.

## 2. Escopo

**Dentro do escopo**
- Folha mensal: cadastro e validações, INSS progressivo e teto, IRRF com dependentes e redutor da Lei 15.270/2025, FGTS, líquido, holerite.
- Rescisão: saldo de salário, aviso prévio indenizado (30 dias + 3 por ano, máximo 90, com projeção), avos de férias e 13º, férias vencidas e proporcionais com 1/3, INSS e IRRF separados sobre saldo e 13º, FGTS rescisório e multa de 40%, desconto de aviso no pedido de demissão, líquido negativo.
- Qualidade dos próprios testes: mutação, defeitos plantados, instabilidade, regressão antes × depois.

**Fora do escopo (decisão declarada)**
Aviso prévio trabalhado, justa causa, acordo (art. 484-A), horas extras e variáveis, adicional noturno, DSR, faltas, pensão alimentícia, previdência privada, várias competências, estabilidades, convenção coletiva, persistência de dados, celular e outros navegadores.

**Limite conhecido assumido (RN-RES-13):** o 13º do ano anterior, quando o aviso atravessa a virada do ano, é suposto como já pago. Fixado em teste, não corrigido.

## 3. Níveis de teste

| Nível | Situação | O que cobre | Onde está |
|---|---|---|---|
| Unitário | **Feito** | Regras de cálculo, datas, validações, arredondamento | `unitarios/` (Vitest) |
| Componente / tela (E2E) | **Feito** | Preenchimento, cálculo e leitura do resultado na tela | `tests/` (Playwright) |
| BDD (comportamento) | **Feito** | Cenários de rescisão em português | `bdd/` |
| Regressão antes × depois | **Feito** | 1.650 combinações contra referência | `scripts/regressao.ts` |
| Mutação | **Feito** | Se os testes percebem erro plantado no código | Stryker |
| Exploratório | **Fase 2C** | Descobertas fora do roteiro | `docs/exploratorio/` |
| **Integração / API / contrato** | **Planejado, Fase 5** | Cálculo servido por API e formato dos dados trocados | ainda não existe |
| **Desempenho** | **Risco mapeado, não executado** | Ver seção 6 | ainda não existe |
| Acessibilidade | Parcial (sessão exploratória de teclado) | Navegação por abas e teclado | `docs/exploratorio/` |

Justificativa da proporção: a maior parte das regras é cálculo puro, então fica no nível unitário (rápido e barato). A tela confirma que o valor mostrado é o calculado.
A integração ainda não existe porque o sistema hoje não tem servidor nem banco; entra quando a Fase 5 criar a API.

## 4. Abordagem e técnicas

- **Resultado esperado independente** (oráculo): duas calculadoras escritas de outro jeito (BigInt, datas próprias); comparadas em 3.000 combinações pseudoaleatórias fixas (mais todos os dias de dois anos como data de desligamento) em `unitarios/rescisao.teste.ts`, 0 divergências.
- **Valor limite** nas faixas de INSS e IRRF, no teto, na regra de 15 dias dos avos, em 29/02 e no dia 31.
- **Partição de equivalência** por tipo de desligamento, aviso cumprido ou não, férias vencidas ou não.
- **Orientado a dados:** 29 casos de rescisão (`casos-rescisao.json`) e casos da folha mensal.
- **Tabela de decisão** para tipo de desligamento × aviso × verbas devidas.
- **Baseado em risco:** esforço proporcional ao impacto financeiro e legal (seção 6).
- **Defeitos plantados** (13) e **alteração escondida** (1) para medir a capacidade de detecção.
- **Exploratório** com missão (charter), tempo e anotação.

## 5. Critérios de entrada e saída

**Entrada (pode começar a testar quando)**
- Regras do assunto escritas e validadas por analista de folha.
- Tabelas versionadas no repositório.
- Ambiente instalável com `npm ci`.

**Saída (pode dar por concluído quando)**

| Critério | Meta | Situação em 08/11/2026 |
|---|---|---|
| Todos os testes sem defeito ligado | 100% passando | Atendido |
| Defeitos plantados detectados | 13 de 13 | Atendido |
| Nota de mutação | ≥ 70% (gate do CI) | 98,59% |
| Testes instáveis | 0 | Atendido (medição feita antes desta fase, com 84 testes distintos) |
| Regras sem teste | 0 (CI falha) | Atendido |
| Divergências do oráculo | 0 | Atendido |
| Referência de regressão aprovada por pessoa | Obrigatório antes de usar como gate | **Pendente** |
| Tabelas conferidas com fonte oficial | Obrigatório antes de uso real | **Pendente** |

Os dois itens pendentes impedem afirmar "validado para produção". Para fins de demonstração, estão declarados como limite.

## 6. Riscos e prioridades

| # | Risco | Impacto | Chance | Prioridade | Como é tratado |
|---|---|---|---|---|---|
| R1 | INSS ou IRRF calculado errado (faixa, teto, base) | Alto (multa, retenção indevida) | Média | Alta | Unitário + E2E + oráculo + mutação |
| R2 | Erro de 1 centavo por arredondamento, multiplicado por muitos funcionários | Médio a alto | Alta | Alta | Arredondamento único por item; defeito `arredondamento_antecipado`; alteração escondida de FGTS |
| R3 | Erro de data na rescisão (29/02, virada de ano, dia 31) | Alto | Média | Alta | Valores limite; datas validadas; sessão exploratória |
| R4 | Aviso, avos ou multa de 40% indevidos | Alto | Média | Alta | Defeitos `res_*`; tabela de decisão |
| R5 | Regra de lei errada nas tabelas | Muito alto | Baixa a média | Alta | **Pendente**: conferência oficial; teste verifica o código contra a regra, não a regra contra a lei |
| R6 | Mudança de tabela quebra o que funcionava | Alto | Média | Alta | Regressão antes × depois com relatório de impacto |
| R7 | Teste que passa sem provar nada (falso negativo) | Alto | Média | Alta | Mutação; defeitos plantados |
| R8 | Teste instável corrói a confiança | Médio | Média | Média | `retries: 0`; medição semanal |
| R9 | **Desempenho no fechamento mensal** (milhares de holerites) | Alto em produção | Desconhecida | Média | **Mapeado, não testado**: sistema de demonstração calcula um funcionário por vez; entra se houver cálculo em lote |
| R10 | Dado pessoal exposto (LGPD) | Muito alto | Baixa | Alta | Nenhum dado real; segredos fora do repositório; trilha de auditoria planejada (Fase 5) |
| R11 | Falha de integração entre telas e serviços | Alto | Média | Média | **Planejado, Fase 5** |
| R12 | Acessibilidade (teclado, leitor de tela) | Médio | Média | Média | Sessão exploratória; avaliação completa fora do escopo |

## 7. Ambiente, ferramentas e dados

- Node.js 22+, React + Vite, Playwright (Chrome), Vitest, Stryker, playwright-bdd.
- Dados: 100% fictícios, em JSON versionado. Nenhum CPF, nome ou salário real.
- Defeitos plantados ligados por `?defeitos=` na URL ou variável `DEFEITOS`. Desligados por padrão.
- CI: GitHub Actions executa tudo e anexa relatório e evidência com SHA-256.

## 8. Entregas de teste

Casos de teste (data-driven), relatórios de defeito (`docs/defeitos/`), notas das sessões exploratórias (`docs/exploratorio/`),
matriz de rastreabilidade, relatório de mutação, de detecção, de instabilidade, de regressão e de evidência.

## 9. Gestão de defeitos

Ciclo: **novo → em análise → em correção → corrigido → reteste (com regressão em volta) → fechado**, ou **reaberto**.
Cada relato traz passos, resultado atual, esperado, severidade, prioridade e evidência. Severidade = tamanho do impacto; prioridade = ordem de conserto decidida com o negócio.

## 10. Limitações honestas

1. Quem planta os defeitos e quem escreve os testes é a mesma autora: 13 de 13 prova consistência, não ausência de pontos cegos.
2. As tabelas e as regras de rescisão foram validadas por analista, mas **a conferência com fonte oficial está pendente**.
3. A referência de regressão **aguarda aprovação humana**.
4. Integração, API, contrato e desempenho **não** foram executados.
5. Só Chrome e telas de computador.
