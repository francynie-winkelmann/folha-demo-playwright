# DEF-07: Cadastro aceita salário zero

| Campo | Valor |
|---|---|
| Módulo | Cadastro |
| Regra de negócio | RN-CAD-03 (`docs/regras-de-negocio.md`) |
| Identificador técnico | `cadastro_salario_invalido` |
| Severidade | **Média**: Dado inválido entra no cálculo, mas o valor financeiro é zero. |
| Prioridade | **Média**: Pode gerar holerite vazio e mascarar erro de digitação. |
| Origem | Defeito **plantado de propósito** para demonstração (sistema fictício) |
| Ambiente | FolhaDemo local (build de preview), Chrome, fuso America/Sao_Paulo |
| Status | **Fechado (simulado)**: detectado pela suíte; correção = desligar o defeito |

## Como ligar o defeito

Na URL: `/?defeitos=cadastro_salario_invalido` ou, nos scripts, `DEFEITOS=cadastro_salario_invalido`.

## Passos para reproduzir

1. Abrir a aplicação com o defeito ligado.
2. Preencher o cadastro com o valor inválido de **Salário bruto (R$)** e os demais campos válidos.
3. Clicar em **Calcular folha**.
4. Observar se o cadastro foi recusado.

**Dados usados (todos fictícios)**

- Salário bruto (R$): 0,00
- Demais campos: dados fictícios válidos

## Resultado esperado x obtido

O esperado vem da calculadora independente (não da tela). 

| Item | Esperado | Obtido com o defeito |
|---|---|---|
| Resultado do cadastro inválido | Recusado com mensagem de erro (1 aviso) | Aceito: holerite gerado |

## Impacto

Dado inválido entrando no cálculo da folha.

## Evidência

Sem o defeito (comportamento correto):

![Sem o defeito](img/DEF-07-correto.png)

Com o defeito ligado:

![Com o defeito](img/DEF-07-com-defeito.png)

## Como a suíte detecta

Executando a suíte com `DEFEITOS=cadastro_salario_invalido`, ao menos um teste falha (ver `docs/qualidade/deteccao.md`). Sem o defeito, todos passam.

## Ciclo de vida

Novo → Em análise → Em correção → Corrigido → Reteste (com regressão em volta) → **Fechado**. Por ser defeito simulado, "corrigir" é desligá-lo; o reteste é a suíte completa passar sem ele.
