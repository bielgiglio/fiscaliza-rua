import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { gerarFichaFuncionarioPDF } from '../lib/gerarRelatorioPDF'
import { buscarTodosFuncionarios } from '../lib/buscarTodosFuncionarios'

interface FuncionarioResumo {
  id: string
  nome: string
  codigo: string | null
  empresa: string
  funcao_exercida: string
  ativo: boolean
  conserv?: {
    nome: string
  }
}

interface ApontamentoIndividual {
  id: string
  created_at: string
  data_referencia: string
  status: string
  detalhe_localizacao: string | null
  epi_correto: boolean
  fiscal?: {
    nome_completo: string
  }
}

interface TransferenciaSetor {
  id: string
  created_at: string
  origem?: { nome: string } | null
  destino?: { nome: string } | null
  responsavel?: { nome_completo: string } | null
}

export default function HistoricoFuncionario() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioResumo[]>([])
  const [busca, setBusca] = useState('')
  const [funcionarioSelecionado, setFuncionarioSelecionado] = useState<FuncionarioResumo | null>(null)

  const [apontamentos, setApontamentos] = useState<ApontamentoIndividual[]>([])
  const [transferencias, setTransferencias] = useState<TransferenciaSetor[]>([])
  const [loadingLista, setLoadingLista] = useState(true)
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  // Filtro opcional por intervalo de datas
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
  async function carregarFuncionarios() {
    setLoadingLista(true)
    try {
      const lista = await buscarTodosFuncionarios()
      setFuncionarios(lista as unknown as FuncionarioResumo[])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingLista(false)
    }
  }
  carregarFuncionarios()
}, [])


  useEffect(() => {
    if (!funcionarioSelecionado) return

    async function carregarDadosCompletos() {
      setLoadingHistorico(true)

      // 1. Consulta fiscalizações
      let queryFisc = supabase
        .from('fiscalizacoes_diarias')
        .select(`
          id,
          created_at,
          data_referencia,
          status,
          detalhe_localizacao,
          epi_correto,
          fiscal:perfis!fiscal_id ( nome_completo )
        `)
        .eq('funcionario_id', funcionarioSelecionado!.id)
        .order('data_referencia', { ascending: false })

      if (dataInicio) queryFisc = queryFisc.gte('data_referencia', dataInicio)
      if (dataFim) queryFisc = queryFisc.lte('data_referencia', dataFim)

      // 2. Consulta histórico de transferências de setor
      const queryTransf = supabase
        .from('historico_transferencias')
        .select(`
          id,
          created_at,
          origem:conservs!conserv_origem_id ( nome ),
          destino:conservs!conserv_destino_id ( nome ),
          responsavel:perfis!alterado_por ( nome_completo )
        `)
        .eq('funcionario_id', funcionarioSelecionado!.id)
        .order('created_at', { ascending: false })

      const [resFisc, resTransf] = await Promise.all([queryFisc, queryTransf])

      if (!resFisc.error && resFisc.data) {
        setApontamentos(resFisc.data as unknown as ApontamentoIndividual[])
      }
      if (!resTransf.error && resTransf.data) {
        setTransferencias(resTransf.data as unknown as TransferenciaSetor[])
      }

      setLoadingHistorico(false)
    }

    carregarDadosCompletos()
  }, [funcionarioSelecionado, dataInicio, dataFim])

  const totalVisitas = apontamentos.length
  const totalPresentes = apontamentos.filter((a) => a.status === 'presente').length
  const totalFaltas = apontamentos.filter((a) => a.status === 'falta').length
  const totalOutros = totalVisitas - (totalPresentes + totalFaltas)
  const epiConforme = apontamentos.filter((a) => a.epi_correto).length

  const taxaPresenca = totalVisitas > 0 ? Math.round((totalPresentes / totalVisitas) * 100) : 0
  const taxaEpi = totalVisitas > 0 ? Math.round((epiConforme / totalVisitas) * 100) : 0

  const sugestoesFiltradas = busca.trim()
    ? funcionarios.filter((f) => {
        const termo = busca.toLowerCase()
        return (
          f.nome.toLowerCase().includes(termo) ||
          (f.codigo && f.codigo.toLowerCase().includes(termo)) ||
          f.empresa.toLowerCase().includes(termo)
        )
      })
    : []

  function formatarDataBR(dataISO: string) {
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function exportarFichaPDF() {
    if (!funcionarioSelecionado || apontamentos.length === 0) return

    gerarFichaFuncionarioPDF({
      funcionario: funcionarioSelecionado,
      apontamentos,
      dataInicio,
      dataFim,
    })
  }

  function exportarFichaCSV() {
    if (!funcionarioSelecionado || apontamentos.length === 0) return

    const colunas = ['Data', 'Hora', 'Status', 'EPI Conforme', 'Observacao/Destino', 'Fiscal']
    const linhas = apontamentos.map((a) => [
      formatarDataBR(a.data_referencia),
      new Date(a.created_at).toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      }),
      a.status.toUpperCase(),
      a.epi_correto ? 'SIM' : 'NAO',
      `"${a.detalhe_localizacao || ''}"`,
      `"${a.fiscal?.nome_completo || ''}"`,
    ])

    const csv = [colunas.join(','), ...linhas.map((l) => l.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `dossie_${funcionarioSelecionado.nome.replace(/\s+/g, '_')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* Caixa de Busca do Operário */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Dossiê Individual do Funcionário
          </h2>
          <p className="text-[11px] text-slate-400">
            Compare o histórico de presenças, EPI e transferências de setor
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder={
              loadingLista
                ? 'A carregar lista de operários...'
                : 'Digite o nome ou matrícula do funcionário...'
            }
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              if (funcionarioSelecionado) setFuncionarioSelecionado(null)
            }}
            className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />

          {/* Lista suspensa de resultados */}
          {busca.trim() !== '' && !funcionarioSelecionado && (
            <div className="mt-1.5 max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-md">
              {sugestoesFiltradas.length === 0 ? (
                <p className="p-3 text-xs text-slate-400 text-center">
                  Nenhum funcionário encontrado.
                </p>
              ) : (
                sugestoesFiltradas.slice(0, 15).map((func) => (
                  <button
                    key={func.id}
                    type="button"
                    onClick={() => {
                      setFuncionarioSelecionado(func)
                      setBusca(func.nome)
                    }}
                    className="w-full text-left p-3 hover:bg-blue-50 transition flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {func.nome}{' '}
                        {!func.ativo && (
                          <span className="text-[10px] text-rose-600 font-semibold">(Inativo)</span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {func.funcao_exercida} • {func.conserv?.nome || 'Sem setor'}
                      </span>
                    </div>
                    {func.codigo && (
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {func.codigo}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Painel do Funcionário Selecionado */}
      {funcionarioSelecionado && (
        <>
          {/* Cartão Cadastral + Filtros de Data */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-800">{funcionarioSelecionado.nome}</h3>
                  {funcionarioSelecionado.codigo && (
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                      Cód: {funcionarioSelecionado.codigo}
                    </span>
                  )}
                </div>
                <p className="text-xs text-blue-600 font-medium">
                  {funcionarioSelecionado.funcao_exercida} • Setor atual:{' '}
                  <strong>{funcionarioSelecionado.conserv?.nome || 'Não definido'}</strong>
                </p>
                <p className="text-[11px] text-slate-400">{funcionarioSelecionado.empresa}</p>
              </div>

              {apontamentos.length > 0 && (
                <div className="flex gap-2 shrink-0 self-start sm:self-center">
                  <button
                    onClick={exportarFichaPDF}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    Exportar PDF
                  </button>
                  <button
                    onClick={exportarFichaCSV}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition active:scale-95"
                  >
                    Exportar CSV
                  </button>
                </div>
              )}
            </div>

            {/* Filtro de Período Opcional */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-slate-500 text-[11px] block mb-1">De:</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-500 text-[11px] block mb-1">Até:</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* KPIs Proporcionais às Fiscalizações */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                Vezes Fiscalizado
              </span>
              <span className="text-lg font-extrabold text-slate-800">{totalVisitas}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
              <span className="text-[10px] font-bold uppercase text-emerald-600 block">
                Presenças ({taxaPresenca}%)
              </span>
              <span className="text-lg font-extrabold text-emerald-700">{totalPresentes}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
              <span className="text-[10px] font-bold uppercase text-rose-600 block">
                Faltas / Outros
              </span>
              <span className="text-lg font-extrabold text-rose-700">
                {totalFaltas}{' '}
                <span className="text-xs font-semibold text-amber-600">
                  {totalOutros > 0 ? `(+${totalOutros})` : ''}
                </span>
              </span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-sm">
              <span className="text-[10px] font-bold uppercase text-blue-600 block">
                Conformidade EPI
              </span>
              <span className="text-lg font-extrabold text-blue-700">{taxaEpi}%</span>
            </div>
          </div>

          {/* Bloco de Histórico de Transferências de Setor */}
          {transferencias.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Histórico de Movimentação de Setor ({transferencias.length})
              </h4>
              <div className="space-y-2">
                {transferencias.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                  >
                    <div>
                      <span className="text-slate-500">De: </span>
                      <strong className="text-slate-700">{t.origem?.nome || 'Sem setor'}</strong>
                      <span className="mx-1.5 text-blue-600 font-bold">&rarr;</span>
                      <span className="text-slate-500">Para: </span>
                      <strong className="text-blue-700">{t.destino?.nome || 'Não definido'}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(t.created_at).toLocaleDateString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                      })}{' '}
                      às{' '}
                      {new Date(t.created_at).toLocaleTimeString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {t.responsavel?.nome_completo && ` • Por ${t.responsavel.nome_completo}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linha do Tempo de Auditorias */}
          {loadingHistorico ? (
            <p className="text-center py-8 text-xs text-slate-400">
              A carregar histórico de fiscalizações...
            </p>
          ) : apontamentos.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Este funcionário ainda não possui fiscalizações registadas neste período.
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Registos de Fiscalização ({apontamentos.length})
              </h4>
              {apontamentos.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {formatarDataBR(item.data_referencia)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        às{' '}
                        {new Date(item.created_at).toLocaleTimeString('pt-BR', {
                          timeZone: 'America/Sao_Paulo',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
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

                  <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-1.5">
                    <span>
                      EPI:{' '}
                      <strong className={item.epi_correto ? 'text-emerald-700' : 'text-rose-600'}>
                        {item.epi_correto ? '✓ Conforme' : '✕ Irregular'}
                      </strong>
                    </span>
                    <span>
                      Fiscal: <strong>{item.fiscal?.nome_completo || 'Não identificado'}</strong>
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
        </>
      )}
    </div>
  )
}
