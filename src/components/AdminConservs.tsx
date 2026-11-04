import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Conserv {
  id: string
  nome: string
  coordenador_nome: string | null
  ativo: boolean
  created_at: string
}

export default function AdminConservs() {
  const [conservs, setConservs] = useState<Conserv[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  
  // Modal de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [conservEdicao, setConservEdicao] = useState<Conserv | null>(null)
  
  // Campos do formulário
  const [nome, setNome] = useState('')
  const [coordenadorNome, setCoordenadorNome] = useState('')
  const [ativo, setAtivo] = useState(true)

  async function carregarConservs() {
    setLoading(true)
    const { data, error } = await supabase
      .from('conservs')
      .select('*')
      .order('nome')

    if (!error && data) {
      setConservs(data as Conserv[])
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarConservs()
  }, [])

  function abrirModalNovo() {
    setConservEdicao(null)
    setNome('')
    setCoordenadorNome('')
    setAtivo(true)
    setModalAberto(true)
  }

  function abrirModalEditar(c: Conserv) {
    setConservEdicao(c)
    setNome(c.nome)
    setCoordenadorNome(c.coordenador_nome || '')
    setAtivo(c.ativo)
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setConservEdicao(null)
  }

  async function guardarConserv(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) {
      alert('Informe o nome do Conserv.')
      return
    }

    setSalvando(true)

    const payload = {
      nome: nome.trim(),
      coordenador_nome: coordenadorNome.trim() || null,
      ativo: ativo,
    }

    if (conservEdicao) {
      const { error } = await supabase
        .from('conservs')
        .update(payload)
        .eq('id', conservEdicao.id)

      setSalvando(false)
      if (error) {
        alert(`Erro ao atualizar setor: ${error.message}`)
        return
      }
    } else {
      const { error } = await supabase
        .from('conservs')
        .insert(payload)

      setSalvando(false)
      if (error) {
        alert(`Erro ao cadastrar setor: ${error.message}`)
        return
      }
    }

    fecharModal()
    carregarConservs()
  }

  async function alternarStatus(c: Conserv) {
    const acao = c.ativo ? 'desativar' : 'reativar'
    if (!window.confirm(`Tem certeza que deseja ${acao} o setor ${c.nome}?`)) return

    const { error } = await supabase
      .from('conservs')
      .update({ ativo: !c.ativo })
      .eq('id', c.id)

    if (error) {
      alert(`Erro: ${error.message}`)
      return
    }

    carregarConservs()
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Gestão de Setores (Conservs)
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre novos setores e vincule os coordenadores responsáveis
          </p>
        </div>

        <button
          onClick={abrirModalNovo}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 shrink-0"
        >
          + Novo Conserv
        </button>
      </div>

      {/* Lista de Conservs */}
      {loading ? (
        <p className="text-center py-10 text-slate-400 text-xs">A carregar setores...</p>
      ) : conservs.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200 text-xs">
          Nenhum Conserv cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {conservs.map((c) => (
            <div
              key={c.id}
              className={`p-4 rounded-xl border shadow-sm bg-white flex flex-col justify-between gap-3 ${
                !c.ativo ? 'opacity-60 border-slate-200 bg-slate-50' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 text-sm">{c.nome}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      c.ativo
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-xs text-slate-600">
                  Coordenador:{' '}
                  <strong className="text-blue-700">
                    {c.coordenador_nome || 'Não definido'}
                  </strong>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 justify-end">
                <button
                  onClick={() => abrirModalEditar(c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => alternarStatus(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    c.ativo
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {c.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação / Edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {conservEdicao ? 'Editar Conserv' : 'Novo Conserv'}
                </h3>
                <p className="text-xs text-slate-500">Defina o nome do setor e o coordenador</p>
              </div>
              <button
                onClick={fecharModal}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarConserv} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome do Setor / Conserv *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conserv Centro, Conserv Itaipuaçu..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nome do Coordenador Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={coordenadorNome}
                  onChange={(e) => setCoordenadorNome(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Setor Ativo no Sistema?</span>
                <button
                  type="button"
                  onClick={() => setAtivo(!ativo)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                    ativo
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {ativo ? 'Sim (Ativo)' : 'Não (Inativo)'}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {salvando ? 'A guardar...' : conservEdicao ? 'Atualizar Conserv' : 'Criar Conserv'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
