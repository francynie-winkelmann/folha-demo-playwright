import { expect, type Locator, type Page } from '@playwright/test';
import { FUNCIONARIO_VALIDO } from '../helpers/dados';

export type CampoId = 'nome' | 'cpf' | 'salario' | 'admissao' | 'dependentes';
export type Preenchimento = Record<CampoId, string>;

const ROTULOS: Record<CampoId, string> = {
  nome: 'Nome completo',
  cpf: 'CPF',
  salario: 'Salário bruto (R$)',
  admissao: 'Data de admissão',
  dependentes: 'Dependentes (IRRF)',
};

export type ItemHolerite =
  | 'salario'
  | 'inss'
  | 'base-irrf'
  | 'irrf-tabela'
  | 'reducao'
  | 'irrf'
  | 'liquido'
  | 'fgts';

/**
 * Page Object da tela única do FolhaDemo.
 * Se um seletor mudar, só este arquivo precisa ser ajustado.
 */
export class FolhaPage {
  constructor(readonly page: Page) {}

  /** Abre o app. Se a variável DEFEITOS estiver definida, liga os defeitos propositais (usado na medição). */
  async abrir(): Promise<void> {
    const defeitos = process.env.DEFEITOS?.trim();
    await this.page.goto(defeitos ? `/?defeitos=${encodeURIComponent(defeitos)}` : '/');
    await expect(this.page.getByRole('heading', { name: 'FolhaDemo' })).toBeVisible();
  }

  campo(id: CampoId): Locator {
    return this.page.getByLabel(ROTULOS[id], { exact: true });
  }

  async preencher(valores: Partial<Preenchimento> = {}): Promise<void> {
    const dados: Preenchimento = { ...FUNCIONARIO_VALIDO, ...valores };
    for (const id of Object.keys(ROTULOS) as CampoId[]) {
      await this.campo(id).fill(dados[id]);
    }
  }

  async calcular(): Promise<void> {
    await this.page.getByRole('button', { name: 'Calcular folha' }).click();
  }

  async preencherECalcular(valores: Partial<Preenchimento> = {}): Promise<void> {
    await this.preencher(valores);
    await this.calcular();
  }

  erro(id: CampoId): Locator {
    return this.page.getByTestId(`erro-${id}`);
  }

  get erros(): Locator {
    return this.page.getByRole('alert');
  }

  get holerite(): Locator {
    return this.page.getByTestId('holerite');
  }

  item(id: ItemHolerite): Locator {
    return this.page.getByTestId(`holerite-${id}`);
  }

  /** Valor exato em centavos, lido do atributo data-centavos (independe da formatação da tela). */
  async centavos(id: ItemHolerite): Promise<number> {
    const bruto = await this.item(id).getAttribute('data-centavos');
    if (bruto === null) throw new Error(`Item do holerite sem data-centavos: ${id}`);
    return Number(bruto);
  }

  async valoresDoHolerite() {
    return {
      inss: await this.centavos('inss'),
      baseIrrf: await this.centavos('base-irrf'),
      irrfTabela: await this.centavos('irrf-tabela'),
      reducao: await this.centavos('reducao'),
      irrf: await this.centavos('irrf'),
      fgts: await this.centavos('fgts'),
      liquido: await this.centavos('liquido'),
    };
  }
}
