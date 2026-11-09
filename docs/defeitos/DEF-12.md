# DEF-12: INSS incide sobre o aviso prévio indenizado

| Campo | Valor |
|---|---|
| Módulo | Rescisão |
| Regra de negócio | RN-RES-08 (`docs/regras-de-negocio.md`) |
| Identificador técnico | `res_inss_sobre_aviso` |
| Severidade | **Alta**: Desconto indevido sobre verba indenizatória, com valor alto. |
| Prioridade | **Alta**: Reduz o líquido do trabalhador por um desconto que a lei não prevê. |
| Origem | Defeito **plantado de propósito** para demonstração (sistema fictício) |
| Ambiente | FolhaDemo local (build de preview), Chrome, fuso America/Sao_Paulo |
| Status | **Fechado (simulado)**: detectado pela suíte; correção = desligar o defeito |

## Como ligar o defeito

Na URL: `/?defeitos=res_inss_sobre_aviso` ou, nos scripts, `DEFEITOS=res_inss_sobre_aviso`.

## Passos para reproduzir

1. Abrir a aplicação com o defeito ligado e ir para a aba **Rescisão**.
2. Preencher o formulário com os dados abaixo.
3. Clicar em **Calcular rescisão**.
4. Conferir os itens do termo de rescisão.

**Dados usados (todos fictícios)**

- Tipo: Dispensa sem justa causa
- Salário bruto: R$ 3.000,00
- Dependentes: 0
- Admissão: 10/01/2020
- Desligamento (último dia trabalhado): 20/08/2025
- Saldo do FGTS: R$ 10.000,00
- Férias vencidas: não
- Aviso prévio cumprido: não

## Resultado esperado x obtido

O esperado vem da calculadora independente (não da tela). A tabela mostra só os itens que divergem.

| Item | Esperado | Obtido com o defeito |
|---|---|---|
| INSS sobre o saldo | R$ 155,69 | R$ 711,51 |
| Total de descontos | R$ 333,88 | R$ 889,70 |
| Líquido | R$ 11.416,12 | R$ 10.860,30 |

## Impacto

Desconto de INSS sobre verba indenizatória, que não sofre contribuição.

## Evidência

Sem o defeito (comportamento correto):

![Sem o defeito](img/DEF-12-correto.png)

Com o defeito ligado:

![Com o defeito](img/DEF-12-com-defeito.png)

## Como a suíte detecta

Executando a suíte com `DEFEITOS=res_inss_sobre_aviso`, ao menos um teste falha (ver `docs/qualidade/deteccao.md`). Sem o defeito, todos passam.

## Ciclo de vida

Novo → Em análise → Em correção → Corrigido → Reteste (com regressão em volta) → **Fechado**. Por ser defeito simulado, "corrigir" é desligá-lo; o reteste é a suíte completa passar sem ele.
