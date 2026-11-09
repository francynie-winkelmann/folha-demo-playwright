# DEF-02: INSS ultrapassa o teto de contribuição em salários altos

| Campo | Valor |
|---|---|
| Módulo | Folha mensal |
| Regra de negócio | RN-INSS-02 (`docs/regras-de-negocio.md`) |
| Identificador técnico | `inss_sem_teto` |
| Severidade | **Alta**: Desconto acima do máximo legal; atinge só quem ganha acima do teto. |
| Prioridade | **Alta**: Desconto indevido do trabalhador, com risco de ação e retrabalho de guia. |
| Origem | Defeito **plantado de propósito** para demonstração (sistema fictício) |
| Ambiente | FolhaDemo local (build de preview), Chrome, fuso America/Sao_Paulo |
| Status | **Fechado (simulado)**: detectado pela suíte; correção = desligar o defeito |

## Como ligar o defeito

Na URL: `/?defeitos=inss_sem_teto` ou, nos scripts, `DEFEITOS=inss_sem_teto`.

## Passos para reproduzir

1. Abrir a aplicação com o defeito ligado.
2. Preencher o cadastro com os dados abaixo.
3. Clicar em **Calcular folha**.
4. Conferir os valores do holerite.

**Dados usados (todos fictícios)**

- Nome: Maria da Silva Exemplo (fictício)
- CPF: 529.982.247-25 (fictício)
- Admissão: 15/01/2020
- Salário bruto: R$ 15.000,00
- Dependentes: 0

## Resultado esperado x obtido

O esperado vem da calculadora independente (não da tela). A tabela mostra todos os itens do holerite.

| Item | Esperado | Obtido com o defeito |
|---|---|---|
| INSS | R$ 988,09 | R$ 1.901,51 |
| Base do IRRF | R$ 14.011,91 | R$ 13.098,49 |
| IRRF pela tabela | R$ 2.944,55 | R$ 2.693,35 |
| Redutor | R$ 0,00 | R$ 0,00 |
| IRRF retido | R$ 2.944,55 | R$ 2.693,35 |
| FGTS (empregador) | R$ 1.200,00 | R$ 1.200,00 |
| Líquido | R$ 11.067,36 | R$ 10.405,14 |

## Impacto

Desconto acima do máximo legal para salários altos.

## Evidência

Sem o defeito (comportamento correto):

![Sem o defeito](img/DEF-02-correto.png)

Com o defeito ligado:

![Com o defeito](img/DEF-02-com-defeito.png)

## Como a suíte detecta

Executando a suíte com `DEFEITOS=inss_sem_teto`, ao menos um teste falha (ver `docs/qualidade/deteccao.md`). Sem o defeito, todos passam.

## Ciclo de vida

Novo → Em análise → Em correção → Corrigido → Reteste (com regressão em volta) → **Fechado**. Por ser defeito simulado, "corrigir" é desligá-lo; o reteste é a suíte completa passar sem ele.
