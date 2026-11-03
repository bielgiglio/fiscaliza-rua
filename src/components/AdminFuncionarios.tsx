import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ImportarCSV from './ImportarCSV'

interface Conserv {
  id: string
  nome: string
}

interface Funcionario {
  id: string
  codigo: string
  nome: string
  empresa: string
  funcao_carteira: string
  funcao_exercida: string
  data_admissao: string
  data_demissao: string | null
  conserv_id: string
  ativo: boolean
  conserv?: {
    nome: string
  }
}

export default function AdminFuncionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [conservs, setConservs] = useState<Conserv[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroConserv, setFiltroConserv] = useState('todos')
  const [filtroStatus, setFiltroStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos')

  // Modais de Criação/Edição e de Importação CSV
  const [modalAberto, setModalAberto] = useState(false)
  const [modalCSVAberto, setModalCSVAberto] = useState(false)
  const [funcionarioEdicao, setFuncionarioEdicao] = useState<Funcionario | null>(null)

  // Campos do Formulário
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [funcaoCarteira, setFuncaoCarteira] = useState('')
  const [funcaoExercida, setFuncaoExercida] = useState('')
  const [dataAdmissao, setDataAdmissao] = useState('')
  const [dataDemissao, setDataDemissao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [conservId, setConservId] = useState('')

  async function carregarDados() {
    setLoading(true)

    const [resConservs, resFuncs] = await Promise.all([
      supabase.from('conservs').select('id, nome').eq('ativo', true).order('nome'),
      supabase
        .from('funcionarios')
        .select(`
          *,
          conserv:conservs ( nome )
        `)
        .order('nome'),
    ])

    if (resConservs.data) setConservs(resConservs.data)
    if (resFuncs.data) setFuncionarios(resFuncs.data as Funcionario[])

    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function abrirModalNovo() {
    setFuncionarioEdicao(null)
    setCodigo('')
    setNome('')
    setEmpresa('')
    setFuncaoCarteira('')
    setFuncaoExercida('')
    setDataAdmissao(new Date().toISOString().split('T')[0])
    setDataDemissao('')
    setAtivo(true)
    setConservId(conservs[0]?.id || '')
    setModalAberto(true)
  }

  function abrirModalEditar(func: Funcionario) {
    setFuncionarioEdicao(func)
    setCodigo(func.codigo || '')
    setNome(func.nome)
    setEmpresa(func.empresa)
    setFuncaoCarteira(func.funcao_carteira || '')
    setFuncaoExercida(func.funcao_exercida || '')
    setDataAdmissao(func.data_admissao || '')
    setDataDemissao(func.data_demissao || '')
    setAtivo(func.ativo)
    setConservId(func.conserv_id)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setFuncionarioEdicao(null)
  }

  async function guardarFuncionario(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !conservId) {
      alert('Preencha o nome do funcionário e selecione o Conserv.')
      return
    }

    setSalvando(true)

    const payload = {
      codigo: codigo.trim() || null,
      nome: nome.trim(),
      empresa: empresa.trim() || 'Prefeitura / Terceirizada',
      funcao_carteira: funcaoCarteira.trim() || funcaoExercida.trim(),
      funcao_exercida: funcaoExercida.trim() || funcaoCarteira.trim(),
      data_admissao: dataAdmissao || new Date().toISOString().split('T')[0],
      data_demissao: !ativo && dataDemissao ? dataDemissao : null,
      conserv_id: conservId,
      ativo: ativo,
    }

    if (funcionarioEdicao) {
      const { error } = await supabase
        .from('funcionarios')
        .update(payload)
        .eq('id', funcionarioEdicao.id)

      setSalvando(false)
      if (error) {
        alert(`Erro ao atualizar funcionário: ${error.message}`)
        return
      }
    } else {
      const { error } = await supabase.from('funcionarios').insert(payload)

      setSalvando(false)
      if (error) {
        alert(`Erro ao registar funcionário: ${error.message}`)
        return
      }
    }

    fecharModal()
    carregarDados()
  }

  async function alternarAtivacao(func: Funcionario) {
    if (func.ativo) {
      const hoje = new Date().toISOString().split('T')[0]
      const dataInformada = window.prompt(
        `Informe a data real de demissão de ${func.nome} (formato AAAA-MM-DD):`,
        hoje
      )
      if (dataInformada === null) return

      const { error } = await supabase
        .from('funcionarios')
        .update({
          ativo: false,
          data_demissao: dataInformada.trim() || hoje,
        })
        .eq('id', func.id)

      if (error) alert(`Erro: ${error.message}`)
      carregarDados()
    } else {
      const confirmou = window.confirm(`Deseja reativar o funcionário ${func.nome}?`)
      if (!confirmou) return

      const { error } = await supabase
        .from('funcionarios')
        .update({
          ativo: true,
          data_demissao: null,
        })
        .eq('id', func.id)

      if (error) alert(`Erro: ${error.message}`)
      carregarDados()
    }
  }

  const funcionariosFiltrados = funcionarios.filter((f) => {
    const termo = busca.toLowerCase()
    const coincideTexto =
      f.nome.toLowerCase().includes(termo) ||
      (f.codigo && f.codigo.toLowerCase().includes(termo)) ||
      f.empresa.toLowerCase().includes(termo) ||
      (f.funcao_exercida && f.funcao_exercida.toLowerCase().includes(termo))

    const coincideConserv = filtroConserv === 'todos' || f.conserv_id === filtroConserv

    let coincideStatus = true
    if (filtroStatus === 'ativos') coincideStatus = f.ativo
    if (filtroStatus === 'inativos') coincideStatus = !f.ativo

    return coincideTexto && coincideConserv && coincideStatus
  })

  return (
    <div className="space-y-4">
      {/* Barra de Ações e Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Gestão do Quadro de Funcionários
            </h2>
            <p className="text-xs text-slate-500">
              Cadastre, transfira de setor ou informe desligamentos
            </p>
          </div>

          {/* PASSO 3: Botões de Importar CSV e Novo Funcionário */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setModalCSVAberto(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm transition active:scale-95"
            >
              Importar CSV
            </button>
            <button
              onClick={abrirModalNovo}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2.5 rounded-xl shadow-sm transition active:scale-95"
            >
              + Novo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Pesquisar por nome, código ou função..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          <select
            value={filtroConserv}
            onChange={(e) => setFiltroConserv(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none bg-white"
          >
            <option value="todos">Todos os setores (Conservs)</option>
            {conservs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-center">
            <button
              onClick={() => setFiltroStatus('ativos')}
              className={`py-1.5 rounded-lg transition ${
                filtroStatus === 'ativos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Ativos ({funcionarios.filter((f) => f.ativo).length})
            </button>
            <button
              onClick={() => setFiltroStatus('inativos')}
              className={`py-1.5 rounded-lg transition ${
                filtroStatus === 'inativos' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-600'
              }`}
            >
              Inativos ({funcionarios.filter((f) => !f.ativo).length})
            </button>
            <button
              onClick={() => setFiltroStatus('todos')}
              className={`py-1.5 rounded-lg transition ${
                filtroStatus === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
              }`}
            >
              Todos ({funcionarios.length})
            </button>
          </div>
        </div>
      </div>

      {/* Listagem */}
      {loading ? (
        <p className="text-center py-10 text-slate-400 text-xs">A carregar funcionários...</p>
      ) : funcionariosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200 text-xs">
          Nenhum funcionário encontrado.
        </div>
      ) : (
        <div className="space-y-2.5">
          {funcionariosFiltrados.map((func) => (
            <div
              key={func.id}
              className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !func.ativo ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">{func.nome}</span>
                  {!func.ativo && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                      Demitido
                    </span>
                  )}
                  {func.codigo && (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                      Cód: {func.codigo}
                    </span>
                  )}
                </div>

                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  {func.funcao_exercida} • Setor: <strong>{func.conserv?.nome || 'Não definido'}</strong>
                </p>

                <p className="text-[11px] text-slate-400 mt-0.5">
                  Empresa: {func.empresa} | Admissão:{' '}
                  {func.data_admissao ? func.data_admissao.split('-').reverse().join('/') : 'Não informada'}
                  {func.data_demissao && (
                    <span className="text-rose-600 font-medium">
                      {' '}
                      | Demitido em: {func.data_demissao.split('-').reverse().join('/')}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={() => abrirModalEditar(func)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => alternarAtivacao(func)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    func.ativo
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {func.ativo ? 'Inativar / Demitir' : 'Reativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {funcionarioEdicao ? 'Editar Funcionário' : 'Novo Funcionário'}
                </h3>
                <p className="text-xs text-slate-500">
                  {funcionarioEdicao ? 'Atualize as informações cadastrais' : 'Preencha os dados do operário'}
                </p>
              </div>
              <button
                onClick={fecharModal}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarFuncionario} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Souza"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Código Interno / Matrícula
                  </label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Ex: 1048"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Setor Alocado (Conserv) *
                  </label>
                  <select
                    required
                    value={conservId}
                    onChange={(e) => setConservId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none bg-white"
                  >
                    {conservs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Função Exercida
                  </label>
                  <input
                    type="text"
                    value={funcaoExercida}
                    onChange={(e) => setFuncaoExercida(e.target.value)}
                    placeholder="Ex: Varredor, Roçador, Pintor..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Função em Carteira
                  </label>
                  <input
                    type="text"
                    value={funcaoCarteira}
                    onChange={(e) => setFuncaoCarteira(e.target.value)}
                    placeholder="Ex: Auxiliar de Serviços Gerais"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Empresa Terceirizada / Órgão
                  </label>
                  <input
                    type="text"
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Ex: Conservadora Alfa"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Data de Admissão
                  </label>
                  <input
                    type="date"
                    value={dataAdmissao}
                    onChange={(e) => setDataAdmissao(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* Situação Cadastral e Demissão */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Situação Cadastral:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAtivo(true)
                        setDataDemissao('')
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                        ativo
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAtivo(false)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                        !ativo
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Demitido / Inativo
                    </button>
                  </div>
                </div>

                {!ativo && (
                  <div>
                    <label className="text-xs font-semibold text-rose-700 block mb-1">
                      Data da Demissão / Desligamento:
                    </label>
                    <input
                      type="date"
                      required={!ativo}
                      value={dataDemissao}
                      onChange={(e) => setDataDemissao(e.target.value)}
                      className="w-full p-2 rounded-lg border border-rose-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                >
                  {salvando ? 'A guardar...' : funcionarioEdicao ? 'Atualizar Dados' : 'Concluir Registo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSO 4: Modal de Importação em Lote via CSV */}
      {modalCSVAberto && (
        <ImportarCSV
          conservs={conservs}
          onFechar={() => setModalCSVAberto(false)}
          onConcluido={() => {
            setModalCSVAberto(false)
            carregarDados()
          }}
        />
      )}
    </div>
  )
}
