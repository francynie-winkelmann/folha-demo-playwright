# Segurança e privacidade do projeto

Checklist da Fase 1. Marque cada item ao revisar. Itens "Pendente" dependem de configurações da conta no GitHub.

## Dados

- [x] Nenhum dado real: nomes, CPFs e salários são fictícios. Os CPFs são gerados por algoritmo e **podem coincidir por acaso com CPFs reais**; não os use fora de testes.
- [x] Nada de sistemas, clientes, bases, telas ou código de empresa.
- [x] A aplicação não grava nem envia dados: tudo roda no navegador e nada é persistido.

## Segredos

- [x] O projeto não usa senhas, chaves nem variáveis secretas.
- [x] `.env` e variações estão no `.gitignore`.
- [ ] Pendente (conta): conferir em *Settings > Code security* se a varredura de segredos e a proteção contra envio de segredos (*push protection*) estão ligadas.
- [ ] Pendente (conta): verificação em duas etapas (2FA) ligada.
- [ ] Pendente (conta): e-mail privado ligado e bloqueio de push que expõe o e-mail.

## Dependências e automação

- [x] Fluxos do GitHub Actions com permissões mínimas (`contents: read`; a publicação da demonstração pede `pages` e `id-token` somente nesse fluxo).
- [x] Auditoria de dependências (`npm audit --audit-level=high`) no CI.
- [x] Dependabot configurado (`.github/dependabot.yml`): pull requests semanais para pacotes npm e ações do GitHub.
- [ ] Pendente: fixar as ações do GitHub por *hash* de commit em vez de versão (`@v4`). Exige consultar o hash de cada ação; o Dependabot passa a mantê-los atualizados depois.
- [ ] Pendente (conta): em *Settings > Code security*, ligar *Dependabot alerts* e *Dependabot security updates*.

### Vulnerabilidades conhecidas e aceitas (declaração transparente)

`npm audit` aponta **5 avisos de severidade moderada** em ferramentas de desenvolvimento, introduzidas pelo Stryker
(teste de mutação) e por uma dependência transitiva (`qs`/`minimatch`). A inclusão do `playwright-bdd` na v2 não aumentou esse número. Sem correção disponível publicada até a data desta verificação.

- Risco: **baixo** para este projeto. São ferramentas que rodam só na máquina de desenvolvimento e no CI, nunca no site publicado,
  e não processam entrada de terceiros.
- O CI barra apenas severidade **alta ou crítica** (`--audit-level=high`). Os avisos moderados ficam registrados aqui
  e serão reavaliados quando o Dependabot propuser as atualizações.
- Mitigação: o job de mutação roda sem segredos e com `contents: read`.
- [ ] Pendente (conta): proteção da branch `main` (exigir que o CI passe antes de juntar mudanças).

## Defeitos propositais

- [x] Todos desligados por padrão; só ativam com `?defeitos=` na URL.
- [x] Quando ligados, um aviso vermelho lista os defeitos na tela.
- [x] A página inicial informa que a aplicação é fictícia.

## Uso de IA neste projeto

- A IA propôs código, cenários e a calculadora independente. **As regras e tabelas precisam ser conferidas por uma pessoa** nas fontes oficiais antes de qualquer uso além da demonstração.
- O resultado esperado nunca vem da tela: vem da regra de negócio, de uma tabela de casos e de uma calculadora independente (ver `tests/oraculo/`).
- Nunca coloque credenciais em prompts nem em arquivos do repositório.

## Rescisão e BDD (v2)

- [x] Nenhum dado real: as datas, salários e saldos dos exemplos são inventados.
- [x] A referência da regressão (`regressao/referencia.json`) só é gravada com `--aprovar` e com o nome de quem aprovou; hoje está marcada como **aguardando aprovação humana**.
- [x] Os defeitos e alterações escondidas continuam desligados por padrão e aparecem em aviso vermelho quando ligados.
- [ ] Pendente (pessoa): conferir as regras de rescisão em fonte oficial (CLT, Lei 12.506/2011 do aviso proporcional, Lei 8.036/1990 do FGTS) antes de qualquer uso além da demonstração.
