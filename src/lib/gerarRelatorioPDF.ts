import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface RegistoRelatorio {
  id: string
  created_at: string
  data_referencia: string
  status: string
  detalhe_localizacao: string | null
  epi_correto: boolean
  fiscal?: {
    nome_completo: string
  }
  funcionario?: {
    nome: string
    codigo: string
    empresa: string
    funcao_exercida: string
    conserv: {
      nome: string
      coordenador_nome?: string | null
    }
  }
}

interface DadosRelatorioPeriodo {
  registos: RegistoRelatorio[]
  dataInicio: string
  dataFim: string
  setorNome: string
  coordenadorNome?: string
}

interface DadosFichaIndividual {
  funcionario: {
    nome: string
    codigo: string | null
    empresa: string
    funcao_exercida: string
    conserv?: {
      nome: string
    }
  }
  apontamentos: RegistoRelatorio[]
  dataInicio?: string
  dataFim?: string
}

function formatarDataBR(dataISO: string) {
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

// 1. RELATÓRIO GERAL POR PERÍODO (DIÁRIO OU INTERVALO DE DATAS)
export function gerarRelatorioPeriodoPDF({
  registos,
  dataInicio,
  dataFim,
  setorNome,
  coordenadorNome,
}: DadosRelatorioPeriodo) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const periodoTexto =
    dataInicio === dataFim
      ? formatarDataBR(dataInicio)
      : `${formatarDataBR(dataInicio)} a ${formatarDataBR(dataFim)}`

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59)
  doc.text('FISCALIZA RUA - RELATÓRIO DE FISCALIZAÇÃO', 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`,
    14,
    22
  )

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(14, 25, 196, 25)

  // Metadados
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)

  doc.setFont('helvetica', 'bold')
  doc.text('Período Apurado:', 14, 32)
  doc.setFont('helvetica', 'normal')
  doc.text(periodoTexto, 48, 32)

  doc.setFont('helvetica', 'bold')
  doc.text('Setor (Conserv):', 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.text(setorNome === 'todos' ? 'Todos os setores' : setorNome, 48, 38)

  doc.setFont('helvetica', 'bold')
  doc.text('Coordenador:', 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(coordenadorNome || 'Não especificado', 48, 44)

  // KPIs Centralizados em 5 Colunas
  const total = registos.length
  const presentes = registos.filter((r) => r.status === 'presente').length
  const faltas = registos.filter((r) => r.status === 'falta').length
  const outros = total - (presentes + faltas)
  const epiConforme = registos.filter((r) => r.epi_correto).length
  const percEpi = total > 0 ? Math.round((epiConforme / total) * 100) : 0

  const boxX = 14
  const boxY = 48
  const boxLargura = 182
  const boxAltura = 13
  const colLargura = boxLargura / 5

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, boxY, boxLargura, boxAltura, 2, 2, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')

  doc.setTextColor(30, 41, 59)
  doc.text(`Total: ${total}`, boxX + colLargura * 0.5, boxY + 8, { align: 'center' })

  doc.setTextColor(16, 185, 129)
  doc.text(`Presentes: ${presentes}`, boxX + colLargura * 1.5, boxY + 8, { align: 'center' })

  doc.setTextColor(225, 29, 72)
  doc.text(`Faltas: ${faltas}`, boxX + colLargura * 2.5, boxY + 8, { align: 'center' })

  doc.setTextColor(217, 119, 6)
  doc.text(`Outros: ${outros}`, boxX + colLargura * 3.5, boxY + 8, { align: 'center' })

  doc.setTextColor(37, 99, 235)
  doc.text(`EPI: ${percEpi}%`, boxX + colLargura * 4.5, boxY + 8, { align: 'center' })

  // Tabela
  const linhasTabela = registos.map((r) => [
    `${formatarDataBR(r.data_referencia)}\n${new Date(r.created_at).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
    r.funcionario?.nome || 'Sem nome',
    r.funcionario?.codigo || '-',
    r.funcionario?.funcao_exercida || '-',
    r.funcionario?.conserv?.nome || '-',
    r.status.toUpperCase(),
    r.epi_correto ? 'SIM' : 'NÃO',
    r.fiscal?.nome_completo || 'Fiscal',
  ])

  autoTable(doc, {
    startY: 66,
    head: [
      [
        'Data / Hora',
        'Funcionário',
        'Matrícula',
        'Função',
        'Conserv',
        'Status',
        'EPI',
        'Fiscal Resp.',
      ],
    ],
    body: linhasTabela,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
      valign: 'middle',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { halign: 'center', cellWidth: 16 },
      3: { cellWidth: 28 },
      4: { cellWidth: 26 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 12 },
      7: { cellWidth: 22 },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const texto = data.cell.raw as string
        if (texto === 'PRESENTE') {
          doc.setTextColor(16, 185, 129)
        } else if (texto === 'FALTA') {
          doc.setTextColor(225, 29, 72)
        } else {
          doc.setTextColor(217, 119, 6)
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 35 },
  })

  // Assinaturas
  const alturaPagina = doc.internal.pageSize.getHeight()
  const posicaoYAssinatura = alturaPagina - 20

  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.5)

  doc.line(20, posicaoYAssinatura, 85, posicaoYAssinatura)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Assinatura do Fiscal Responsável', 27, posicaoYAssinatura + 5)

  doc.line(125, posicaoYAssinatura, 190, posicaoYAssinatura)
  doc.text('Assinatura do Coordenador de Setor', 130, posicaoYAssinatura + 5)

  const nomeArquivo =
    dataInicio === dataFim
      ? `relatorio_${setorNome.replace(/\s+/g, '_')}_${dataInicio}.pdf`
      : `relatorio_${setorNome.replace(/\s+/g, '_')}_${dataInicio}_a_${dataFim}.pdf`

  doc.save(nomeArquivo)
}

