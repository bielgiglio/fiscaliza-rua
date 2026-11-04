import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface RegistoRelatorio {
  id: string
  created_at: string
  data_referencia: string
  status: string
  detalhe_localizacao: string | null
  epi_correto: boolean
  fiscal?: {
    nome_completo: string
  }
  funcionario: {
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

interface DadosGeracaoPDF {
  registos: RegistoRelatorio[]
  dataReferencia: string
  setorNome: string
  coordenadorNome?: string
}

export function gerarRelatorioDiarioPDF({
  registos,
  dataReferencia,
  setorNome,
  coordenadorNome,
}: DadosGeracaoPDF) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const [ano, mes, dia] = dataReferencia.split('-')
  const dataFormatada = `${dia}/${mes}/${ano}`

  // 1. Cabeçalho Institucional
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59)
  doc.text('FISCALIZA RUA - RELATÓRIO DIÁRIO DE CAMPO', 14, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(
    `Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`,
    14,
    22
  )

  // Linha separadora
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(14, 25, 196, 25)

  // 2. Metadados do Setor e Coordenador
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)

  doc.setFont('helvetica', 'bold')
  doc.text('Data de Referência:', 14, 32)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFormatada, 52, 32)

  doc.setFont('helvetica', 'bold')
  doc.text('Setor (Conserv):', 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.text(setorNome === 'todos' ? 'Todos os setores' : setorNome, 52, 38)

  doc.setFont('helvetica', 'bold')
  doc.text('Coordenador:', 14, 44)
  doc.setFont('helvetica', 'normal')
  doc.text(coordenadorNome || 'Não especificado', 52, 44)

  // 3. Indicadores Resumo (KPIs) - Distribuição proporcional com alinhamento centralizado
  const total = registos.length
  const presentes = registos.filter((r) => r.status === 'presente').length
  const faltas = registos.filter((r) => r.status === 'falta').length
  const outros = total - (presentes + faltas)
  const epiConforme = registos.filter((r) => r.epi_correto).length
  const percEpi = total > 0 ? Math.round((epiConforme / total) * 100) : 0

  const boxX = 14
  const boxY = 48
  const boxLargura = 182 // Largura exata da tabela
  const boxAltura = 13
  const colLargura = boxLargura / 5 // 36.4mm por coluna

  // Container arredondado com fundo suave e borda sutil
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.roundedRect(boxX, boxY, boxLargura, boxAltura, 2, 2, 'FD')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')

  // Total
  doc.setTextColor(30, 41, 59)
  doc.text(`Total: ${total}`, boxX + colLargura * 0.5, boxY + 8, { align: 'center' })

  // Presentes
  doc.setTextColor(16, 185, 129)
  doc.text(`Presentes: ${presentes}`, boxX + colLargura * 1.5, boxY + 8, { align: 'center' })

  // Faltas
  doc.setTextColor(225, 29, 72)
  doc.text(`Faltas: ${faltas}`, boxX + colLargura * 2.5, boxY + 8, { align: 'center' })

  // Outros/Cedidos
  doc.setTextColor(217, 119, 6)
  doc.text(`Outros: ${outros}`, boxX + colLargura * 3.5, boxY + 8, { align: 'center' })

  // EPI Conforme (Perfeitamente contido dentro da margem direita)
  doc.setTextColor(37, 99, 235)
  doc.text(`EPI: ${percEpi}%`, boxX + colLargura * 4.5, boxY + 8, { align: 'center' })

  // 4. Tabela de Registos
  const linhasTabela = registos.map((r) => [
    new Date(r.created_at).toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    }),
    r.funcionario?.nome || 'Sem nome',
    r.funcionario?.codigo || '-',
    r.funcionario?.funcao_exercida || '-',
    r.funcionario?.empresa || '-',
    r.status.toUpperCase(),
    r.epi_correto ? 'SIM' : 'NÃO',
    r.fiscal?.nome_completo || 'Fiscal',
  ])

  autoTable(doc, {
    startY: 66,
    head: [
      [
        'Hora',
        'Funcionário',
        'Matrícula',
        'Função',
        'Empresa',
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
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
      1: { cellWidth: 42 },
      2: { halign: 'center', cellWidth: 18 },
      3: { cellWidth: 32 },
      4: { cellWidth: 26 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 12 },
      7: { cellWidth: 20 },
    },
    didDrawCell: (data) => {
      // Destaque de cor no status
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

  // 5. Bloco de Assinaturas no Rodapé
  const alturaPagina = doc.internal.pageSize.getHeight()
  const posicaoYAssinatura = alturaPagina - 20

  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.5)

  // Linha Fiscal
  doc.line(20, posicaoYAssinatura, 85, posicaoYAssinatura)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('Assinatura do Fiscal Responsável', 27, posicaoYAssinatura + 5)

  // Linha Coordenador
  doc.line(125, posicaoYAssinatura, 190, posicaoYAssinatura)
  doc.text('Assinatura do Coordenador de Setor', 130, posicaoYAssinatura + 5)

  // Salvar ficheiro
  doc.save(`relatorio_${setorNome.replace(/\s+/g, '_')}_${dataReferencia}.pdf`)
}
