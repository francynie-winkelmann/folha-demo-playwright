# Regras de negócio do FolhaDemo

> Aplicação **fictícia**, criada só para demonstrar testes. Não representa o sistema de nenhuma empresa.
> As regras abaixo são a **fonte do resultado esperado** dos testes. Os testes não leem o resultado da tela.

Vigência das tabelas: **janeiro/2026**. Valores monetários em reais; o código trabalha em centavos.

## Como estas regras foram levantadas

| Item | Fonte |
|---|---|
| Tabela do INSS do empregado (4 faixas, teto de R$ 8.475,55) | Portaria Interministerial MPS/MF nº 13, de 9 de janeiro de 2026 |
| Tabela progressiva mensal do IRRF e dedução por dependente (R$ 189,59) | Tabela mensal vigente da Receita Federal |
| Desconto simplificado mensal (R$ 607,20) | Receita Federal (25% do limite da faixa isenta, R$ 2.428,80) |
| Redutor do IRRF (isenção até R$ 5.000,00 e redução até R$ 7.350,00) | Lei nº 15.270/2025 e orientação da Receita Federal às fontes pagadoras para 2026 |
| FGTS de 8% | Lei nº 8.036/1990, art. 15 |

**Estado da conferência:** as tabelas foram transcritas a partir de páginas de consulta que reproduzem as fontes
acima e foram checadas por consistência interna (continuidade entre faixas) e contra os exemplos numéricos
publicados pela Receita Federal. **Não foram conferidas diretamente nos documentos oficiais.** Essa conferência
humana é obrigatória antes de qualquer uso além da demonstração (ver `tests/oraculo/casos-calculo.json`,
campos `amostra_conferencia`, `conferido_por` e `conferido_em`).

## Cadastro

| ID | Regra |
|---|---|
| RN-CAD-01 | Nome obrigatório, de 3 a 100 caracteres (espaços nas pontas não contam). |
| RN-CAD-02 | CPF obrigatório, com 11 dígitos (com ou sem máscara `000.000.000-00`), dígitos verificadores válidos e não todos iguais. |
| RN-CAD-03 | Salário obrigatório, maior que zero, no máximo R$ 999.999,99, com até 2 casas decimais. |
| RN-CAD-04 | Data de admissão obrigatória, entre 01/01/1900 e a data de hoje. |
| RN-CAD-05 | Dependentes obrigatório, inteiro de 0 a 10. |
| RN-CAD-06 | Havendo qualquer erro, nenhum holerite é gerado e cada campo inválido mostra sua mensagem. |

## Cálculo da folha mensal

| ID | Regra |
|---|---|
| RN-INSS-01 | INSS **progressivo**: cada alíquota incide só sobre a parte do salário dentro da faixa: 7,5% até R$ 1.621,00; 9% até R$ 2.902,84; 12% até R$ 4.354,27; 14% até o teto. |
| RN-INSS-02 | Salário acima do teto (R$ 8.475,55) contribui como se fosse o teto: INSS máximo de **R$ 988,09**. |
| RN-INSS-03 | O INSS não depende do número de dependentes. |
| RN-IRRF-01 | Base do IRRF = salário − INSS − (dependentes × R$ 189,59). Imposto = base × alíquota − parcela a deduzir (tabela progressiva mensal). |
| RN-IRRF-02 | Se o **desconto simplificado** (R$ 607,20) for maior que INSS + dependentes, ele é usado no lugar. |
| RN-IRRF-03 | **Redutor (Lei 15.270/2025)**, calculado sobre o salário bruto e limitado ao imposto da tabela: até R$ 5.000,00, redução de até R$ 312,89; de R$ 5.000,01 a R$ 7.350,00, redução = R$ 978,62 − 0,133145 × salário; acima de R$ 7.350,00, sem redução. IRRF retido = imposto − redução (mínimo zero). |
| RN-ARR-01 | Arredondamento **meio para cima, uma única vez** por valor. O INSS soma as faixas com precisão total e só arredonda o resultado. |
| RN-FGTS-01 | FGTS = 8% do salário. É depósito do empregador: **não** é descontado do salário líquido (testado em RN-HOL-03). |
| RN-LIQ-01 | Líquido = salário − INSS − IRRF retido. |

