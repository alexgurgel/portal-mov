'use client'
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import * as XLSX from 'xlsx'

interface ExportTicketsProps {
  data: any[]
}

export function ExportTickets({ data }: ExportTicketsProps) {

  const handleExport = () => {
    // 1. Preparar os dados para o Excel (Achatar o JSON)
    const dadosFormatados = data.map((ticket) => {
      
      // Tenta achar a data de resolução (se tiver nos itens ou se for o update do ticket)
      // Como não criamos um campo 'resolved_at' no banco, vamos improvisar:
      // Se status é resolvido, pegamos a data da última atualização (se existir) ou deixamos em branco
      // Para Cotação/Compra, tentamos pegar a data da baixa do último item.
      
      let dataResolucao = "-"
      let detalhesResolucao = "-"

      if (ticket.status === 'resolvido' || ticket.status === 'concluido') {
        // Lógica para tentar achar data de resolução nos itens
        if (ticket.custom_data?.itens_tabela) {
             const itens = ticket.custom_data.itens_tabela
             const ultimoItem = itens.findLast((i: any) => i.resolucao?.data_baixa)
             if (ultimoItem) {
                dataResolucao = new Date(ultimoItem.resolucao.data_baixa).toLocaleString('pt-BR')
                detalhesResolucao = `Última baixa: ${ultimoItem.descricao}`
             }
        } else {
             // Para chamados gerais, usamos o created_at como base ou update se tivesse
             dataResolucao = "Consultar Histórico" 
        }
      }

      return {
        "ID": ticket.id,
        "Assunto": ticket.title,
        "Categoria": ticket.category,
        "Prioridade": ticket.priority.toUpperCase(),
        "Status": ticket.status.toUpperCase().replace('_', ' '),
        "Data Abertura": new Date(ticket.created_at).toLocaleString('pt-BR'),
        "Data Resolução": dataResolucao,
        "Solicitante (ID)": ticket.user_id,
        "Detalhes": ticket.description,
        "Info Extra": detalhesResolucao
      }
    })

    // 2. Criar a Planilha
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados")

    // 3. Ajustar largura das colunas (Opcional, pra ficar bonito)
    worksheet['!cols'] = [
        { wch: 5 },  // ID
        { wch: 40 }, // Assunto
        { wch: 15 }, // Categoria
        { wch: 10 }, // Prioridade
        { wch: 15 }, // Status
        { wch: 20 }, // Data Abertura
        { wch: 20 }, // Data Resolução
    ]

    // 4. Baixar o Arquivo
    XLSX.writeFile(workbook, `Relatorio_Chamados_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`)
  }

  return (
    <Button 
        variant="outline" 
        className="gap-2 border-green-600 text-green-700 hover:bg-green-50"
        onClick={handleExport}
        disabled={data.length === 0}
    >
      <Download size={16} />
      Baixar Excel
    </Button>
  )
}