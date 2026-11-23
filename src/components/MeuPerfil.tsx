import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface MeuPerfilProps {
  usuario: any
  perfil: {
    papel: string
    ativo: boolean
    nome_completo: string
  } | null
  onNomeAtualizado: (novoNome: string) => void
}

export default function MeuPerfil({ usuario, perfil, onNomeAtualizado }: MeuPerfilProps) {
  const [nomeCompleto, setNomeCompleto] = useState(perfil?.nome_completo || '')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [msgNome, setMsgNome] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgSenha, setMsgSenha] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  async function handleAtualizarNome(e: React.FormEvent) {
    e.preventDefault()
    setMsgNome(null)

    if (!nomeCompleto.trim()) {
      setMsgNome({ tipo: 'erro', texto: 'O nome completo não pode ficar em branco.' })
      return
    }

    setSalvandoNome(true)
    try {
      const { error: perfilError } = await supabase
        .from('perfis')
        .update({ nome_completo: nomeCompleto.trim() })
        .eq('id', usuario.id)

      if (perfilError) throw perfilError

      await supabase.auth.updateUser({
        data: { nome_completo: nomeCompleto.trim() },
      })

      onNomeAtualizado(nomeCompleto.trim())
      setMsgNome({ tipo: 'sucesso', texto: 'Nome atualizado com sucesso!' })
    } catch (err: any) {
      setMsgNome({ tipo: 'erro', texto: err.message || 'Erro ao atualizar o nome.' })
    } finally {
      setSalvandoNome(false)
    }
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault()
    setMsgSenha(null)

    if (novaSenha.length < 6) {
      setMsgSenha({ tipo: 'erro', texto: 'A nova senha deve ter pelo menos 6 caracteres.' })
      return
    }

    if (novaSenha !== confirmarNovaSenha) {
      setMsgSenha({ tipo: 'erro', texto: 'As senhas digitadas não coincidem.' })
      return
    }

    setSalvandoSenha(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: novaSenha,
      })

      if (error) throw error

      setNovaSenha('')
      setConfirmarNovaSenha('')
      setMsgSenha({ tipo: 'sucesso', texto: 'Senha alterada com sucesso!' })
    } catch (err: any) {
      setMsgSenha({ tipo: 'erro', texto: err.message || 'Erro ao alterar a senha.' })
    } finally {
      setSalvandoSenha(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Dados da Conta */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Dados do Perfil
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Informações da sua conta de acesso ao Fiscaliza Rua
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block">E-mail cadastrado:</span>
            <span className="font-semibold text-slate-800 break-all">{usuario?.email}</span>
          </div>
          <div>
            <span className="text-slate-400 block">Nível de Permissão:</span>
            <span className="font-bold uppercase text-blue-700">{perfil?.papel}</span>
          </div>
        </div>

        {msgNome && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              msgNome.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {msgNome.texto}
          </div>
        )}

        <form onSubmit={handleAtualizarNome} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nome Completo (exibido nos relatórios)
            </label>
            <input
              type="text"
              required
              value={nomeCompleto}
              onChange={(e) => setNomeCompleto(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={salvandoNome}
            className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
          >
            {salvandoNome ? 'A guardar...' : 'Salvar Nome'}
          </button>
        </form>
      </div>

      {/* Alteração de Senha */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Segurança e Senha
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Defina uma nova senha de acesso ao sistema
          </p>
        </div>

        {msgSenha && (
          <div
            className={`p-3 rounded-xl text-xs border ${
              msgSenha.tipo === 'sucesso'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            {msgSenha.texto}
          </div>
        )}

        <form onSubmit={handleAlterarSenha} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              placeholder="Digite a nova senha novamente"
              value={confirmarNovaSenha}
              onChange={(e) => setConfirmarNovaSenha(e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                confirmarNovaSenha && novaSenha !== confirmarNovaSenha
                  ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                  : 'border-slate-200 focus:ring-blue-500'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={salvandoSenha}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
          >
            {salvandoSenha ? 'A alterar senha...' : 'Atualizar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
