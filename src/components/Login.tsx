import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface LoginProps {
  onLoginSucesso: () => void
}

export default function Login({ onLoginSucesso }: LoginProps) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [isCadastro, setIsCadastro] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMensagem(null)

    try {
      if (isCadastro) {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: {
            data: { nome_completo: nome },
          },
        })
        if (error) throw error
        setMensagem({
          tipo: 'sucesso',
          texto: 'Registo concluído! A sua conta precisa de ser ativada por um administrador antes de aceder.',
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: senha,
        })
        if (error) throw error
        onLoginSucesso()
      }
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Falha na autenticação' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-sm w-full p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-md">
        <h1 className="text-xl font-bold text-slate-800 text-center mb-1">Fiscalização de Rua</h1>
        <p className="text-xs text-slate-500 text-center mb-6">
          {isCadastro ? 'Criar nova conta de fiscal' : 'Aceda com a sua conta'}
        </p>

        {mensagem && (
          <div
            className={`p-3 rounded-xl text-xs mb-4 border ${
              mensagem.tipo === 'erro'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isCadastro && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Nome Completo</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Palavra-passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition shadow-sm disabled:opacity-50 mt-2"
          >
            {loading ? 'A processar...' : isCadastro ? 'Criar Conta' : 'Entrar'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsCadastro(!isCadastro)
              setMensagem(null)
            }}
            className="text-xs text-blue-600 hover:underline font-medium"
          >
            {isCadastro ? 'Já tem conta? Iniciar sessão' : 'Novo fiscal? Criar conta'}
          </button>
        </div>
      </div>
    </div>
  )
}
