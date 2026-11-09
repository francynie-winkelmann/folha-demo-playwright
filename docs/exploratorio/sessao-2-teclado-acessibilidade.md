# Sessão exploratória 2: navegação por teclado e semântica de acessibilidade

| Campo | Valor |
|---|---|
| Charter (missão) | Usar o FolhaDemo **só com o teclado** e inspecionar a semântica das abas, formulários, erros e resultado, para achar barreiras para quem não usa mouse ou usa leitor de tela |
| Executada por | IA (Claude), com script Playwright; **revisão humana pendente** |
| Data | 08/11/2026 |
| Ambiente | FolhaDemo local (build de preview), Chrome, viewport de 1100 px e depois 550 px |
| Evidência bruta | `docs/exploratorio/saida-sessao-2.txt`; script `scripts/exploratorio-teclado.ts` |

## O que funciona bem

- Página com idioma `pt-BR`, título, um `h1`, região `main` e todos os campos com rótulo associado.
- Erros de campo usam `role="alert"`, `aria-invalid` e `aria-describedby`: o leitor de tela pode anunciar o erro e ligá-lo ao campo.
- Controles testados têm contorno de foco visível; Enter ativa as abas e envia o formulário.
- Em 550 px (equivalente a zoom de 200% em tela comum) não há rolagem horizontal.

## Descobertas

| # | O que foi visto | Severidade sugerida | Ação sugerida |
|---|---|---|---|
| A1 | **As abas dizem ser abas, mas não se comportam como abas.** Têm `role="tab"`, mas as setas ← → e End não mudam de aba, ambas as abas entram na sequência do Tab, e não há `aria-controls` nem painel com `role="tabpanel"`. Quem usa leitor de tela espera o comportamento padrão de abas. | Média | Implementar o padrão de abas (setas, tabindex rotativo, tabpanel) ou usar botões comuns sem `role="tab"`. |
| A2 | **O resultado do cálculo não é anunciado.** Depois de "Calcular", o foco continua no botão e a região do holerite/termo não é uma região ao vivo (`aria-live`). Um leitor de tela pode não avisar que o resultado apareceu. | Média | Mover o foco para o título do resultado ou marcar a região com `aria-live="polite"`. |
| A3 | **Foco não vai ao primeiro campo com erro.** Enviar o formulário vazio gera 6 alertas de uma vez, mas o foco fica no botão. | Baixa | Focar o primeiro campo inválido após o envio. |

## Ressalvas (para não afirmar demais)

- Nenhum leitor de tela real (NVDA, JAWS, VoiceOver) foi usado: as descobertas A1 e A2 vêm da inspeção da semântica e do comportamento do teclado, e precisam ser confirmadas com um leitor de tela.
- O foco "sem indicador" visto no seletor de data (campo de calendário) e no botão depois do clique com mouse é comportamento esperado do navegador, não foi tratado como defeito.
- Contraste de cores não foi medido.
- Acessibilidade completa continua **fora do escopo**; esta sessão é uma amostra, não uma auditoria.