// 2. DOSSIÊ INDIVIDUAL DO FUNCIONÁRIO EM PDF
export function gerarFichaFuncionarioPDF({
  funcionario,
  apontamentos,
  dataInicio,
  dataFim,
}: DadosFichaIndividual) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // Cabeçalho
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59)
  doc.text('FISCALIZA RUA - DOSSIÊ INDIVIDUAL DE CAMPO', 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`,
    14,
    22
  )

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(14, 25, 196, 25)

  // Dados Cadastrais do Trabalhador
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)

  doc.setFont('helvetica', 'bold')
  doc.text('Funcionário:', 14, 32)
  doc.setFont('helvetica', 'normal')
  doc.text(`${funcionario.nome} ${funcionario.codigo ? `(Matrícula: ${funcionario.codigo})` : ''}`, 42, 32)

  doc.setFont('helvetica', 'bold')
  doc.text('Função / Setor:', 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.text(`${funcionario.funcao_exercida} • ${funcionario.conserv?.nome || 'Não definido'}`, 42, 38)

  doc.setFont('helvetica', 'bold')
  doc.text('Empresa:', 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(funcionario.empresa, 42, 44)

  const filtroPeriodo =
    dataInicio && dataFim
      ? `${formatarDataBR(dataInicio)} a ${formatarDataBR(dataFim)}`
      : dataInicio
      ? `A partir de ${formatarDataBR(dataInicio)}`
      : dataFim
      ? `Até ${formatarDataBR(dataFim)}`
      : 'Todo o histórico registado'

  doc.setFont('helvetica', 'bold')
  doc.text('Período:', 14, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(filtroPeriodo, 42, 50)

  // KPIs Proporcionais às Visitas
  const totalVisitas = apontamentos.length
  const presentes = apontamentos.filter((a) => a.status === 'presente').length
  const faltas = apontamentos.filter((a) => a.status === 'falta').length
  const outros = totalVisitas - (presentes + faltas)
  const epiConforme = apontamentos.filter((a) => a.epi_correto).length

  const taxaPresenca = totalVisitas > 0 ? Math.round((presentes / totalVisitas) * 100) : 0
  const taxaEpi = totalVisitas > 0 ? Math.round((epiConforme / totalVisitas) * 100) : 0

  const boxX = 14
  const boxY = 55
  const boxLargura = 182
  const boxAltura = 13
  const colLargura = boxLargura / 4

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, boxY, boxLargura, boxAltura, 2, 2, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')

  doc.setTextColor(30, 41, 59)
  doc.text(`Fiscalizações: ${totalVisitas}`, boxX + colLargura * 0.5, boxY + 8, { align: 'center' })

  doc.setTextColor(16, 185, 129)
  doc.text(`Presenças: ${presentes} (${taxaPresenca}%)`, boxX + colLargura * 1.5, boxY + 8, { align: 'center' })

  doc.setTextColor(225, 29, 72)
  doc.text(`Faltas/Outros: ${faltas} (+${outros})`, boxX + colLargura * 2.5, boxY + 8, { align: 'center' })

  doc.setTextColor(37, 99, 235)
  doc.text(`EPI Conforme: ${taxaEpi}%`, boxX + colLargura * 3.5, boxY + 8, { align: 'center' })

  // Tabela Cronológica
  const linhas = apontamentos.map((a) => [
    formatarDataBR(a.data_referencia),
    new Date(a.created_at).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }),
    a.status.toUpperCase(),
    a.epi_correto ? 'SIM' : 'NÃO',
    a.detalhe_localizacao || '-',
    a.fiscal?.nome_completo || 'Não identificado',
  ])

  autoTable(doc, {
    startY: 73,
    head: [['Data', 'Hora', 'Status', 'EPI', 'Observação / Destino', 'Fiscal Responsável']],
    body: linhas,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 22 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 14 },
      4: { cellWidth: 68 },
      5: { cellWidth: 40 },
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const texto = data.cell.raw as string
        if (texto === 'PRESENTE') {
          doc.setTextColor(16, 185, 129)
        } else if (texto === 'FALTA') {
          doc.setTextColor(225, 29, 72)
        } else {
          doc.setTextColor(217, 119, 6)
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 35 },
  })

  // Assinaturas
  const alturaPagina = doc.internal.pageSize.getHeight()
  const posicaoYAssinatura = alturaPagina - 20

  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.5)

  doc.line(20, posicaoYAssinatura, 85, posicaoYAssinatura)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Assinatura da Coordenação / Fiscalização', 23, posicaoYAssinatura + 5)

  doc.line(125, posicaoYAssinatura, 190, posicaoYAssinatura)
  doc.text('Ciência do Funcionário (Opcional)', 135, posicaoYAssinatura + 5)

  doc.save(`dossie_${funcionario.nome.replace(/\s+/g, '_')}.pdf`)
}
