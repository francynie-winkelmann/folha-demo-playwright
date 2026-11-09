# Sessão exploratória 3 (para a Fran executar): folha mensal com entradas fora do padrão

> Esta sessão é **sua**. O roteiro abaixo é um ponto de partida; o valor está no que você notar fora dele.

| Campo | Valor |
|---|---|
| Charter (missão) | Explorar o cadastro e o cálculo da folha mensal com entradas fora do padrão, para descobrir validações frágeis, mensagens confusas e cálculos inesperados |
| Tempo sugerido | 45 minutos (marque o início e o fim) |
| Executada por | Fran |
| Como abrir | `npm run dev` e abrir o endereço mostrado (ou a demo publicada), **sem** defeitos ligados |
| Regras para consultar | `docs/regras-de-negocio.md`: RN-CAD-01 a 06, RN-INSS, RN-IRRF, RN-HOL |

## Ideias por campo (marque o que testou)

**Nome** (3 a 100 caracteres, espaços nas pontas não contam)
- [ ] 2 letras; 3 letras; 100 letras; 101 letras
- [ ] só espaços; espaços antes e depois; acentos (José, Conceição); apóstrofo (D'Ávila); emoji; números
- [ ] colar um nome muito longo

**CPF** (11 dígitos com ou sem máscara; dígitos verificadores)
- [ ] com e sem pontos e traço; com letras; 10 e 12 dígitos
- [ ] 111.111.111-11 e 000.000.000-00 (todos iguais): a tela recusa? O que diz a regra?
- [ ] o CPF fictício válido do projeto com o último dígito trocado

**Salário** (maior que zero, até 999.999,99, até 2 casas)
- [ ] `3000,00`; `3000.00`; `3.000,00`; `3000`; `3000,5`; `3000,555`
- [ ] `0`; `0,01`; `-100`; `abc`; `1e5`; `999999,99`; `1000000,00`; espaços ao redor
- [ ] colar valor com "R$ " na frente

**Data de admissão** (01/01/1900 até hoje)
- [ ] hoje; amanhã; 01/01/1900; 31/12/1899; 29/02 de ano bissexto e não bissexto
- [ ] apagar a data depois de preencher

**Dependentes** (inteiro de 0 a 10)
- [ ] `-1`; `0`; `10`; `11`; `1,5`; `abc`; vazio

**Fluxo**
- [ ] clicar em "Calcular folha" duas vezes seguidas
- [ ] calcular, depois mudar só o salário e calcular de novo: o holerite é o do último cálculo? (RN-HOL-04)
- [ ] calcular com dados válidos e depois enviar com erro: o holerite antigo some? (RN-HOL-05)
- [ ] ir para a aba Rescisão e voltar: os dados do formulário foram mantidos? Isso é o esperado?
- [ ] diminuir a janela do navegador até ficar do tamanho de um celular

**O que observar além de "funcionou ou não"**
- a mensagem de erro ajuda quem digitou? Está no campo certo?
- o valor mostrado no holerite é o que você esperaria como analista de folha?
- algo na tela parece estranho mesmo que a regra não diga nada?

## Modelo de anotação (copie uma linha por achado)

| Hora | O que fiz (entrada exata) | O que esperava | O que vi | Dúvida ou defeito? | Print |
|---|---|---|---|---|---|
| | | | | | |

## Ao final, responda em 3 linhas

1. Qual foi a coisa mais surpreendente?
2. Algum achado merece virar relato de defeito (`docs/defeitos/`)?
3. Alguma regra de negócio ficou ambígua?

> Depois de preencher, me envie as anotações e eu transformo os achados em relatos de defeito e em novos testes, se fizer sentido.
