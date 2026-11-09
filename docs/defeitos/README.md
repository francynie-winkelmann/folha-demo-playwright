# Relatos de defeito

> Gerado por `npm run defeitos:relatar`. **Não edite à mão**: severidade e prioridade ficam em `scripts/gerar-relatos-defeitos.ts`.

São 13 defeitos **plantados de propósito**. Cada relato traz passos, dados, esperado x obtido (esperado vindo da calculadora independente), impacto e dois prints reais: sem e com o defeito.

**Severidade** é o tamanho do estrago; **prioridade** é a ordem de conserto. Os dois julgamentos são humanos e estão justificados em cada relato.

| ID | Título | Módulo | Severidade | Prioridade | Regra |
|---|---|---|---|---|---|
| [DEF-01](DEF-01.md) | INSS calculado sobre o salário inteiro com a alíquota da última faixa | Folha mensal | Crítica | Alta | RN-INSS-01 |
| [DEF-02](DEF-02.md) | INSS ultrapassa o teto de contribuição em salários altos | Folha mensal | Alta | Alta | RN-INSS-02 |
| [DEF-03](DEF-03.md) | INSS arredonda cada faixa antes de somar e gera 1 centavo de diferença | Folha mensal | Média | Média | RN-ARR-01 |
| [DEF-04](DEF-04.md) | Base do IRRF não desconta o INSS | Folha mensal | Alta | Alta | RN-IRRF-01 |
| [DEF-05](DEF-05.md) | Dedução por dependente aplicada apenas ao primeiro dependente | Folha mensal | Alta | Alta | RN-IRRF-01 |
| [DEF-06](DEF-06.md) | Redutor da Lei 15.270/2025 não é aplicado ao IRRF | Folha mensal | Alta | Alta | RN-IRRF-03 |
| [DEF-07](DEF-07.md) | Cadastro aceita salário zero | Cadastro | Média | Média | RN-CAD-03 |
| [DEF-08](DEF-08.md) | Cadastro não confere os dígitos verificadores do CPF | Cadastro | Média | Média | RN-CAD-02 |
| [DEF-09](DEF-09.md) | Multa de 40% do FGTS calculada no pedido de demissão | Rescisão | Crítica | Alta | RN-RES-09 |
| [DEF-10](DEF-10.md) | Aviso prévio fixo em 30 dias, sem os 3 dias por ano de serviço | Rescisão | Alta | Alta | RN-RES-02 |
| [DEF-11](DEF-11.md) | Avos de férias e 13º ignoram a projeção do aviso prévio | Rescisão | Alta | Alta | RN-RES-03 |
| [DEF-12](DEF-12.md) | INSS incide sobre o aviso prévio indenizado | Rescisão | Alta | Alta | RN-RES-08 |
| [DEF-13](DEF-13.md) | Mês conta como avo mesmo com menos de 15 dias | Rescisão | Média | Média | RN-RES-04 |
