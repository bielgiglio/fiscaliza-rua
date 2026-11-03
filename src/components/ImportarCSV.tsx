import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Conserv {
  id: string
  nome: string
}

interface ImportarCSVProps {
  conservs: Conserv[]
  onConcluido: () => void
  onFechar: () => void
}

export default function ImportarCSV({ conservs, onConcluido, onFechar }: ImportarCSVProps) {
  const [ficheiro, setFicheiro] = useState<File | null>(null)
  const [conservIdPadrao, setConservIdPadrao] = useState<string>(conservs[0]?.id || '')
  const [importando, setImportando] = useState(false)
  const [progresso, setProgresso] = useState<string>('')
  const [relatorioErro, setRelatorioErro] = useState<string | null>(null)

  function lidarComFicheiro(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFicheiro(e.target.files[0])
      setRelatorioErro(null)
    }
  }

  function dividirLinhaCSV(linha: string): string[] {
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g
    const valores: string[] = []
    let correspondencia: RegExpExecArray | null

    while ((correspondencia = regex.exec(linha)) !== null) {
      let val = correspondencia[1] || ''
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/""/g, '"')
      }
      valores.push(val.trim())
      if (regex.lastIndex >= linha.length) break
    }
    return valores
  }

  async function processarEImportar() {
    if (!ficheiro) {
      alert('Por favor, selecione um ficheiro .csv')
      return
    }

    setImportando(true)
    setRelatorioErro(null)
    setProgresso('A ler ficheiro...')

    try {
      const texto = await ficheiro.text()
      const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0)

      if (linhas.length < 2) {
        throw new Error('O ficheiro CSV está vazio ou contém apenas o cabeçalho.')
      }

      const cabecalho = dividirLinhaCSV(linhas[0]).map((c) =>
        c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
      )

      const idxNome = cabecalho.findIndex((c) => c.includes('nome'))
      const idxCodigo = cabecalho.findIndex((c) => c.includes('codigo') || c.includes('matricula'))
      const idxEmpresa = cabecalho.findIndex((c) => c.includes('empresa'))
      const idxFuncao = cabecalho.findIndex((c) => c.includes('funcao') || c.includes('cargo'))
      const idxConserv = cabecalho.findIndex((c) => c.includes('conserv') || c.includes('setor'))

      if (idxNome === -1) {
        throw new Error('Coluna de "Nome" não encontrada no cabeçalho do CSV.')
      }

      const listaParaInserir: any[] = []
      const mapaConservsPorNome = new Map(
        conservs.map((c) => [c.nome.toLowerCase().trim(), c.id])
      )

      for (let i = 1; i < linhas.length; i++) {
        const valores = dividirLinhaCSV(linhas[i])
        const nome = valores[idxNome]

        if (!nome) continue

        const codigo = idxCodigo !== -1 && valores[idxCodigo] ? valores[idxCodigo] : null
        const empresa = idxEmpresa !== -1 && valores[idxEmpresa] ? valores[idxEmpresa] : 'Prefeitura / Terceirizada'
        const funcao = idxFuncao !== -1 && valores[idxFuncao] ? valores[idxFuncao] : 'Operador de Serviços Gerais'

        let conservIdFinal = conservIdPadrao
        if (idxConserv !== -1 && valores[idxConserv]) {
          const nomeSetorCsv = valores[idxConserv].toLowerCase().trim()
          const idEncontrado = mapaConservsPorNome.get(nomeSetorCsv)
          if (idEncontrado) {
            conservIdFinal = idEncontrado
          }
        }

        listaParaInserir.push({
          codigo,
          nome,
          empresa,
          funcao_carteira: funcao,
          funcao_exercida: funcao,
          data_admissao: new Date().toISOString().split('T')[0],
          conserv_id: conservIdFinal,
          ativo: true,
        })
      }

      setProgresso(`A gravar ${listaParaInserir.length} funcionários...`)

      const tamanhoLote = 100
      for (let i = 0; i < listaParaInserir.length; i += tamanhoLote) {
        const lote = listaParaInserir.slice(i, i + tamanhoLote)
        const { error } = await supabase.from('funcionarios').insert(lote)
        if (error) throw error
        setProgresso(`A carregar: ${Math.min(i + tamanhoLote, listaParaInserir.length)} / ${listaParaInserir.length}`)
      }

      alert(`Sucesso! ${listaParaInserir.length} funcionários importados.`)
      onConcluido()
    } catch (err: any) {
      console.error(err)
      setRelatorioErro(err.message || 'Erro ao processar ficheiro CSV.')
    } finally {
      setImportando(false)
      setProgresso('')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-bold text-slate-800">Importação em Lote via CSV</h3>
            <p className="text-xs text-slate-500">Adicione múltiplos trabalhadores de uma vez</p>
          </div>
          <button
            onClick={onFechar}
            disabled={importando}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
          >
            ✕
          </button>
        </div>

        {relatorioErro && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs">
            {relatorioErro}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Setor padrão de destino (se não vier no CSV):
            </label>
            <select
              value={conservIdPadrao}
              onChange={(e) => setConservIdPadrao(e.target.value)}
              disabled={importando}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {conservs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Ficheiro (.csv):
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={lidarComFicheiro}
              disabled={importando}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-1"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-700 block">Formato recomendado:</span>
            <p>• <strong>Nome</strong> (Obrigatório)</p>
            <p>• <strong>Matrícula / Código</strong> (Opcional)</p>
            <p>• <strong>Função</strong> (Opcional)</p>
            <p>• <strong>Empresa</strong> (Opcional)</p>
            <p>• <strong>Conserv</strong> (Opcional)</p>
          </div>

          {progresso && (
            <p className="text-xs text-center font-bold text-blue-600 animate-pulse">{progresso}</p>
          )}

          <div className="pt-2">
            <button
              onClick={processarEImportar}
              disabled={!ficheiro || importando}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
            >
              {importando ? 'A processar...' : 'Importar Funcionários'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
