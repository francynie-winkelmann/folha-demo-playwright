import { useState, type FormEvent } from 'react';
import { Rescisao } from './Rescisao';
import { calcularFolha, type ResultadoFolha } from './domain/calculo';
import { defeitosLigados, descricaoDoDefeito } from './domain/defeitos';
import { formatarCentavos } from './domain/moeda';
import {
  salarioParaCentavos,
  validarFuncionario,
  type CamposFuncionario,
  type Erros,
} from './domain/validacao';

const VAZIO: CamposFuncionario = { nome: '', cpf: '', salario: '', admissao: '', dependentes: '' };

interface Holerite {
  nome: string;
  cpf: string;
  resultado: ResultadoFolha;
}

type Aba = 'mensal' | 'rescisao';

export function App() {
  const [aba, setAba] = useState<Aba>('mensal');
  const ligados = defeitosLigados();

  return (
    <main>
      <header>
        <h1>FolhaDemo</h1>
        <p className="aviso" data-testid="aviso-ficticio">
          Aplicação <strong>fictícia</strong> criada para demonstrar testes automatizados. Os dados e os
          defeitos são propositais; nada aqui vem de sistema, cliente ou base de qualquer empresa.
        </p>
        {ligados.length > 0 && (
          <div className="defeitos" role="status" data-testid="defeitos-ativos">
            <strong>Defeitos propositais ligados:</strong>
            <ul>
              {ligados.map((id) => (
                <li key={id}>{descricaoDoDefeito(id)}</li>
              ))}
            </ul>
          </div>
        )}
        <div role="tablist" aria-label="Módulos" className="abas">
          <button role="tab" type="button" aria-selected={aba === 'mensal'} onClick={() => setAba('mensal')}>
            Folha mensal
          </button>
          <button role="tab" type="button" aria-selected={aba === 'rescisao'} onClick={() => setAba('rescisao')}>
            Rescisão
          </button>
        </div>
      </header>
      {aba === 'mensal' ? <FolhaMensal /> : <Rescisao />}
    </main>
  );
}

function FolhaMensal() {
  const [campos, setCampos] = useState<CamposFuncionario>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [holerite, setHolerite] = useState<Holerite | null>(null);

  function alterar(campo: keyof CamposFuncionario, valor: string) {
    setCampos((atual) => ({ ...atual, [campo]: valor }));
  }

  function calcular(e: FormEvent) {
    e.preventDefault();
    const novosErros = validarFuncionario(campos);
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      setHolerite(null);
      return;
    }
    const salarioCentavos = salarioParaCentavos(campos.salario) ?? 0;
    setHolerite({
      nome: campos.nome.trim(),
      cpf: campos.cpf.trim(),
      resultado: calcularFolha({ salarioCentavos, dependentes: Number(campos.dependentes) }),
    });
  }

  return (
    <section aria-label="Folha mensal">
      <form onSubmit={calcular} noValidate aria-label="Cadastro de funcionário">
        <Campo id="nome" rotulo="Nome completo" valor={campos.nome} erro={erros.nome} onChange={alterar} />
        <Campo id="cpf" rotulo="CPF" valor={campos.cpf} erro={erros.cpf} onChange={alterar} />
        <Campo
          id="salario"
          rotulo="Salário bruto (R$)"
          valor={campos.salario}
          erro={erros.salario}
          onChange={alterar}
        />
        <Campo
          id="admissao"
          rotulo="Data de admissão"
          tipo="date"
          valor={campos.admissao}
          erro={erros.admissao}
          onChange={alterar}
        />
        <Campo
          id="dependentes"
          rotulo="Dependentes (IRRF)"
          valor={campos.dependentes}
          erro={erros.dependentes}
          onChange={alterar}
        />
        <button type="submit">Calcular folha</button>
      </form>

      {holerite && <HoleriteView dados={holerite} />}
    </section>
  );
}

interface CampoProps {
  id: keyof CamposFuncionario;
  rotulo: string;
  valor: string;
  erro?: string | undefined;
  tipo?: string;
  onChange: (campo: keyof CamposFuncionario, valor: string) => void;
}

function Campo({ id, rotulo, valor, erro, tipo = 'text', onChange }: CampoProps) {
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        type={tipo}
        value={valor}
        aria-invalid={erro ? 'true' : 'false'}
        aria-describedby={erro ? `erro-${id}` : undefined}
        onChange={(e) => onChange(id, e.target.value)}
      />
      {erro && (
        <span id={`erro-${id}`} role="alert" data-testid={`erro-${id}`} className="erro">
          {erro}
        </span>
      )}
    </div>
  );
}

function Linha({ id, rotulo, centavos, destaque }: { id: string; rotulo: string; centavos: number; destaque?: boolean }) {
  return (
    <tr className={destaque ? 'destaque' : undefined}>
      <th scope="row">{rotulo}</th>
      <td data-testid={`holerite-${id}`} data-centavos={centavos}>
        {formatarCentavos(centavos)}
      </td>
    </tr>
  );
}

function HoleriteView({ dados }: { dados: Holerite }) {
  const r = dados.resultado;
  return (
    <section aria-label="Holerite" data-testid="holerite" className="holerite">
      <h2>Holerite</h2>
      <p>
        <span data-testid="holerite-nome">{dados.nome}</span> — CPF{' '}
        <span data-testid="holerite-cpf">{dados.cpf}</span>
      </p>
      <table>
        <tbody>
          <Linha id="salario" rotulo="Salário bruto" centavos={r.salarioCentavos} />
          <Linha id="inss" rotulo="(-) INSS" centavos={r.inssCentavos} />
          <Linha id="base-irrf" rotulo="Base de cálculo do IRRF" centavos={r.baseIrrfCentavos} />
          <Linha id="irrf-tabela" rotulo="IRRF pela tabela progressiva" centavos={r.irrfTabelaCentavos} />
          <Linha id="reducao" rotulo="(-) Redução Lei 15.270/2025" centavos={r.reducaoCentavos} />
          <Linha id="irrf" rotulo="(-) IRRF retido" centavos={r.irrfCentavos} />
          <Linha id="liquido" rotulo="Salário líquido" centavos={r.liquidoCentavos} destaque />
          <Linha id="fgts" rotulo="FGTS (depósito do empregador, não descontado)" centavos={r.fgtsCentavos} />
        </tbody>
      </table>
      <p className="nota" data-testid="holerite-deducao">
        Dedução usada no IRRF: {r.deducaoUsada === 'simplificado' ? 'desconto simplificado' : 'INSS + dependentes'}
      </p>
    </section>
  );
}
