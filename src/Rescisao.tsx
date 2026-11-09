import { useState, type FormEvent } from 'react';
import { calcularRescisao, type ResultadoRescisao, type TipoRescisao } from './domain/rescisao';
import { formatarCentavos } from './domain/moeda';
import { salarioParaCentavos, validarRescisao, type CamposRescisao, type ErrosRescisao } from './domain/validacao';

const VAZIO: CamposRescisao = { tipo: '', salario: '', dependentes: '', admissao: '', desligamento: '', saldoFgts: '' };

export function Rescisao() {
  const [campos, setCampos] = useState<CamposRescisao>(VAZIO);
  const [feriasVencidas, setFeriasVencidas] = useState(false);
  const [avisoCumprido, setAvisoCumprido] = useState(false);
  const [erros, setErros] = useState<ErrosRescisao>({});
  const [termo, setTermo] = useState<{ tipo: TipoRescisao; r: ResultadoRescisao } | null>(null);

  function alterar(campo: keyof CamposRescisao, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  function calcular(e: FormEvent) {
    e.preventDefault();
    const novos = validarRescisao(campos);
    setErros(novos);
    if (Object.keys(novos).length > 0) {
      setTermo(null);
      return;
    }
    const tipo = campos.tipo as TipoRescisao;
    setTermo({
      tipo,
      r: calcularRescisao({
        tipo,
        salarioCentavos: salarioParaCentavos(campos.salario) ?? 0,
        dependentes: Number(campos.dependentes),
        admissao: campos.admissao,
        desligamento: campos.desligamento,
        saldoFgtsCentavos: salarioParaCentavos(campos.saldoFgts) ?? 0,
        feriasVencidas,
        avisoCumprido,
      }),
    });
  }

  return (
    <section aria-label="Rescisão">
      <form onSubmit={calcular} noValidate aria-label="Dados da rescisão">
        <div className="campo">
          <label htmlFor="resc-tipo">Tipo de desligamento</label>
          <select
            id="resc-tipo"
            value={campos.tipo}
            aria-invalid={erros.tipo ? 'true' : 'false'}
            aria-describedby={erros.tipo ? 'erro-resc-tipo' : undefined}
            onChange={(e) => alterar('tipo', e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="sem_justa_causa">Dispensa sem justa causa</option>
            <option value="pedido_demissao">Pedido de demissão</option>
          </select>
          <MensagemErro id="tipo" erro={erros.tipo} />
        </div>
        <CampoRescisao id="salario" rotulo="Salário bruto (R$)" campos={campos} erros={erros} onChange={alterar} />
        <CampoRescisao id="dependentes" rotulo="Dependentes (IRRF)" campos={campos} erros={erros} onChange={alterar} />
        <CampoRescisao id="admissao" rotulo="Data de admissão" tipo="date" campos={campos} erros={erros} onChange={alterar} />
        <CampoRescisao
          id="desligamento"
          rotulo="Data de desligamento (último dia trabalhado)"
          tipo="date"
          campos={campos}
          erros={erros}
          onChange={alterar}
        />
        <CampoRescisao id="saldoFgts" rotulo="Saldo do FGTS (R$)" campos={campos} erros={erros} onChange={alterar} />
        <div className="opcao">
          <input id="resc-ferias" type="checkbox" checked={feriasVencidas} onChange={(e) => setFeriasVencidas(e.target.checked)} />
          <label htmlFor="resc-ferias">Possui um período de férias vencido</label>
        </div>
        <div className="opcao">
          <input id="resc-aviso" type="checkbox" checked={avisoCumprido} onChange={(e) => setAvisoCumprido(e.target.checked)} />
          <label htmlFor="resc-aviso">Aviso prévio cumprido (vale só no pedido de demissão)</label>
        </div>
        <button type="submit">Calcular rescisão</button>
      </form>

      {termo && <TermoView tipo={termo.tipo} r={termo.r} />}
    </section>
  );
}

function MensagemErro({ id, erro }: { id: string; erro?: string | undefined }) {
  if (!erro) return null;
  return (
    <span id={`erro-resc-${id}`} role="alert" data-testid={`erro-resc-${id}`} className="erro">
      {erro}
    </span>
  );
}

interface CampoRescisaoProps {
  id: Exclude<keyof CamposRescisao, 'tipo'>;
  rotulo: string;
  tipo?: string;
  campos: CamposRescisao;
  erros: ErrosRescisao;
  onChange: (campo: keyof CamposRescisao, valor: string) => void;
}

function CampoRescisao({ id, rotulo, tipo = 'text', campos, erros, onChange }: CampoRescisaoProps) {
  const erro = erros[id];
  return (
    <div className="campo">
      <label htmlFor={`resc-${id}`}>{rotulo}</label>
      <input
        id={`resc-${id}`}
        type={tipo}
        value={campos[id]}
        aria-invalid={erro ? 'true' : 'false'}
        aria-describedby={erro ? `erro-resc-${id}` : undefined}
        onChange={(e) => onChange(id, e.target.value)}
      />
      <MensagemErro id={id} erro={erro} />
    </div>
  );
}

function Linha({ id, rotulo, centavos, destaque }: { id: string; rotulo: string; centavos: number; destaque?: boolean }) {
  return (
    <tr className={destaque ? 'destaque' : undefined}>
      <th scope="row">{rotulo}</th>
      <td data-testid={`rescisao-${id}`} data-centavos={centavos}>
        {formatarCentavos(centavos)}
      </td>
    </tr>
  );
}

function Info({ id, rotulo, valor }: { id: string; rotulo: string; valor: string | number }) {
  return (
    <tr>
      <th scope="row">{rotulo}</th>
      <td data-testid={`rescisao-${id}`} data-valor={valor}>
        {valor}
      </td>
    </tr>
  );
}

function TermoView({ tipo, r }: { tipo: TipoRescisao; r: ResultadoRescisao }) {
  return (
    <section aria-label="Termo de rescisão" data-testid="rescisao" className="holerite">
      <h2>Termo de rescisão</h2>
      <p data-testid="rescisao-tipo">{tipo === 'sem_justa_causa' ? 'Dispensa sem justa causa' : 'Pedido de demissão'}</p>
      <table>
        <caption>Apuração</caption>
        <tbody>
          <Info id="anos-completos" rotulo="Anos completos de serviço" valor={r.anosCompletos} />
          <Info id="aviso-dias" rotulo="Dias de aviso prévio indenizado" valor={r.avisoDias} />
          <Info id="data-projetada" rotulo="Data projetada (desligamento + aviso)" valor={r.dataProjetada} />
          <Info id="avos-13" rotulo="Avos de 13º salário" valor={r.avos13} />
          <Info id="avos-ferias" rotulo="Avos de férias proporcionais" valor={r.avosFerias} />
        </tbody>
      </table>
      <table>
        <caption>Verbas</caption>
        <tbody>
          <Linha id="saldo-salario" rotulo="Saldo de salário" centavos={r.saldoSalarioCentavos} />
          <Linha id="aviso-indenizado" rotulo="Aviso prévio indenizado" centavos={r.avisoIndenizadoCentavos} />
          <Linha id="ferias-vencidas" rotulo="Férias vencidas" centavos={r.feriasVencidasCentavos} />
          <Linha id="terco-ferias-vencidas" rotulo="1/3 sobre férias vencidas" centavos={r.tercoFeriasVencidasCentavos} />
          <Linha id="ferias-proporcionais" rotulo="Férias proporcionais" centavos={r.feriasProporcionaisCentavos} />
          <Linha id="terco-ferias-proporcionais" rotulo="1/3 sobre férias proporcionais" centavos={r.tercoFeriasProporcionaisCentavos} />
          <Linha id="decimo-terceiro" rotulo="13º salário proporcional" centavos={r.decimoTerceiroCentavos} />
          <Linha id="total-proventos" rotulo="Total de verbas" centavos={r.totalProventosCentavos} destaque />
        </tbody>
      </table>
      <table>
        <caption>Descontos</caption>
        <tbody>
          <Linha id="inss-saldo" rotulo="(-) INSS sobre saldo de salário" centavos={r.inssSaldoCentavos} />
          <Linha id="irrf-saldo" rotulo="(-) IRRF sobre saldo de salário" centavos={r.irrfSaldoCentavos} />
          <Linha id="inss-13" rotulo="(-) INSS sobre 13º" centavos={r.inss13Centavos} />
          <Linha id="irrf-13" rotulo="(-) IRRF sobre 13º" centavos={r.irrf13Centavos} />
          <Linha id="desconto-aviso" rotulo="(-) Aviso prévio não cumprido" centavos={r.descontoAvisoCentavos} />
          <Linha id="total-descontos" rotulo="Total de descontos" centavos={r.totalDescontosCentavos} destaque />
        </tbody>
      </table>
      <table>
        <tbody>
          <Linha id="liquido" rotulo="Líquido a receber" centavos={r.liquidoCentavos} destaque />
        </tbody>
      </table>
      {r.liquidoCentavos < 0 && (
        <p className="erro" data-testid="rescisao-saldo-devedor">
          Saldo devedor: os descontos superam as verbas.
        </p>
      )}
      <table>
        <caption>FGTS (depositado na conta do trabalhador, não entra no líquido)</caption>
        <tbody>
          <Linha id="fgts-rescisorio" rotulo="FGTS da rescisão (8%)" centavos={r.fgtsRescisorioCentavos} />
          <Linha id="multa-fgts" rotulo="Multa de 40% do FGTS" centavos={r.multaFgtsCentavos} />
        </tbody>
      </table>
    </section>
  );
}
