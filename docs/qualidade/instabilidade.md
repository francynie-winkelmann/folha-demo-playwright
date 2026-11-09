# Controle de instabilidade (flaky)

> Gerado por `npm run instabilidade`. **Não edite à mão.**

Um teste é **instável** quando, com o mesmo código e os mesmos dados, ora passa e ora falha. Teste instável é perigoso
porque a equipe aprende a ignorar falhas ("roda de novo que passa") e passa a ignorar também os defeitos reais.
Por isso este projeto roda com **zero retentativas** (`retries: 0`): uma falha nunca é escondida por uma segunda tentativa.

- Testes distintos: **84**
- Repetições por teste: **3** (execuções totais: 252)
- Testes **instáveis** (resultado diferente entre repetições): **0**
- Testes que **falharam em todas** as repetições: **0**

**Conclusão:** nas 3 repetições nenhum teste mudou de resultado.

## Limites desta medição

- 3 repetições reduzem, mas **não eliminam**, a chance de uma instabilidade rara passar despercebida. Quanto mais repetições, mais confiança.
- Executado numa única máquina e navegador (Chromium). Instabilidades que só aparecem em CI sob carga, ou em outros navegadores, não são vistas aqui.
- Os testes rodam em paralelo (`fullyParallel`), o que já ajuda a expor dependência de ordem ou de estado compartilhado.
