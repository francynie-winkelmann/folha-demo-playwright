/**
 * DEFEITOS PROPOSITAIS (para demonstração de QA).
 *
 * Todos ficam DESLIGADOS por padrão. Para ligar um ou mais, use o parâmetro
 * `defeitos` na URL, por exemplo:  /?defeitos=inss_sem_teto,irrf_sem_reducao
 *
 * A suíte de testes precisa PASSAR sem nenhum defeito e FALHAR para cada um
 * deles. A taxa de detecção é medida por `npm run defeitos:medir`.
 */
export const DEFEITOS = {
  inss_sem_progressividade: {
    descricao: 'INSS aplica a alíquota da faixa sobre o salário inteiro (sem progressividade)',
    risco: 'Desconto de INSS maior que o devido para quase todos os salários',
  },
  inss_sem_teto: {
    descricao: 'INSS não respeita o teto de contribuição',
    risco: 'Desconto acima do máximo legal para salários altos',
  },
  arredondamento_antecipado: {
    descricao: 'INSS arredonda cada faixa antes de somar',
    risco: 'Diferença de centavos que se acumula na folha e na guia',
  },
  irrf_base_sem_inss: {
    descricao: 'Base do IRRF não desconta o INSS',
    risco: 'Imposto retido maior que o devido',
  },
  irrf_dependente_so_primeiro: {
    descricao: 'Dedução por dependente aplicada somente ao primeiro dependente',
    risco: 'Imposto errado para quem tem 2 ou mais dependentes',
  },
  irrf_sem_reducao: {
    descricao: 'Redutor da Lei 15.270/2025 não é aplicado',
    risco: 'Retenção indevida para quem ganha até R$ 7.350',
  },
  cadastro_salario_invalido: {
    descricao: 'Cadastro aceita salário zero ou negativo',
    risco: 'Dado inválido entrando no cálculo da folha',
  },
  cpf_sem_digito_verificador: {
    descricao: 'Cadastro não confere os dígitos verificadores do CPF',
    risco: 'Funcionário cadastrado com documento inválido',
  },
  // ---- Rescisão (v2) ----
  res_multa_em_pedido_demissao: {
    descricao: 'Multa de 40% do FGTS também é calculada no pedido de demissão',
    risco: 'Pagamento indevido de multa que só existe na dispensa sem justa causa',
  },
  res_aviso_sem_3_dias_por_ano: {
    descricao: 'Aviso prévio indenizado fixo em 30 dias (ignora os 3 dias por ano de serviço)',
    risco: 'Aviso prévio pago a menos para quem tem mais de 1 ano de casa',
  },
  res_sem_projecao_aviso: {
    descricao: 'Avos de férias e 13º ignoram a projeção do aviso prévio indenizado',
    risco: 'Férias proporcionais e 13º pagos a menos',
  },
  res_inss_sobre_aviso: {
    descricao: 'INSS incide também sobre o aviso prévio indenizado',
    risco: 'Desconto de INSS sobre verba indenizatória, que não sofre contribuição',
  },
  res_avos_qualquer_dia: {
    descricao: 'Mês conta como avo com qualquer quantidade de dias (e não só com 15 ou mais)',
    risco: 'Férias proporcionais e 13º pagos a mais',
  },
} as const;

/**
 * ALTERAÇÕES ESCONDIDAS (para o experimento de regressão).
 * Não entram na taxa de detecção de defeitos: servem para mostrar que o teste de regressão antes × depois
 * percebe uma mudança sutil que a suíte funcional pode deixar passar. Também ficam desligadas por padrão.
 */
export const ALTERACOES_ESCONDIDAS = {
  mensal_fgts_truncado: {
    descricao: 'FGTS mensal passa a truncar os centavos em vez de arredondar meio para cima',
    risco: 'Diferença de 1 centavo em parte dos holerites, sem nenhuma mudança visível na tela',
  },
} as const;

export type DefeitoId = keyof typeof DEFEITOS | keyof typeof ALTERACOES_ESCONDIDAS;
const CONHECIDOS: Record<string, { descricao: string; risco: string }> = { ...DEFEITOS, ...ALTERACOES_ESCONDIDAS };

export function descricaoDoDefeito(id: DefeitoId): string {
  return CONHECIDOS[id]!.descricao;
}

/**
 * Defeitos ligados: no navegador, vêm de `?defeitos=a,b` na URL; fora do navegador (testes unitários e scripts),
 * vêm da variável de ambiente DEFEITOS.
 */
export function defeitosLigados(): DefeitoId[] {
  let bruto = '';
  if (typeof window !== 'undefined') {
    bruto = new URLSearchParams(window.location.search).get('defeitos') ?? '';
  } else if (typeof process !== 'undefined') {
    bruto = process.env['DEFEITOS'] ?? '';
  }
  return bruto
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is DefeitoId => s in CONHECIDOS);
}

export function defeitoAtivo(id: DefeitoId): boolean {
  return defeitosLigados().includes(id);
}
