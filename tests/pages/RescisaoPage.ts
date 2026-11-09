import { expect, type Locator, type Page } from '@playwright/test';
import type { EsperadoRescisao } from '../oraculo/rescisao-independente';

export type CampoRescisaoId = 'tipo' | 'salario' | 'dependentes' | 'admissao' | 'desligamento' | 'saldoFgts';

export interface PreenchimentoRescisao {
  tipo: string; // valor da lista: sem_justa_causa | pedido_demissao | '' (não selecionado)
  salario: string;
  dependentes: string;
  admissao: string;
  desligamento: string;
  saldoFgts: string;
  feriasVencidas: boolean;
  avisoCumprido: boolean;
}

export const RESCISAO_VALIDA: PreenchimentoRescisao = {
  tipo: 'sem_justa_causa',
  salario: '3000,00',
  dependentes: '0',
  admissao: '2022-03-10',
  desligamento: '2025-08-20',
  saldoFgts: '0,00',
  feriasVencidas: false,
  avisoCumprido: false,
};

const ROTULOS: Record<CampoRescisaoId, string> = {
  tipo: 'Tipo de desligamento',
  salario: 'Salário bruto (R$)',
  dependentes: 'Dependentes (IRRF)',
  admissao: 'Data de admissão',
  desligamento: 'Data de desligamento (último dia trabalhado)',
  saldoFgts: 'Saldo do FGTS (R$)',
};

/** Itens em centavos do termo de rescisão: id na tela -> campo do resultado. */
export const ITENS_CENTAVOS: Record<string, keyof EsperadoRescisao> = {
  'saldo-salario': 'saldoSalarioCentavos',
  'aviso-indenizado': 'avisoIndenizadoCentavos',
  'ferias-vencidas': 'feriasVencidasCentavos',
  'terco-ferias-vencidas': 'tercoFeriasVencidasCentavos',
  'ferias-proporcionais': 'feriasProporcionaisCentavos',
  'terco-ferias-proporcionais': 'tercoFeriasProporcionaisCentavos',
  'decimo-terceiro': 'decimoTerceiroCentavos',
  'total-proventos': 'totalProventosCentavos',
  'inss-saldo': 'inssSaldoCentavos',
  'irrf-saldo': 'irrfSaldoCentavos',
  'inss-13': 'inss13Centavos',
  'irrf-13': 'irrf13Centavos',
  'desconto-aviso': 'descontoAvisoCentavos',
  'total-descontos': 'totalDescontosCentavos',
  liquido: 'liquidoCentavos',
  'fgts-rescisorio': 'fgtsRescisorioCentavos',
  'multa-fgts': 'multaFgtsCentavos',
};

export const ITENS_NUMERICOS: Record<string, keyof EsperadoRescisao> = {
  'anos-completos': 'anosCompletos',
  'aviso-dias': 'avisoDias',
  'avos-13': 'avos13',
  'avos-ferias': 'avosFerias',
};

/**
 * Page Object da aba "Rescisão". Se um seletor mudar, só este arquivo precisa ser ajustado.
 */
export class RescisaoPage {
  constructor(readonly page: Page) {}

  async abrir(): Promise<void> {
    const defeitos = process.env.DEFEITOS?.trim();
    await this.page.goto(defeitos ? `/?defeitos=${encodeURIComponent(defeitos)}` : '/');
    await this.page.getByRole('tab', { name: 'Rescisão' }).click();
    await expect(this.page.getByRole('form', { name: 'Dados da rescisão' })).toBeVisible();
  }

  campo(id: CampoRescisaoId): Locator {
    return this.page.getByLabel(ROTULOS[id], { exact: true });
  }

  async preencher(valores: Partial<PreenchimentoRescisao> = {}): Promise<void> {
    const d: PreenchimentoRescisao = { ...RESCISAO_VALIDA, ...valores };
    await this.campo('tipo').selectOption(d.tipo);
    for (const id of ['salario', 'dependentes', 'admissao', 'desligamento', 'saldoFgts'] as const) {
      await this.campo(id).fill(d[id]);
    }
    await this.page.getByLabel('Possui um período de férias vencido').setChecked(d.feriasVencidas);
    await this.page.getByLabel('Aviso prévio cumprido (vale só no pedido de demissão)').setChecked(d.avisoCumprido);
  }

  async calcular(): Promise<void> {
    await this.page.getByRole('button', { name: 'Calcular rescisão' }).click();
  }

  async preencherECalcular(valores: Partial<PreenchimentoRescisao> = {}): Promise<void> {
    await this.preencher(valores);
    await this.calcular();
  }

  erro(id: CampoRescisaoId): Locator {
    return this.page.getByTestId(`erro-resc-${id}`);
  }

  get erros(): Locator {
    return this.page.getByRole('alert');
  }

  get termo(): Locator {
    return this.page.getByTestId('rescisao');
  }

  get saldoDevedor(): Locator {
    return this.page.getByTestId('rescisao-saldo-devedor');
  }

  /** Lê todos os valores do termo e devolve no mesmo formato da calculadora independente. */
  async valoresDoTermo(): Promise<EsperadoRescisao> {
    const saida: Record<string, number | string> = {};
    for (const [id, campo] of Object.entries(ITENS_CENTAVOS)) {
      saida[campo] = Number(await this.page.getByTestId(`rescisao-${id}`).getAttribute('data-centavos'));
    }
    for (const [id, campo] of Object.entries(ITENS_NUMERICOS)) {
      saida[campo] = Number(await this.page.getByTestId(`rescisao-${id}`).getAttribute('data-valor'));
    }
    saida['dataProjetada'] = (await this.page.getByTestId('rescisao-data-projetada').getAttribute('data-valor')) ?? '';
    return saida as unknown as EsperadoRescisao;
  }
}