## Holerite (tela)

| ID | Regra |
|---|---|
| RN-HOL-01 | O holerite mostra o nome e o CPF do funcionário informado. |
| RN-HOL-02 | Valores monetários aparecem em reais, no formato brasileiro (`R$ 1.621,00`), e o valor exibido corresponde ao calculado. |
| RN-HOL-03 | FGTS é exibido como informação do empregador e **não** reduz o líquido. |
| RN-HOL-04 | Ao recalcular com novos dados, o holerite exibido é o do último cálculo. |
| RN-HOL-05 | Se o novo cadastro tiver erro, nenhum holerite antigo permanece na tela. |
| RN-PROP-01 | Para qualquer salário: líquido = bruto − INSS − IRRF, INSS ≤ teto e IRRF ≥ 0 (propriedade, verificada sobre vários salários). |

## Confiabilidade do resultado esperado (regras de qualidade dos próprios testes)

| ID | Regra |
|---|---|
| RN-ORA-01 | A tabela de casos em arquivo coincide com a calculadora independente. |
| RN-ORA-02 | As duas transcrições das tabelas (aplicação e testes) são idênticas. |
| RN-ORA-03 | A calculadora independente reproduz os exemplos numéricos publicados pela Receita Federal (redutor do IRRF). |
| RN-ORA-04 | A calculadora independente dá INSS máximo de R$ 988,09 no teto e nunca decrescente com o salário. |
| RN-ORA-05 | O relatório informa quantos casos da amostra ainda aguardam conferência humana com a fonte oficial. |

## Rescisão (v2): dispensa sem justa causa e pedido de demissão

> Regras propostas pela IA e **corrigidas e validadas pela analista de folha** em 08/11/2026 (ela ajustou o redutor no 13º
> e a contagem do aviso prévio). A conferência nas **fontes oficiais** (CLT e leis citadas) continua pendente.

