# Taxa de detecção de defeitos plantados

Gerado em 2026-11-08T03:59:16.169Z (modo rapido).

- Rodada de referência (sem defeitos): **134 passaram, 0 falharam, 0 instáveis** (ok)
- Defeitos plantados: **13**; detectados: **13**; taxa de detecção: **100%**

| Defeito | Risco | Detectado? | Testes que falharam | Exemplo |
|---|---|---|---|---|
| `inss_sem_progressividade` | Desconto de INSS maior que o devido para quase todos os salários | Sim | n/d | [RN-INSS-01] c02: Salário 1 centavo acima do limite da 1ª faixa |
| `inss_sem_teto` | Desconto acima do máximo legal para salários altos | Sim | n/d | [RN-INSS-02] c09: Salário bem acima do teto (R$ 15.000,00) |
| `arredondamento_antecipado` | Diferença de centavos que se acumula na folha e na guia | Sim | n/d | [RN-INSS-01] c03: Salário exatamente no limite da 2ª faixa |
| `irrf_base_sem_inss` | Imposto retido maior que o devido | Sim | n/d | [RN-INSS-02] c07: Salário exatamente no teto do INSS |
| `irrf_dependente_so_primeiro` | Imposto errado para quem tem 2 ou mais dependentes | Sim | n/d | [RN-IRRF-01] c11: INSS + 2 dependentes (R$ 3.000,00) |
| `irrf_sem_reducao` | Retenção indevida para quem ganha até R$ 7.350 | Sim | n/d | [RN-INSS-01] c05: Salário exatamente no limite da 3ª faixa |
| `cadastro_salario_invalido` | Dado inválido entrando no cálculo da folha | Sim | n/d | [RN-CAD-03] salário zero |
| `cpf_sem_digito_verificador` | Funcionário cadastrado com documento inválido | Sim | n/d | [RN-CAD-02] CPF com dígito verificador errado |
| `res_multa_em_pedido_demissao` | Pagamento indevido de multa que só existe na dispensa sem justa causa | Sim | n/d | [RN-RES-04] r10: Pedido de demissão: exatamente 15 dias no mês conta como avo |
| `res_aviso_sem_3_dias_por_ano` | Aviso prévio pago a menos para quem tem mais de 1 ano de casa | Sim | n/d | [RN-RES-01] r01: Desligamento no dia 31: o mês comercial conta 30 dias |
| `res_sem_projecao_aviso` | Férias proporcionais e 13º pagos a menos | Sim | n/d | [RN-RES-01] r01: Desligamento no dia 31: o mês comercial conta 30 dias |
| `res_inss_sobre_aviso` | Desconto de INSS sobre verba indenizatória, que não sofre contribuição | Sim | n/d | [RN-RES-01] r01: Desligamento no dia 31: o mês comercial conta 30 dias |
| `res_avos_qualquer_dia` | Férias proporcionais e 13º pagos a mais | Sim | n/d | [RN-RES-01] r01: Desligamento no dia 31: o mês comercial conta 30 dias |

## Alterações escondidas (fora da taxa de detecção)

Mudanças sutis, ligadas só neste experimento, usadas para comparar a suíte de tela com a regressão antes × depois (`regressao.md`).

| Alteração | Percebida pela suíte de tela? | Testes que falharam |
|---|---|---|
| `mensal_fgts_truncado`: FGTS mensal passa a truncar os centavos em vez de arredondar meio para cima | Sim | n/d |
