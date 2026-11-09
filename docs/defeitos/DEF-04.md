# DEF-04: Base do IRRF não desconta o INSS

| Campo | Valor |
|---|---|
| Módulo | Folha mensal |
| Regra de negócio | RN-IRRF-01 (`docs/regras-de-negocio.md`) |
| Identificador técnico | `irrf_base_sem_inss` |
| Severidade | **Alta**: Imposto retido maior que o devido para salários acima da faixa do redutor. |
| Prioridade | **Alta**: Retenção indevida recorrente e visível no holerite. |
| Origem | Defeito **plantado de propósito** para demonstração (sistema fictício) |
| Ambiente | FolhaDemo local (build de preview), Chrome, fuso America/Sao_Paulo |
| Status | **Fechado (simulado)**: detectado pela suíte; correção = desligar o defeito |

## Como ligar o defeito

Na URL: `/?defeitos=irrf_base_sem_inss` ou, nos scripts, `DEFEITOS=irrf_base_sem_inss`.

## Passos para reproduzir

1. Abrir a aplicação com o defeito ligado.
2. Preencher o cadastro com os dados abaixo.
3. Clicar em **Calcular folha**.
4. Conferir os valores do holerite.

**Dados usados (todos fictícios)**

- Nome: Maria da Silva Exemplo (fictício)
- CPF: 529.982.247-25 (fictício)
- Admissão: 15/01/2020
- Salário bruto: R$ 8.000,00
- Dependentes: 0

## Resultado esperado x obtido

O esperado vem da calculadora independente (não da tela). A tabela mostra todos os itens do holerite.

| Item | Esperado | Obtido com o defeito |
|---|---|---|
| INSS | R$ 921,51 | R$ 921,51 |
| Base do IRRF | R$ 7.078,49 | R$ 7.392,80 |
| IRRF pela tabela | R$ 1.037,85 | R$ 1.124,29 |
| Redutor | R$ 0,00 | R$ 0,00 |
| IRRF retido | R$ 1.037,85 | R$ 1.124,29 |
| FGTS (empregador) | R$ 640,00 | R$ 640,00 |
| Líquido | R$ 6.040,64 | R$ 5.954,20 |

## Impacto

Imposto retido maior que o devido.

## Evidência

Sem o defeito (comportamento correto):

![Sem o defeito](img/DEF-04-correto.png)

Com o defeito ligado:

![Com o defeito](img/DEF-04-com-defeito.png)

## Como a suíte detecta

Executando a suíte com `DEFEITOS=irrf_base_sem_inss`, ao menos um teste falha (ver `docs/qualidade/deteccao.md`). Sem o defeito, todos passam.

## Ciclo de vida

Novo → Em análise → Em correção → Corrigido → Reteste (com regressão em volta) → **Fechado**. Por ser defeito simulado, "corrigir" é desligá-lo; o reteste é a suíte completa passar sem ele.
