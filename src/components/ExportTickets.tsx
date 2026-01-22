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
      
      let dataResolucao = "-"
      let detalhesResolucao = "-"

      if (ticket.status === 'resolvido' || ticket.status === 'concluido') {
        // Tenta achar data de resolução na tabela de itens (Cotação/Compra)
        if (ticket.custom_data?.itens_tabela) {
             const itens = ticket.custom_data.itens_tabela
             const ultimoItem = itens.findLast((i: any) => i.resolucao?.data_baixa)
             if (ultimoItem) {
                dataResolucao = new Date(ultimoItem.resolucao.data_baixa).toLocaleString('pt-BR')
                detalhesResolucao = `Última baixa: ${ultimoItem.descricao}`
             } else {
                // Se não tiver item específico, usa a atualização do ticket
                dataResolucao = new Date(ticket.updated_at).toLocaleString('pt-BR')
             }
        } else {
             // Para chamados gerais
             dataResolucao = new Date(ticket.updated_at).toLocaleString('pt-BR')
        }
      }

      return {
        "ID": ticket.id,
        "Solicitante": ticket.requester_name || "N/A", // ADICIONADO: Nome do solicitante
        "Assunto": ticket.title,
        "Categoria": ticket.category,
        "Prioridade": ticket.priority ? ticket.priority.toUpperCase() : "NORMAL",
        "Status": ticket.status.toUpperCase().replace('_', ' '),
        "Data Abertura": new Date(ticket.created_at).toLocaleString('pt-BR'),
        "Data Resolução": dataResolucao,
        "Descrição": ticket.description,
        "Info Extra": detalhesResolucao
      }
    })

    // 2. Criar a Planilha
    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados")

    // 3. Ajustar largura das colunas
    worksheet['!cols'] = [
        { wch: 8 },  // ID
        { wch: 20 }, // Solicitante
        { wch: 35 }, // Assunto
        { wch: 18 }, // Categoria
        { wch: 12 }, // Prioridade
        { wch: 15 }, // Status
        { wch: 20 }, // Data Abertura
        { wch: 20 }, // Data Resolução
        { wch: 40 }, // Descrição
    ]

    // 4. Baixar o Arquivo
    XLSX.writeFile(workbook, `Relatorio_Chamados_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`)
  }

  return (
    <Button 
        variant="outline" 
        className="gap-2 border-green-600 text-green-700 hover:bg-green-50 font-bold"
        onClick={handleExport}
        disabled={data.length === 0}
    >
      <Download size={16} />
      Exportar Excel
    </Button>
  )
}