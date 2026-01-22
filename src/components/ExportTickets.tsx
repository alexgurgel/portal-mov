'use client'

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as XLSX from 'xlsx'

interface ExportTicketsProps {
  data: any[]
}

export function ExportTickets({ data }: ExportTicketsProps) {
  
  const handleExport = () => {
    // Formatamos os dados incluindo a nova coluna de resolução
    const formattedData = data.map(ticket => {
      // Consideramos resolvido se o status for 'resolvido' ou 'concluido'
      const foiResolvido = ticket.status === 'resolvido' || ticket.status === 'concluido'
      
      // Se resolvido, usamos a data da última atualização (updated_at)
      const dataResolucao = foiResolvido && ticket.updated_at
        ? new Date(ticket.updated_at).toLocaleDateString('pt-BR') 
        : "Pendente"

      return {
        ID: ticket.id,
        Solicitante: ticket.requester_name || "N/A",
        "Data de Abertura": new Date(ticket.created_at).toLocaleDateString('pt-BR'),
        "Data de Resolução": dataResolucao, // NOVA COLUNA SOLICITADA
        Categoria: ticket.category,
        Prioridade: ticket.priority,
        Status: ticket.status.toUpperCase(),
        Assunto: ticket.title,
        Descrição: ticket.description
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chamados")
    XLSX.writeFile(workbook, "Relatorio_Chamados_MOV.xlsx")
  }

  return (
    <Button 
        variant="outline" 
        className="border-green-600 text-green-700 hover:bg-green-50"
        onClick={handleExport}
    >
        <Download className="w-4 h-4 mr-2" />
        Baixar Excel
    </Button>
  )
}