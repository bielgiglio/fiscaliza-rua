import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

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
  conserv_id: string
}

interface RegistoHistorico {
  id: string
  created_at: string
  data_referencia: string
  status: string
  detalhe_localizacao: string | null
  epi_correto: boolean
  funcionario: {
    nome: string
    codigo: string
    empresa: string
    funcao_exercida: string
    conserv: {
      nome: string
    }
  }
}

type TipoStatus = 'presente' | 'falta' | 'folga' | 'ferias' | 'inss' | 'cedido' | 'outros'

export default function App() {
  const [abaAtual, setAbaAtual] = useState<'fiscalizar' | 'historico'>('fiscalizar')

  // Estados de Fiscalização
  const [conservs, setConservs] = useState<Conserv[]>([])
  const [conservSelecionado, setConservSelecionado] = useState<Conserv | null>(null)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([])
  const [statusHojeMap, setStatusHojeMap] = useState<Record<string, { status: TipoStatus; epi: boolean }>>({})
  
  const [loading, setLoading] = useState(true)
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroFuncao, setFiltroFuncao] = useState('todas')
  const [filtroAuditoria, setFiltroAuditoria] = useState<'todos' | 'pendentes' | 'auditados'>('todos')

  // Modal de fiscalização
  const [funcionarioAtivo, setFuncionarioAtivo] = useState<Funcionario | null>(null)
  const [statusSelecionado, setStatusSelecionado] = useState<TipoStatus | null>(null)
  const [detalheLocal, setDetalheLocal] = useState('')
  const [epiCorreto, setEpiCorreto] = useState<boolean>(true)

  // Estados do Histórico
  const [historico, setHistorico] = useState<RegistoHistorico[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0])
  const [conservFiltro, setConservFiltro] = useState<string>('todos')

  useEffect(() => {
    async function carregarConservs() {
      const { data, error } = await supabase
        .from('conservs')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')

      if (!error && data) setConservs(data)
      setLoading(false)
    }
    carregarConservs()
  }, [])

  // Carrega funcionários e os registros já feitos hoje para este setor
  async function abrirConserv(conserv: Conserv) {
    setConservSelecionado(conserv)
    setLoadingFuncionarios(true)
    setBusca('')
    setFiltroFuncao('todas')
    setFiltroAuditoria('todos')

    const dataHoje = new Date().toISOString().split('T')[0]

    // Busca funcionários ativos do Conserv
    const { data: funcsData } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('conserv_id', conserv.id)
      .eq('ativo', true)
      .order('nome')

    // Busca fiscalizações já registradas hoje
    const { data: fiscData } = await supabase
      .from('fiscalizacoes_diarias')
      .select('funcionario_id, status, epi_correto')
      .eq('data_referencia', dataHoje)

    if (fiscData) {
      const mapa: Record<string, { status: TipoStatus; epi: boolean }> = {}
      fiscData.forEach((item: any) => {
        mapa[item.funcionario_id] = {
          status: item.status as TipoStatus,
          epi: item.epi_correto,
        }
      })
      setStatusHojeMap(mapa)
    }

    if (funcsData) setFuncionarios(funcsData)
    setLoadingFuncionarios(false)
  }

  function abrirModalFiscalizacao(func: Funcionario) {
    setFuncionarioAtivo(func)
    const fiscalizacaoExistente = statusHojeMap[func.id]
    if (fiscalizacaoExistente) {
      setStatusSelecionado(fiscalizacaoExistente.status)
      setEpiCorreto(fiscalizacaoExistente.epi)
    } else {
      setStatusSelecionado(null)
      setEpiCorreto(true)
    }
    setDetalheLocal('')
  }

  function fecharModal() {
    setFuncionarioAtivo(null)
    setStatusSelecionado(null)
    setDetalheLocal('')
  }

  async function confirmarEGravar() {
    if (!funcionarioAtivo || !statusSelecionado) return

    if ((statusSelecionado === 'cedido' || statusSelecionado === 'outros') && !detalheLocal.trim()) {
      alert(`Por favor, especifique o detalhe/local para o status "${statusSelecionado.toUpperCase()}".`)
      return
    }

    setSalvando(true)
    const dataHoje = new Date().toISOString().split('T')[0]

    const payload = {
      funcionario_id: funcionarioAtivo.id,
      data_referencia: dataHoje,
      status: statusSelecionado,
      detalhe_localizacao: detalheLocal.trim() || null,
      epi_correto: epiCorreto,
    }

    const { error } = await supabase
      .from('fiscalizacoes_diarias')
      .upsert(payload, { onConflict: 'funcionario_id,data_referencia' })

    setSalvando(false)

    if (error) {
      alert(`Erro ao guardar registo: ${error.message}`)
      return
    }

    // Atualiza o mapa visual imediatamente na tela
    setStatusHojeMap((prev) => ({
      ...prev,
      [funcionarioAtivo.id]: {
        status: statusSelecionado,
        epi: epiCorreto,
      },
    }))

    fecharModal()
  }

  async function carregarHistorico() {
    setLoadingHistorico(true)

    const query = supabase
      .from('fiscalizacoes_diarias')
      .select(`
        id,
        created_at,
        data_referencia,
        status,
        detalhe_localizacao,
        epi_correto,
        funcionario:funcionarios (
          nome,
          codigo,
          empresa,
          funcao_exercida,
          conserv:conservs ( nome )
        )
      `)
      .eq('data_referencia', dataFiltro)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (!error && data) {
      setHistorico(data as unknown as RegistoHistorico[])
    }
    setLoadingHistorico(false)
  }

  useEffect(() => {
    if (abaAtual === 'historico') {
      carregarHistorico()
    }
  }, [abaAtual, dataFiltro])

  function descarregarCSV() {
    if (historico.length === 0) {
      alert('Sem dados disponíveis para exportar nesta data.')
      return
    }

    const colunas = ['Hora', 'Data', 'Funcionário', 'Código', 'Empresa', 'Conserv', 'Função', 'Estado', 'Detalhes', 'EPI Conforme']
    const linhas = historico.map((r) => [
      new Date(r.created_at).toLocaleTimeString('pt-BR'),
      r.data_referencia,
      `"${r.funcionario?.nome || ''}"`,
      `"${r.funcionario?.codigo || ''}"`,
      `"${r.funcionario?.empresa || ''}"`,
      `"${r.funcionario?.conserv?.nome || ''}"`,
      `"${r.funcionario?.funcao_exercida || ''}"`,
      r.status.toUpperCase(),
      `"${r.detalhe_localizacao || ''}"`,
      r.epi_correto ? 'SIM' : 'NÃO',
    ])

    const conteudoCSV = [colunas.join(','), ...linhas.map((e) => e.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + conteudoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `relatorio_fiscalizacao_${dataFiltro}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const funcoesDisponiveis = Array.from(
    new Set(funcionarios.map((f) => f.funcao_exercida))
  ).filter(Boolean)

  // Filtros combinados: Texto, Função e Status de Auditoria
  const funcionariosFiltrados = funcionarios.filter((f) => {
    const termo = busca.toLowerCase()
    const coincideTexto =
      f.nome.toLowerCase().includes(termo) ||
      f.empresa.toLowerCase().includes(termo)
    const coincideFuncao = filtroFuncao === 'todas' || f.funcao_exercida === filtroFuncao

    const estaAuditado = !!statusHojeMap[f.id]
    let coincideAuditoria = true
    if (filtroAuditoria === 'pendentes') coincideAuditoria = !estaAuditado
    if (filtroAuditoria === 'auditados') coincideAuditoria = estaAuditado

    return coincideTexto && coincideFuncao && coincideAuditoria
  })

  const totalAuditados = Object.keys(statusHojeMap).filter((id) =>
    funcionarios.some((f) => f.id === id)
  ).length

  const historicoFiltrado = historico.filter((reg) => {
    if (conservFiltro === 'todos') return true
    return reg.funcionario?.conserv?.nome === conservFiltro
  })

  // Estilização dos badges de status
  function renderBadgeStatus(status: TipoStatus) {
    switch (status) {
      case 'presente':
        return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Presente</span>
      case 'falta':
        return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">✕ Falta</span>
      case 'cedido':
        return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Cedido</span>
      case 'outros':
        return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Outros</span>
      case 'folga':
      case 'ferias':
      case 'inss':
        return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 uppercase">{status}</span>
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Barra Superior */}
        <header className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Fiscalização de Rua</h1>
            <p className="text-xs text-slate-500">Gestão e controlo operacional em tempo real</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAbaAtual('fiscalizar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                abaAtual === 'fiscalizar'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Fiscalizar
            </button>
            <button
              onClick={() => setAbaAtual('historico')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                abaAtual === 'historico'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              Histórico / Relatório
            </button>
          </div>
        </header>

        {/* ABA: FISCALIZAÇÃO */}
        {abaAtual === 'fiscalizar' && (
          <>
            {!conservSelecionado ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <h2 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-3">
                  Selecione o seu Conserv
                </h2>

                {loading && <p className="text-center py-6 text-slate-400">A carregar setores...</p>}

                <div className="space-y-2">
                  {conservs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => abrirConserv(c)}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 flex justify-between items-center transition group"
                    >
                      <span className="font-medium text-slate-700 group-hover:text-blue-700">
                        {c.nome}
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-medium px-2.5 py-1 rounded-full">
                        Aceder &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Painel do Setor, Estatísticas e Filtros */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md mr-2">
                        {conservSelecionado.nome}
                      </span>
                      <button
                        onClick={() => setConservSelecionado(null)}
                        className="text-xs text-slate-500 underline hover:text-slate-800"
                      >
                        Trocar Setor
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">
                      Progresso: {totalAuditados} / {funcionarios.length}
                    </span>
                  </div>

                  {/* Barra de Progresso do Dia */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${funcionarios.length ? (totalAuditados / funcionarios.length) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  {/* Input de Busca */}
                  <input
                    type="text"
                    placeholder="Pesquisar por nome ou empresa..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  {/* Filtro Rápido de Auditoria (Todos, Pendentes, Auditados) */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-center">
                    <button
                      onClick={() => setFiltroAuditoria('todos')}
                      className={`py-1.5 rounded-lg transition ${
                        filtroAuditoria === 'todos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Todos ({funcionarios.length})
                    </button>
                    <button
                      onClick={() => setFiltroAuditoria('pendentes')}
                      className={`py-1.5 rounded-lg transition ${
                        filtroAuditoria === 'pendentes' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Pendentes ({funcionarios.length - totalAuditados})
                    </button>
                    <button
                      onClick={() => setFiltroAuditoria('auditados')}
                      className={`py-1.5 rounded-lg transition ${
                        filtroAuditoria === 'auditados' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      Auditados ({totalAuditados})
                    </button>
                  </div>

                  {/* Pílulas de Filtro por Função */}
                  {funcoesDisponiveis.length > 0 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                      <button
                        onClick={() => setFiltroFuncao('todas')}
                        className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition ${
                          filtroFuncao === 'todas'
                            ? 'bg-slate-800 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Todas as Funções
                      </button>
                      {funcoesDisponiveis.map((f) => (
                        <button
                          key={f}
                          onClick={() => setFiltroFuncao(f)}
                          className={`px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition ${
                            filtroFuncao === f
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lista de Cartões com Indicador Visual */}
                {loadingFuncionarios ? (
                  <p className="text-center py-10 text-slate-400">A carregar funcionários...</p>
                ) : funcionariosFiltrados.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
                    Nenhum funcionário encontrado para os filtros selecionados.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {funcionariosFiltrados.map((func) => {
                      const auditoria = statusHojeMap[func.id]
                      const auditado = !!auditoria

                      return (
                        <div
                          key={func.id}
                          onClick={() => abrirModalFiscalizacao(func)}
                          className={`bg-white p-4 rounded-xl border shadow-sm active:scale-[0.99] transition cursor-pointer flex items-center justify-between ${
                            auditado ? 'border-slate-300 bg-slate-50/50' : 'border-slate-200 hover:border-blue-400'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-base">{func.nome}</span>
                            </div>
                            <p className="text-xs text-blue-600 font-medium mt-0.5">
                              {func.funcao_exercida || func.funcao_carteira}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{func.empresa}</p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            {auditado ? (
                              <>
                                {renderBadgeStatus(auditoria.status)}
                                <span className="text-[10px] text-slate-400">Tocar para alterar</span>
                              </>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                                Pendente
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ABA: HISTÓRICO */}
        {abaAtual === 'historico' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Filtros do Relatório
                </span>
                <button
                  onClick={descarregarCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
                >
                  Descarregar Excel (CSV)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-slate-500 font-medium block mb-1">Data:</label>
                  <input
                    type="date"
                    value={dataFiltro}
                    onChange={(e) => setDataFiltro(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-500 font-medium block mb-1">Setor (Conserv):</label>
                  <select
                    value={conservFiltro}
                    onChange={(e) => setConservFiltro(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none bg-white"
                  >
                    <option value="todos">Todos os setores</option>
                    {conservs.map((c) => (
                      <option key={c.id} value={c.nome}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loadingHistorico ? (
              <p className="text-center py-10 text-slate-400">A carregar dados do histórico...</p>
            ) : historicoFiltrado.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200">
                Nenhum registo de fiscalização encontrado nesta data.
              </div>
            ) : (
              <div className="space-y-2">
                {historicoFiltrado.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-slate-800 text-sm">
                          {item.funcionario?.nome}
                        </span>
                        <p className="text-[11px] text-slate-500">
                          {item.funcionario?.conserv?.nome} • {item.funcionario?.funcao_exercida}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          item.status === 'presente'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'falta'
                            ? 'bg-rose-100 text-rose-800'
                            : item.status === 'cedido' || item.status === 'outros'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 mt-0.5">
                      <span>EPI: {item.epi_correto ? '✓ Conforme' : '✕ Irregular'}</span>
                      <span>
                        Registo: {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {item.detalhe_localizacao && (
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded-md">
                        <strong>Obs/Destino:</strong> {item.detalhe_localizacao}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL DE FISCALIZAÇÃO */}
        {funcionarioAtivo && (
          <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
              {/* Topo do Modal */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{funcionarioAtivo.nome}</h3>
                  <p className="text-xs text-slate-500">{funcionarioAtivo.empresa}</p>
                </div>
                <button
                  onClick={fecharModal}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
                >
                  ✕
                </button>
              </div>

              {/* Informações Internas */}
              <div className="bg-slate-50 p-3 rounded-xl mb-4 text-xs space-y-1 text-slate-600 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-400">Código Interno:</span>
                  <span className="font-semibold text-slate-800">{funcionarioAtivo.codigo || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Função Exercida:</span>
                  <span className="font-semibold text-slate-700">{funcionarioAtivo.funcao_exercida}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Admissão:</span>
                  <span className="font-semibold text-slate-700">{funcionarioAtivo.data_admissao}</span>
                </div>
              </div>

              {/* Seletor de EPI */}
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                  Uso de EPI Adequado?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEpiCorreto(true)}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      epiCorreto
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    ✓ Sim (Conforme)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEpiCorreto(false)}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      !epiCorreto
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    ✕ Não / Irregular
                  </button>
                </div>
              </div>

              {/* SELEÇÃO DO STATUS */}
              <div className="space-y-2 mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  1. Selecione o Status de Hoje:
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatusSelecionado('presente')}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition ${
                      statusSelecionado === 'presente'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {statusSelecionado === 'presente' ? '✓ Presente' : 'Presente'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusSelecionado('falta')}
                    className={`py-3 rounded-xl font-bold text-sm border-2 transition ${
                      statusSelecionado === 'falta'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-300'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {statusSelecionado === 'falta' ? '✓ Falta' : 'Falta'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStatusSelecionado('cedido')}
                    className={`py-2.5 rounded-xl font-semibold text-xs border-2 transition ${
                      statusSelecionado === 'cedido'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {statusSelecionado === 'cedido' ? '✓ Cedido' : 'Cedido'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusSelecionado('outros')}
                    className={`py-2.5 rounded-xl font-semibold text-xs border-2 transition ${
                      statusSelecionado === 'outros'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {statusSelecionado === 'outros' ? '✓ Outros' : 'Outros'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setStatusSelecionado('folga')}
                    className={`py-2.5 rounded-xl font-semibold text-xs border-2 transition ${
                      statusSelecionado === 'folga'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-md ring-2 ring-slate-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {statusSelecionado === 'folga' ? '✓ Folga' : 'Folga'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusSelecionado('ferias')}
                    className={`py-2.5 rounded-xl font-semibold text-xs border-2 transition ${
                      statusSelecionado === 'ferias'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-md ring-2 ring-slate-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {statusSelecionado === 'ferias' ? '✓ Férias' : 'Férias'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusSelecionado('inss')}
                    className={`py-2.5 rounded-xl font-semibold text-xs border-2 transition ${
                      statusSelecionado === 'inss'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-md ring-2 ring-slate-400'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {statusSelecionado === 'inss' ? '✓ INSS' : 'INSS'}
                  </button>
                </div>
              </div>

              {/* CAMPO ESPECÍFICO SE CEDIDO OU OUTROS */}
              {(statusSelecionado === 'cedido' || statusSelecionado === 'outros') && (
                <div className="space-y-1.5 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <label className="text-xs font-bold text-amber-800 block">
                    {statusSelecionado === 'cedido' ? 'Para onde ele foi cedido?' : 'Especifique o motivo:'}
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder={
                      statusSelecionado === 'cedido'
                        ? 'Ex: Cedido para o Conserv Centro...'
                        : 'Ex: Atestado médico de 2 dias...'
                    }
                    value={detalheLocal}
                    onChange={(e) => setDetalheLocal(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-amber-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  />
                </div>
              )}

              {/* GRANDE BOTÃO FINAL DE CONFIRMAÇÃO */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={!statusSelecionado || salvando}
                  onClick={confirmarEGravar}
                  className={`w-full py-4 rounded-2xl font-bold text-base shadow-lg transition active:scale-[0.98] ${
                    !statusSelecionado
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      : statusSelecionado === 'falta'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                      : statusSelecionado === 'presente'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                  }`}
                >
                  {salvando
                    ? 'A registar no sistema...'
                    : !statusSelecionado
                    ? 'Selecione um status acima para confirmar'
                    : `Confirmar e Salvar (${statusSelecionado.toUpperCase()})`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
