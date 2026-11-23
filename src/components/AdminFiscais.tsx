import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface PerfilFiscal {
  id: string
  nome_completo: string
  papel: 'fiscal' | 'admin' | 'superadmin'
  ativo: boolean
  created_at?: string
}

export default function AdminFiscais() {
  const [fiscais, setFiscais] = useState<PerfilFiscal[]>([])
  const [meuId, setMeuId] = useState<string | null>(null)
  const [meuPapel, setMeuPapel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processandoId, setProcessandoId] = useState<string | null>(null)

  async function carregarFiscais() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setMeuId(user.id)
      const { data: meuPerfil } = await supabase
        .from('perfis')
        .select('papel')
        .eq('id', user.id)
        .single()
      if (meuPerfil) setMeuPapel(meuPerfil.papel)
    }

    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('ativo', { ascending: true })
      .order('nome_completo', { ascending: true })

    if (!error && data) {
      setFiscais(data as PerfilFiscal[])
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarFiscais()
  }, [])

  async function alternarStatus(fiscal: PerfilFiscal) {
    setProcessandoId(fiscal.id)
    const { error } = await supabase
      .from('perfis')
      .update({ ativo: !fiscal.ativo })
      .eq('id', fiscal.id)

    setProcessandoId(null)
    if (error) {
      alert(`Erro ao atualizar status: ${error.message}`)
      return
    }
    carregarFiscais()
  }

  async function alterarPapel(fiscal: PerfilFiscal, novoPapel: 'fiscal' | 'admin' | 'superadmin') {
    setProcessandoId(fiscal.id)
    const { error } = await supabase
      .from('perfis')
      .update({ papel: novoPapel })
      .eq('id', fiscal.id)

    setProcessandoId(null)
    if (error) {
      alert(`Erro ao alterar papel: ${error.message}`)
      return
    }
    carregarFiscais()
  }

  async function excluirFiscal(fiscal: PerfilFiscal) {
    if (fiscal.id === meuId) {
      alert('Você não pode excluir sua própria conta.')
      return
    }

    const confirmou = window.confirm(
      `Tem certeza que deseja EXCLUIR permanentemente o usuário "${fiscal.nome_completo}"?\n\nEsta ação removerá o cadastro e o login do sistema.`
    )
    if (!confirmou) return

    setProcessandoId(fiscal.id)
    const { error } = await supabase.rpc('excluir_fiscal_completo', {
      target_user_id: fiscal.id,
    })
    setProcessandoId(null)

    if (error) {
      alert(`Erro ao excluir fiscal: ${error.message}`)
      return
    }

    setFiscais((prev) => prev.filter((f) => f.id !== fiscal.id))
  }

  if (loading) {
    return <p className="text-center py-8 text-slate-400 text-xs">A carregar equipa de fiscais...</p>
  }

  return (
    <div className="space-y-3">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Gestão de Fiscais e Acessos ({fiscais.length})
        </h2>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Aprove novos cadastros, defina permissões ou exclua contas não autorizadas.
        </p>
      </div>

      {fiscais.map((fiscal) => {
        const ehProprioUsuario = fiscal.id === meuId
        const podeExcluir = !ehProprioUsuario && (meuPapel === 'superadmin' || fiscal.papel === 'fiscal')

        return (
          <div
            key={fiscal.id}
            className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              !fiscal.ativo ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 text-sm">{fiscal.nome_completo}</span>
                {!fiscal.ativo ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Pendente / Bloqueado
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Ativo
                  </span>
                )}
                {ehProprioUsuario && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                    Você
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Nível:</span>
                <select
                  disabled={ehProprioUsuario || processandoId === fiscal.id || (fiscal.papel === 'superadmin' && meuPapel !== 'superadmin')}
                  value={fiscal.papel}
                  onChange={(e) => alterarPapel(fiscal, e.target.value as 'fiscal' | 'admin' | 'superadmin')}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 text-slate-700 font-medium focus:outline-none"
                >
                  <option value="fiscal">Fiscal</option>
                  <option value="admin">Administrador</option>
                  {meuPapel === 'superadmin' && <option value="superadmin">Superadmin</option>}
                </select>
              </div>
            </div>

            {!ehProprioUsuario && (
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  disabled={processandoId === fiscal.id}
                  onClick={() => alternarStatus(fiscal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    fiscal.ativo
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  }`}
                >
                  {fiscal.ativo ? 'Desativar' : '✓ Aprovar'}
                </button>

                {podeExcluir && (
                  <button
                    disabled={processandoId === fiscal.id}
                    onClick={() => excluirFiscal(fiscal)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                  >
                    Excluir
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
