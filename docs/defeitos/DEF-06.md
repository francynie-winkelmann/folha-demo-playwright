# DEF-06: Redutor da Lei 15.270/2025 não é aplicado ao IRRF

| Campo | Valor |
|---|---|
| Módulo | Folha mensal |
| Regra de negócio | RN-IRRF-03 (`docs/regras-de-negocio.md`) |
| Identificador técnico | `irrf_sem_reducao` |
| Severidade | **Alta**: Retenção de imposto indevida para quem ganha até R$ 7.350,00. |
| Prioridade | **Alta**: Descumpre lei vigente e atinge a maior parte dos salários. |
| Origem | Defeito **plantado de propósito** para demonstração (sistema fictício) |
| Ambiente | FolhaDemo local (build de preview), Chrome, fuso America/Sao_Paulo |
| Status | **Fechado (simulado)**: detectado pela suíte; correção = desligar o defeito |

## Como ligar o defeito

Na URL: `/?defeitos=irrf_sem_reducao` ou, nos scripts, `DEFEITOS=irrf_sem_reducao`.

## Passos para reproduzir

1. Abrir a aplicação com o defeito ligado.
2. Preencher o cadastro com os dados abaixo.
3. Clicar em **Calcular folha**.
4. Conferir os valores do holerite.

**Dados usados (todos fictícios)**

- Nome: Maria da Silva Exemplo (fictício)
- CPF: 529.982.247-25 (fictício)
- Admissão: 15/01/2020
- Salário bruto: R$ 6.000,00
- Dependentes: 0

## Resultado esperado x obtido

O esperado vem da calculadora independente (não da tela). A tabela mostra todos os itens do holerite.

| Item | Esperado | Obtido com o defeito |
|---|---|---|
| INSS | R$ 641,51 | R$ 641,51 |
| Base do IRRF | R$ 5.358,49 | R$ 5.358,49 |
| IRRF pela tabela | R$ 564,85 | R$ 564,85 |
| Redutor | R$ 179,75 | R$ 0,00 |
| IRRF retido | R$ 385,10 | R$ 564,85 |
| FGTS (empregador) | R$ 480,00 | R$ 480,00 |
| Líquido | R$ 4.973,39 | R$ 4.793,64 |

## Impacto

Retenção indevida para quem ganha até R$ 7.350.

## Evidência

Sem o defeito (comportamento correto):

![Sem o defeito](img/DEF-06-correto.png)

Com o defeito ligado:

![Com o defeito](img/DEF-06-com-defeito.png)

## Como a suíte detecta

Executando a suíte com `DEFEITOS=irrf_sem_reducao`, ao menos um teste falha (ver `docs/qualidade/deteccao.md`). Sem o defeito, todos passam.

## Ciclo de vida

Novo → Em análise → Em correção → Corrigido → Reteste (com regressão em volta) → **Fechado**. Por ser defeito simulado, "corrigir" é desligá-lo; o reteste é a suíte completa passar sem ele.
