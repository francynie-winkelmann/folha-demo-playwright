# Sessão exploratória 1: limites de datas na rescisão (incluindo a virada de ano)

| Campo | Valor |
|---|---|
| Charter (missão) | Explorar o módulo de rescisão com datas de fronteira (29/02, dia 31, 31/12, 01/01, limites 1900 e 2100, vínculos longos) para descobrir cálculos ou mensagens que pareçam errados |
| Executada por | IA (Claude), dirigindo o navegador com um script Playwright; **revisão humana pendente** |
| Data | 08/11/2026 |
| Ambiente | FolhaDemo local (build de preview), Chrome, sem defeitos ligados |
| Duração | 22 sondagens digitadas na tela, comparadas à calculadora independente (execução automatizada de poucos segundos; a análise veio depois) |
| Evidência bruta | `docs/exploratorio/saida-sessao-1.txt`; script `scripts/exploratorio-rescisao.ts` |

## Resumo

- 17 sondagens deram resultado **igual ao da calculadora independente**.
- 5 foram **recusadas** pela tela com mensagem (S02, S17, S18, S19, S20).
- Nenhuma divergência de cálculo. Duas descobertas importantes, abaixo.
- Limite desta conclusão: a calculadora independente foi escrita pela mesma autora do sistema. "Igual ao oráculo" prova consistência, não que a lei foi seguida.

## Descobertas

| # | O que foi visto | Severidade sugerida | Ação sugerida |
|---|---|---|---|
| D1 | **13º do ano corrente fica de fora quando o aviso projetado cruza a virada do ano.** Em S05 (31/12), S07 (20/12) e S08 (10/12), a tela mostra "13º salário proporcional" de R$ 500,00 / R$ 250,00 / R$ 250,00, só com os avos de janeiro e fevereiro do ano seguinte, sem nenhum aviso. Quem é desligado em dezembro normalmente ainda tem o 13º do ano em aberto. | Média (limite conhecido, RN-RES-13), mas **mais provável de acontecer do que o texto do limite sugere** | Rever a decisão "só documentar". A opção A (aviso na tela) custa pouco e evita valor aparentemente completo. A decisão é da analista. |
| D2 | **Mensagem enganosa para data inexistente.** Digitar 29/02/1900 ou 29/02/2100 (anos não bissextos) deixa o campo vazio no navegador, e a tela diz "Informe a data de admissão", como se nada tivesse sido digitado (S17, S18). Já 01/01/2101 e 31/12/1899 dão "Data inválida" (S19, S20). | Baixa | Trocar por "Data inexistente ou em branco" ou tratar o campo vazio de forma diferente. |

## Confirmações úteis (não são defeitos)

- Aniversário de quem entrou em 29/02: 28/02 do ano comum não completa o ano, 01/03 completa (S03, S04). Com ano 2000 (bissexto por regra dos 400 anos) funciona (S21).
- Vínculo muito longo respeita o teto de 90 dias de aviso (S12, S14) e a projeção que completa mais um ano soma os 3 dias antes do teto (S13).
- Dia 31 conta como 30 dias no saldo de salário (S11).
- Pedido de demissão sem aviso cumprido gera **líquido negativo** (S16: R$ -1.155,69), previsto na regra RN-RES-11.
- Limites 01/01/1900 (S14) e 31/12/2100 (S15) aceitos.

## O que **não** foi explorado

Aviso trabalhado, justa causa e acordo (fora do escopo); férias vencidas combinadas com virada de ano; leitura por tecnologia assistiva; fusos diferentes do de Brasília.

## Perguntas para a analista de folha

1. Para desligamento em dezembro com aviso indenizado, o 13º do ano corrente deve entrar no termo? (D1)
2. O mês de aniversário em 29/02 deve ser tratado como 01/03 em anos comuns? (regra atual: sim)
