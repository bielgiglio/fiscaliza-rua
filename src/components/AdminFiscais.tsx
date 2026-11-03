import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface PerfilUsuario {
  id: string
  nome_completo: string
  papel: 'fiscal' | 'admin' | 'superadmin'
  ativo: boolean
  created_at: string
}

export default function AdminFiscais() {
  const [fiscais, setFiscais] = useState<PerfilUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'ativos'>('pendentes')

  async function carregarFiscais() {
    setLoading(true)
    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome_completo, papel, ativo, created_at')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFiscais(data as PerfilUsuario[])
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarFiscais()
  }, [])

  async function alternarStatus(perfil: PerfilUsuario) {
    setAtualizandoId(perfil.id)
    const novoStatus = !perfil.ativo

    const { error } = await supabase
      .from('perfis')
      .update({ ativo: novoStatus })
      .eq('id', perfil.id)

    setAtualizandoId(null)

    if (error) {
      alert(`Erro ao atualizar fiscal: ${error.message}`)
      return
    }

    setFiscais((prev) =>
      prev.map((f) => (f.id === perfil.id ? { ...f, ativo: novoStatus } : f))
    )
  }

  async function alterarPapel(id: string, novoPapel: 'fiscal' | 'admin') {
    setAtualizandoId(id)

    const { error } = await supabase
      .from('perfis')
      .update({ papel: novoPapel })
      .eq('id', id)

    setAtualizandoId(null)

    if (error) {
      alert(`Erro ao alterar papel: ${error.message}`)
      return
    }

    setFiscais((prev) =>
      prev.map((f) => (f.id === id ? { ...f, papel: novoPapel } : f))
    )
  }

  const fiscaisFiltrados = fiscais.filter((f) => {
    if (filtro === 'pendentes') return !f.ativo
    if (filtro === 'ativos') return f.ativo
    return true
  })

  const totalPendentes = fiscais.filter((f) => !f.ativo).length

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Controle de Acesso de Fiscais
          </h2>
          <p className="text-xs text-slate-500">
            Aprove o acesso de novos fiscais ou desative contas
          </p>
        </div>

        <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFiltro('pendentes')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filtro === 'pendentes'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Pendentes ({totalPendentes})
          </button>
          <button
            onClick={() => setFiltro('ativos')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filtro === 'ativos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Ativos ({fiscais.filter((f) => f.ativo).length})
          </button>
          <button
            onClick={() => setFiltro('todos')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filtro === 'todos'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Todos ({fiscais.length})
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center py-10 text-slate-400 text-xs">Carregando usuários...</p>
      ) : fiscaisFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center text-slate-400 border border-slate-200 text-xs">
          Nenhum fiscal encontrado nesta categoria.
        </div>
      ) : (
        <div className="space-y-2.5">
          {fiscaisFiltrados.map((fiscal) => {
            const carregando = atualizandoId === fiscal.id

            return (
              <div
                key={fiscal.id}
                className={`bg-white p-4 rounded-xl border shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  !fiscal.ativo ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">
                      {fiscal.nome_completo || 'Sem nome informado'}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        fiscal.papel === 'superadmin'
                          ? 'bg-purple-100 text-purple-700'
                          : fiscal.papel === 'admin'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {fiscal.papel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">
                    Cadastrado em:{' '}
                    {new Date(fiscal.created_at).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(fiscal.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {fiscal.papel !== 'superadmin' && (
                    <select
                      value={fiscal.papel}
                      onChange={(e) =>
                        alterarPapel(fiscal.id, e.target.value as 'fiscal' | 'admin')
                      }
                      disabled={carregando}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-700 focus:outline-none"
                    >
                      <option value="fiscal">Fiscal</option>
                      <option value="admin">Administrador</option>
                    </select>
                  )}

                  {fiscal.papel !== 'superadmin' && (
                    <button
                      onClick={() => alternarStatus(fiscal)}
                      disabled={carregando}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition active:scale-95 disabled:opacity-50 ${
                        fiscal.ativo
                          ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                      }`}
                    >
                      {carregando
                        ? 'Atualizando...'
                        : fiscal.ativo
                        ? 'Bloquear Acesso'
                        : 'Aprovar Acesso'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