| ID | Regra |
|---|---|
| RN-RES-01 | **Saldo de salário** = salário ÷ 30 × dias do mês até o desligamento (mês comercial de 30 dias; dia 31 conta como 30). |
| RN-RES-02 | **Aviso prévio indenizado** (só na dispensa sem justa causa): 30 dias + 3 por ano completo de serviço, máximo de 90. Se a data projetada pelo aviso completar **mais um ano** de serviço, somam-se mais 3 dias (ainda limitado a 90). Valor = salário ÷ 30 × dias. |
| RN-RES-03 | O aviso indenizado conta como tempo de serviço: a **data projetada** (desligamento + dias de aviso) vale para os avos de férias e de 13º. |
| RN-RES-04 | **Avos**: cada mês com 15 dias ou mais de vínculo conta 1/12. 13º: meses do ano da data projetada (no ano da admissão, a partir dela). Férias: meses desde o último aniversário de admissão, máximo de 12. Quem entrou em 29/02 faz aniversário em 01/03 nos anos não bissextos. |
| RN-RES-05 | **Férias vencidas** (1 período não gozado): 1 salário + 1/3 do salário. |
| RN-RES-06 | **Férias proporcionais** = salário × avos ÷ 12, mais 1/3 (salário × avos ÷ 36). |
| RN-RES-07 | **13º proporcional** = salário × avos ÷ 12. |
| RN-RES-08 | **INSS e IRRF** incidem apenas sobre saldo de salário e 13º proporcional, **cada um calculado em separado** (tabela do INSS, dedução por dependente ou simplificada e redutor da Lei 15.270/2025 aplicados a cada rendimento bruto). Aviso indenizado, férias vencidas, férias proporcionais e seus terços **não** sofrem INSS nem IRRF. *(Redutor no 13º: orientação e validação da analista; fonte oficial ainda a conferir.)* |
| RN-RES-09 | **FGTS rescisório** = 8% de (saldo de salário + 13º + aviso indenizado). **Multa de 40%** sobre (saldo do FGTS informado + FGTS rescisório) **somente** na dispensa sem justa causa. FGTS e multa são depositados na conta do trabalhador: **não entram no líquido**. |
| RN-RES-10 | **Pedido de demissão**: não há aviso indenizado nem multa. Se o aviso **não foi cumprido**, desconta-se 30 dias de salário (1 salário) do líquido. |
| RN-RES-11 | **Líquido** = soma das verbas (saldo, aviso, férias vencidas e terço, férias proporcionais e terço, 13º) − INSS − IRRF − desconto de aviso. Pode ser negativo (saldo devedor do trabalhador). |
| RN-RES-12 | **Arredondamento**: meio para cima, uma única vez por verba, sempre a partir do salário (nunca sobre valor já arredondado). |
| RN-RES-13 | **Limite conhecido do 13º**: os avos de 13º contam só o ano da data projetada; o 13º do ano anterior é assumido como já pago e não é recalculado. Fixado por um teste (`tests/rescisao/limite-conhecido.spec.ts`): salário R$ 3.000,00, admissão 10/01/2020, desligamento 20/11/2025 resulta em 13º R$ 0,00; se o 13º de 2025 não tivesse sido pago, faltariam R$ 3.000,00. |
| RN-RESV-01 | O tipo de desligamento é obrigatório. |
| RN-RESV-02 | Admissão e desligamento são datas reais de calendário entre 01/01/1900 e 31/12/2100; o desligamento não pode ser anterior à admissão. Salário e dependentes seguem RN-CAD-03 e RN-CAD-05. |
| RN-RESV-03 | Saldo do FGTS obrigatório, de R$ 0,00 a R$ 999.999,99. |

**Fora do escopo da rescisão (limites declarados):** aviso prévio trabalhado, justa causa, acordo (art. 484-A da CLT),
médias de horas extras e variáveis, estabilidades, pensão alimentícia, mais de um período de férias vencido, salário
variável e verbas de convenção coletiva.

**Atenção (limite conhecido, a validar):** os avos de 13º são contados só no ano da **data projetada**. Se o aviso prévio
indenizado atravessar a virada do ano (por exemplo, desligamento em dezembro e projeção em janeiro), o 13º do ano anterior
é **assumido como já pago** e não é recalculado. Um caso real desse tipo precisa de revisão humana.

## Pontos de atenção e decisões

1. **Arredondamento do INSS.** Há exemplos publicados que arredondam o valor de cada faixa antes de somar, o que pode
   diferir em 1 centavo do resultado arredondado no total. Este projeto adota o arredondamento **no total**
   (RN-ARR-01). O defeito plantado `arredondamento_antecipado` reproduz a outra abordagem para mostrar o efeito.
   Em um sistema real, a regra de arredondamento precisa ser definida pelo negócio e documentada.
2. **Teto de desconto do INSS.** Fontes consultadas divergem entre R$ 988,09 e R$ 988,07. O cálculo pelas faixas de
   2026 resulta em R$ 988,09, valor adotado.
3. **Empate entre deduções.** Se INSS + dependentes for exatamente igual ao desconto simplificado, o valor da base é o mesmo e o holerite informa "legal" (o simplificado só é escolhido quando é estritamente maior). Coberto por teste unitário.
4. **Redutor.** A fórmula usa o rendimento bruto, e não a base de cálculo, conforme exemplos da Receita Federal
   (ex.: R$ 6.000,00 → redução de R$ 179,75).

## O que este projeto **não** testa (limites declarados)

Férias e 13º do mês corrente (fora da rescisão), horas extras, adicional noturno, DSR, faltas, pensão alimentícia,
previdência privada, mais de uma competência, histórico de tabelas de outros anos, persistência de dados, desempenho,
acessibilidade completa, outros navegadores além do Chromium e telas de celular.
