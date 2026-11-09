# Regressão antes × depois (folha mensal)

> Gerado por `npm run regressao`. **Não edite à mão.**

**O que é:** a referência aprovada (*golden master*) guarda o que a folha mensal calculava na versão anterior, para centenas de
combinações de salário e dependentes. A cada nova versão, o cálculo roda de novo nas mesmas entradas e cada diferença vira um
item do relatório, que uma pessoa classifica como **esperada** (mudança pretendida e aprovada) ou **inesperada** (regressão).

## Resultado desta versão

- Referência: **v1 (entregue na Fase 2A)**, gravada em 2026-11-08. Aprovação: AGUARDANDO APROVAÇÃO HUMANA (gerada pela IA a partir do código entregue na Fase 2A).
- Combinações comparadas: **1650** (salário × dependentes, incluindo as fronteiras de todas as faixas ±1 centavo).
- Idênticas: **1650**. Com diferença: **0**.
- Diferenças esperadas (aprovadas): **0**. Inesperadas: **0**.
- **Veredito: APROVADO. A folha mensal calcula exatamente como na versão anterior.**

## Experimento controlado: a regressão percebe uma alteração escondida?

Para provar que a comparação funciona, liga-se de propósito uma alteração sutil (desligada por padrão) e roda-se a mesma comparação.

### `mensal_fgts_truncado`

- O que muda: FGTS mensal passa a truncar os centavos em vez de arredondar meio para cima.
- Risco: Diferença de 1 centavo em parte dos holerites, sem nenhuma mudança visível na tela.
- Resultado: **762 de 1650 combinações mudaram** (46.2%). Campos afetados: fgts: 762.
- Veredito da regressão com a alteração ligada: **REPROVADO, alteração detectada**.

| Salário | Dep. | Campo | Antes | Depois |
|---:|---:|---|---:|---:|
| R$ 1.149,87 | 0 | fgts | R$ 91,99 | R$ 91,98 |
| R$ 1.149,87 | 1 | fgts | R$ 91,99 | R$ 91,98 |
| R$ 1.149,87 | 2 | fgts | R$ 91,99 | R$ 91,98 |
| R$ 1.149,87 | 3 | fgts | R$ 91,99 | R$ 91,98 |
| R$ 1.149,87 | 5 | fgts | R$ 91,99 | R$ 91,98 |

## Limites desta técnica

- A referência registra o que o sistema **fazia**, não necessariamente o que está **certo**. Por isso ela só vale se a versão anterior foi validada (aqui, pelo oráculo independente e pela suíte funcional: ver `rastreabilidade.md`).
- Cobre a folha mensal (grade finita de entradas). Não cobre a rescisão, que é nova na v2 e não tem "antes".
- Mudanças aprovadas ficam registradas em `regressao/mudancas-aprovadas.json`, com motivo e responsável; nova referência só é gravada com `--aprovar`.
