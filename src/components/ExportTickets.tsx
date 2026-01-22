'use client'

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import * as XLSX from 'xlsx'

interface ExportTicketsProps {
  data: any[]
}

export function ExportTickets({ data }: ExportTicketsProps) {
  
  const handleExport = () => {
    // Aqui formatamos os dados para o Excel ficar "bonito"
    const formattedData = data.map(ticket => ({
      ID: ticket.id,
      Solicitante: ticket.requester_name || "N/A", // NOVO CAMPO NO EXCEL
      Data: new Date(ticket.created_at).toLocaleDateString('pt-BR'),
      Categoria: ticket.category,
      Prioridade: ticket.priority,
      Status: ticket.status,
      Assunto: ticket.title,
      Descrição: ticket.description
    }))

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