# language: pt
# Cenários de BDD da rescisão. Escritos em linguagem de negócio, para qualquer pessoa de folha entender.
# Os valores esperados vêm de tests/oraculo/casos-rescisao.json (caso indicado em cada cenário),
# gerado pela calculadora independente. Eles NÃO foram copiados da tela.

@rescisao
Funcionalidade: Rescisão do contrato de trabalho
  Para pagar corretamente quem sai da empresa
  A equipe de folha precisa que o termo de rescisão siga as regras de aviso prévio, multa do FGTS e descontos

  Contexto:
    Dado um funcionário com salário de "R$ 3.000,00" e nenhum dependente

  @RN-RES-02
  Cenário: Aviso prévio soma 3 dias por ano de casa e mais 3 se a projeção completar um ano (caso r05)
    Dado que ele foi admitido em "10/07/2022"
    E foi dispensado sem justa causa em "01/07/2025"
    Quando a rescisão é calculada
    Então o aviso prévio indenizado é de 39 dias
    E o valor do aviso prévio indenizado é "R$ 3.900,00"

  @RN-RES-09
  Cenário: Dispensa sem justa causa paga a multa de 40% do FGTS (caso r23)
    Dado que ele foi admitido em "10/03/2024"
    E foi dispensado sem justa causa em "20/08/2025"
    E o saldo do FGTS é "R$ 25.000,00"
    Quando a rescisão é calculada
    Então a multa de 40% do FGTS é "R$ 10.241,60"

  @RN-RES-09
  Cenário: Pedido de demissão não paga multa do FGTS (caso r24)
    Dado que ele foi admitido em "10/03/2024"
    E pediu demissão em "20/08/2025"
    E o saldo do FGTS é "R$ 25.000,00"
    Quando a rescisão é calculada
    Então a multa de 40% do FGTS é "R$ 0,00"
    E não há aviso prévio indenizado

  @RN-RES-10
  Cenário: Pedido de demissão sem cumprir o aviso desconta um salário (caso r26)
    Dado que ele foi admitido em "10/03/2024"
    E pediu demissão em "20/08/2025" sem cumprir o aviso prévio
    Quando a rescisão é calculada
    Então o desconto de aviso prévio é "R$ 3.000,00"

  @RN-RES-04
  Esquema do Cenário: Só conta como avo de 13º o mês com 15 dias ou mais (casos r10 e r11)
    Dado que ele foi admitido em "02/01/2024"
    E pediu demissão em "<desligamento>"
    Quando a rescisão é calculada
    Então ele recebe <avos> avos de 13º salário

    Exemplos:
      | desligamento | avos |
      | 15/05/2025   | 5    |
      | 14/05/2025   | 4    |

  @RN-RES-11
  Cenário: Quando os descontos superam as verbas, aparece o saldo devedor (caso r27)
    Dado que ele foi admitido em "02/01/2025"
    E pediu demissão em "05/02/2025" sem cumprir o aviso prévio
    Quando a rescisão é calculada
    Então o termo informa saldo devedor
