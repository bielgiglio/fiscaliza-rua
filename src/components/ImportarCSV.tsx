import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Conserv {
  id: string
  nome: string
}

interface ImportarCSVProps {
  conservs: Conserv[]
  onFechar: () => void
  onConcluido: () => void
}

export default function ImportarCSV({ conservs, onFechar, onConcluido }: ImportarCSVProps) {
  const [conservPadraoId, setConservPadraoId] = useState(conservs[0]?.id || '')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [processando, setProcessando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function normalizarTexto(str: string) {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\uFFFD/g, '')
      .toLowerCase()
      .trim()
  }

  // Corrige palavras corrompidas com o losango '' (\uFFFD) antes da importação
  function limparCorrupcaoUTF8(texto: string): string {
    return texto
      .replace(/CONCEI\uFFFD+O/gi, 'CONCEIÇÃO')
      .replace(/FRAZ\uFFFDO/gi, 'FRAZÃO')
      .replace(/GUIMAR\uFFFDES/gi, 'GUIMARÃES')
      .replace(/ASSUN\uFFFD+O/gi, 'ASSUNÇÃO')
      .replace(/ENCARNA\uFFFD+O/gi, 'ENCARNAÇÃO')
      .replace(/ANUNCIA\uFFFD+O/gi, 'ANUNCIAÇÃO')
      .replace(/CONSOLA\uFFFD+O/gi, 'CONSOLAÇÃO')
      .replace(/EXALTA\uFFFD+O/gi, 'EXALTAÇÃO')
      .replace(/PURIFICA\uFFFD+O/gi, 'PURIFICAÇÃO')
      .replace(/RESSURREI\uFFFD+O/gi, 'RESSURREIÇÃO')
      .replace(/JO\uFFFDO/gi, 'JOÃO')
      .replace(/S\uFFFDO/gi, 'SÃO')
      .replace(/JOS\uFFFD/gi, 'JOSÉ')
      .replace(/INO\uFFFD/gi, 'INOÃ')
      .replace(/MARIC\uFFFD/gi, 'MARICÁ')
      .replace(/ITAIPUA\uFFFDU/gi, 'ITAIPUAÇU')
      .replace(/ESPA\uFFFDO/gi, 'ESPAÇO')
      .replace(/RO\uFFFDADEIRA/gi, 'ROÇADEIRA')
      .replace(/C\uFFFDNDIDO/gi, 'CÂNDIDO')
      .replace(/ANT\uFFFDNIO/gi, 'ANTÔNIO')
      .replace(/TEN\uFFFDRIO/gi, 'TENÓRIO')
      .replace(/SEBASTI\uFFFDO/gi, 'SEBASTIÃO')
      .replace(/DAMASCENO/gi, 'DAMASCENO')
      .replace(/SIM\uFFFDES/gi, 'SIMÕES')
      .replace(/MAGALH\uFFFDES/gi, 'MAGALHÃES')
      .replace(/BRAND\uFFFDO/gi, 'BRANDÃO')
      .replace(/FAL\uFFFDO/gi, 'FALCÃO')
      .replace(/GALV\uFFFDO/gi, 'GALVÃO')
      .replace(/LE\uFFFDO/gi, 'LEÃO')
      .replace(/PAIX\uFFFDO/gi, 'PAIXÃO')
      .replace(/ARAG\uFFFDO/gi, 'ARAGÃO')
      .replace(/TRIST\uFFFDO/gi, 'TRISTÃO')
      .replace(/JORD\uFFFDO/gi, 'JORDÃO')
      .replace(/MOUR\uFFFDO/gi, 'MOURÃO')
      .replace(/GUSM\uFFFDO/gi, 'GUSMÃO')
      .replace(/ROM\uFFFDO/gi, 'ROMÃO')
      .replace(/CRIST\uFFFDV\uFFFDO/gi, 'CRISTÓVÃO')
      .replace(/IN\uFFFDACIO/gi, 'INÁCIO')
      .replace(/IN\uFFFDCIO/gi, 'INÁCIO')
      .replace(/M\uFFFDRCIO/gi, 'MÁRCIO')
      .replace(/F\uFFFDBIO/gi, 'FÁBIO')
      .replace(/FL\uFFFDVIO/gi, 'FLÁVIO')
      .replace(/CL\u{FFFD}UDIO/giu, 'CLÁUDIO')
      .replace(/L\uFFFDCIO/gi, 'LÚCIO')
      .replace(/S\uFFFDRGIO/gi, 'SÉRGIO')
      .replace(/ROG\uFFFDRIO/gi, 'ROGÉRIO')
      .replace(/VAL\uFFFDRIA/gi, 'VALÉRIA')
      .replace(/ANDR\uFFFD/gi, 'ANDRÉ')
      .replace(/CAETANO/gi, 'CAETANO')
      .replace(/\uFFFD+O\b/gi, 'ÃO')
      .replace(/\uFFFD+ES\b/gi, 'ÃES')
  }

  async function lerArquivoComEncodingCorreto(file: File): Promise<string> {
    const buffer = await file.arrayBuffer()
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
    let conteudo = ''
    try {
      conteudo = utf8Decoder.decode(buffer)
    } catch {
      const winDecoder = new TextDecoder('windows-1252')
      conteudo = winDecoder.decode(buffer)
    }
    return limparCorrupcaoUTF8(conteudo)
  }

  function dividirLinhaCSV(linha: string, separadorPadrao: string): string[] {
    const sep = linha.includes(';') ? ';' : separadorPadrao
    return linha.split(sep).map((val) => val.replace(/^"|"$/g, '').trim())
  }

  async function processarImportacao(e: React.FormEvent) {
    e.preventDefault()
    if (!arquivo) {
      setErro('Selecione um ficheiro .csv antes de importar.')
      return
    }

    setProcessando(true)
    setErro(null)

    try {
      const texto = await lerArquivoComEncodingCorreto(arquivo)
      const linhas = texto
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)

      if (linhas.length < 2) {
        throw new Error('O ficheiro está vazio ou contém apenas o cabeçalho.')
      }

      const separadorCabecalho = linhas[0].includes(';') ? ';' : ','
      const cabecalhos = dividirLinhaCSV(linhas[0], separadorCabecalho).map(normalizarTexto)

      const idxNome = cabecalhos.findIndex((c) => c === 'nome')
      const idxCodigo = cabecalhos.findIndex((c) => c.includes('codigo') || c.includes('matricula'))
      // Reconhece 'funcao', 'funo' (quando 'çã' virou '') ou 'cargo'
      const idxFuncao = cabecalhos.findIndex(
        (c) => c.includes('funcao') || c.includes('funo') || c.includes('cargo')
      )
      const idxEmpresa = cabecalhos.findIndex((c) => c.includes('empresa'))
      const idxConserv = cabecalhos.findIndex((c) => c.includes('conserv') || c.includes('setor'))

      if (idxNome === -1) {
        throw new Error('Coluna obrigatória "Nome" não encontrada no cabeçalho do CSV.')
      }

      const dataHoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      const registrosParaInserir = []

      for (let i = 1; i < linhas.length; i++) {
        const colunas = dividirLinhaCSV(linhas[i], separadorCabecalho)
        const nome = colunas[idxNome]
        if (!nome) continue

        const codigo = idxCodigo !== -1 && colunas[idxCodigo] ? colunas[idxCodigo] : null
        const funcao = idxFuncao !== -1 && colunas[idxFuncao] ? colunas[idxFuncao] : 'Operacional'
        const empresa = idxEmpresa !== -1 && colunas[idxEmpresa] ? colunas[idxEmpresa] : 'Prefeitura / Terceirizada'

        let conservFinalId = conservPadraoId
        if (idxConserv !== -1 && colunas[idxConserv]) {
          const nomeSetorCSV = normalizarTexto(colunas[idxConserv])
          const setorEncontrado = conservs.find((c) => normalizarTexto(c.nome) === nomeSetorCSV)
          if (setorEncontrado) {
            conservFinalId = setorEncontrado.id
          }
        }

        registrosParaInserir.push({
          nome,
          codigo,
          funcao_exercida: funcao,
          funcao_carteira: funcao,
          empresa,
          conserv_id: conservFinalId,
          data_admissao: dataHoje,
          ativo: true,
        })
      }

      if (registrosParaInserir.length === 0) {
        throw new Error('Nenhum funcionário válido encontrado nas linhas do arquivo.')
      }

      const tamanhoLote = 100
      for (let i = 0; i < registrosParaInserir.length; i += tamanhoLote) {
        const lote = registrosParaInserir.slice(i, i + tamanhoLote)
        const { error: insertError } = await supabase.from('funcionarios').insert(lote)
        if (insertError) throw insertError
      }

      alert(`${registrosParaInserir.length} funcionários importados com sucesso!`)
      onConcluido()
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar arquivo CSV.')
    } finally {
      setProcessando(false)
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
            className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 leading-none"
          >
            ✕
          </button>
        </div>

        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {erro}
          </div>
        )}

        <form onSubmit={processarImportacao} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Setor padrão de destino (se não vier no CSV):
            </label>
            <select
              value={conservPadraoId}
              onChange={(e) => setConservPadraoId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none"
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
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl p-1.5"
            />
          </div>

          <button
            type="submit"
            disabled={processando}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
          >
            {processando ? 'A importar funcionários...' : 'Importar Funcionários'}
          </button>
        </form>
      </div>
    </div>
  )
}
