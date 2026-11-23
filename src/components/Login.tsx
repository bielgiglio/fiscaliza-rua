import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface LoginProps {
  onLoginSucesso: () => void
}

export default function Login({ onLoginSucesso }: LoginProps) {
  const [modoCadastro, setModoCadastro] = useState(false)
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setMensagemSucesso(null)

    if (modoCadastro) {
      if (!nomeCompleto.trim()) {
        setErro('Por favor, informe o seu nome completo.')
        return
      }
      if (senha.length < 6) {
        setErro('A senha deve ter pelo menos 6 caracteres.')
        return
      }
      if (senha !== confirmarSenha) {
        setErro('As senhas digitadas não coincidem. Verifique e tente novamente.')
        return
      }
    }

    setLoading(true)

    try {
      if (modoCadastro) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              nome_completo: nomeCompleto.trim(),
            },
          },
        })

        if (signUpError) throw signUpError

        if (data.user) {
          await supabase.from('perfis').upsert({
            id: data.user.id,
            nome_completo: nomeCompleto.trim(),
            papel: 'fiscal',
            ativo: false,
          })
        }

        setMensagemSucesso(
          'Cadastro realizado com sucesso! Aguarde a aprovação de um administrador para acessar o sistema.'
        )
        setModoCadastro(false)
        setSenha('')
        setConfirmarSenha('')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        })

        if (signInError) {
          if (signInError.message.includes('Invalid login credentials')) {
            throw new Error('E-mail ou senha incorretos.')
          }
          throw signInError
        }

        onLoginSucesso()
      }
    } catch (err: any) {
      setErro(err.message || 'Ocorreu um erro na autenticação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">Fiscaliza Rua</h1>
          <p className="text-xs text-slate-500 mt-1">
            {modoCadastro ? 'Criar nova conta de fiscal' : 'Acesso ao sistema de fiscalização'}
          </p>
        </div>

        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs leading-relaxed">
            {erro}
          </div>
        )}

        {mensagemSucesso && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
            {mensagemSucesso}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {modoCadastro && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nome Completo
              </label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">E-mail</label>
            <input
              type="email"
              required
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Senha</label>
            <input
              type="password"
              required
              placeholder="Mínimo 6 caracteres"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {modoCadastro && (
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                required
                placeholder="Digite a senha novamente"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 ${
                  confirmarSenha && senha !== confirmarSenha
                    ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/30'
                    : 'border-slate-200 focus:ring-blue-500'
                }`}
              />
              {confirmarSenha && senha !== confirmarSenha && (
                <p className="text-[11px] text-rose-600 mt-1">As senhas não conferem.</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-sm disabled:opacity-50 mt-2"
          >
            {loading
              ? 'Aguarde...'
              : modoCadastro
              ? 'Solicitar Cadastro'
              : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setModoCadastro(!modoCadastro)
              setErro(null)
              setMensagemSucesso(null)
              setConfirmarSenha('')
            }}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            {modoCadastro
              ? 'Já tem uma conta? Fazer Login'
              : 'Não tem conta? Cadastre-se como Fiscal'}
          </button>
        </div>
      </div>
    </div>
  )
}
