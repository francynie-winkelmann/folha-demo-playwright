# Teste de mutação (Stryker)

## O que é e por que existe

Testes que passam não provam que os testes são bons. O teste de mutação **altera o código de propósito**
(troca `>=` por `>`, remove uma validação, muda um número...) e roda os testes de novo. Cada alteração é um
**mutante**. Se algum teste falha, o mutante foi **morto** (bom: os testes perceberam). Se todos passam, o mutante
**sobreviveu** (os testes não enxergam aquela mudança).

Complementa a medição de defeitos propositais (`deteccao.md`): lá os defeitos foram escolhidos por mim; aqui a
ferramenta gera centenas de variações sem viés de autor.

- Escopo: toda a regra de negócio em `src/domain/`: `calculo.ts`, `validacao.ts`, `moeda.ts`, `datas.ts` e `rescisao.ts`.
- Testes usados: Vitest (`unitarios/`), rápidos, sem navegador. Resultado esperado vem da calculadora independente.
- Rodar: `npm run mutacao` (≈ 25 s). Relatório navegável em `reports/mutacao/index.html`.

## Resultado

| Rodada | Nota de mutação | Sobreviventes | O que mudou |
|---|---|---|---|
| 1ª (testes iniciais) | 89,23% | 28 | — |
| 2ª (após reforço, só v1) | 96,85% | 8 (todos equivalentes) | testes novos para cada lacuna real |
| 3ª (v2: + rescisão e datas) | 94,73% | 29 | arquivos novos entraram no escopo |
| 4ª (após reforço da v2) | **98,59%** | 8 (todos equivalentes, ver abaixo) | testes novos de validação e simplificações do código |

## Lacunas reais encontradas na 1ª rodada (e o teste que as fechou)

| Lacuna | Risco | Teste adicionado |
|---|---|---|
| Espaços em branco no CPF, salário, admissão e dependentes não eram verificados | Campo "vazio" aceito ou mensagem errada | Campos só com espaços contam como vazios |
| Mensagens exatas de nome mínimo/máximo e CPF inválido não eram conferidas | Usuário vê mensagem errada | Mensagens conferidas literalmente |
| CPF com resto 10 no cálculo (dígito verificador 0) nunca era exercitado | CPF válido rejeitado | CPFs `10000000108` e `10000002810` |
| CPF com **só o 1º dígito errado** não era exercitado | CPF inválido aceito | CPF `52998224733` |
| Âncoras (`^`/`$`) das validações de formato | Aceitar lixo antes/depois do CPF e da data | Entradas com texto antes/depois |
| **Zero à esquerda do mês na data de hoje** só era coberto quando o teste rodava num dia de 1 dígito | **Teste que depende do dia em que roda** (instável por natureza) | Relógio fixado (`vi.setSystemTime`) em março e em novembro |
| Empate entre dedução legal e simplificada (rótulo exibido) | Holerite exibe dedução errada | Caso de empate exato (280367 / 2 dependentes) |

## Achado da v2: Date.parse aceita 30 de fevereiro

Ao escrever a validação das datas da rescisão, ficou claro que `Date.parse('2023-02-30')` **não falha**: o navegador (V8)
aceita dia 30 de fevereiro. O cadastro da v1 usava justamente `Date.parse` para validar a admissão, então a regra
RN-CAD-04 aceitaria uma data inexistente se ela chegasse à função (a tela de data do navegador impede isso, mas o domínio
não deve depender da tela). Foi corrigido com um leitor de data que confere o calendário (`lerDataValida`) e há teste
unitário para `2023-02-30`, `2023-04-31` e `2023-02-29`.

## Simplificações feitas por causa da mutação

Dois pedaços de código da rescisão tinham mutantes sobreviventes porque eram **redundantes**: um `inicioDoAno` que não
mudava nenhum resultado (a função seguinte já limita ao primeiro dia do mês) e um `trim()` antes de `lerDataValida`
(que já devolve nulo para texto vazio). Em vez de escrever teste para código inútil, o código foi simplificado.

## Mutantes equivalentes (sobreviveram e **não** indicam falha de teste)

Um mutante é *equivalente* quando a mudança não altera nenhum resultado possível. Não adianta "caçar" um teste para
eles. Análise caso a caso:

| Local | Mutação | Por que é equivalente |
|---|---|---|
| `calculo.ts` ~76 (2 mutantes) | `salario >= limite_final` removido/trocado por `>` | Em R$ 7.350,00 a fórmula dá 0,425 centavo → arredonda para 0; acima disso a linha seguinte já devolve 0. Guarda redundante de propósito. |
| `calculo.ts` ~78 (2 mutantes) | `numerador <= 0` removido/trocado por `<` | Com `salario < limite_final` o numerador é sempre positivo; com numerador = 0 o resultado é 0 de qualquer forma. |
| `calculo.ts` ~99 | `base <= faixa` → `base < faixa` | A tabela é **contínua** nas fronteiras: o imposto é idêntico nas duas faixas (verificado por teste de consistência da tabela). |
| `validacao.ts` 25 (2 mutantes) | Âncoras do regex de dígitos repetidos | A string já foi validada com exatamente 11 dígitos; o regex só pode casar a string inteira. |
| `rescisao.ts` ~83 | `<` trocado por `<=` ao contar meses de férias | Quando a data final cai exatamente no dia do mês, a sobra de dias calculada pelo mutante é de um mês cheio e ainda conta 1 avo: o total de avos é o mesmo. |

Os pontos de **injeção de defeitos propositais** estão marcados no código com `// Stryker disable ... : motivo`
e ficam fora da nota, porque sem o defeito ligado nunca executam.

## Limites desta medição (honestidade)

- Mede só a camada de regra (`src/domain`). A tela (React) é verificada pelos testes Playwright, não por mutação.
- Nota alta não prova ausência de erros: prova que alterações pequenas no código **seriam percebidas** pelos testes.
- A regra de contagem de avos, de aniversário em 29/02 e de projeção do aviso é **convenção adotada neste projeto** (ver `regras-de-negocio.md`); os testes provam que o código segue a convenção, não que a convenção é a única possível.
- As tabelas oficiais ainda precisam de conferência humana por amostra (ver `regras-de-negocio.md`).
- O Stryker precisou de um ajuste (`tsconfigFile` apontando para arquivo inexistente) por incompatibilidade com o
  TypeScript 7; não afeta o resultado dos testes.
