'use client'

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { NewTicket } from "@/components/NewTicket"
import { ExportTickets } from "@/components/ExportTickets"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function DashboardContent() {
  const [tickets, setTickets] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("todos")
  
  const searchParams = useSearchParams()
  const setorFiltrado = searchParams.get('sector')

  useEffect(() => {
    const fetchTickets = async () => {
      // Busca tickets, excluindo o controle de relatório da visão geral
      let query = supabase
        .from('tickets')
        .select('*')
        .neq('category', 'Controle de Relatorio') 
        .order('created_at', { ascending: false })

      if (setorFiltrado) {
        query = query.eq('category', setorFiltrado)
      }

      if (statusFilter !== "todos") {
        query = query.eq('status', statusFilter)
      }
      
      const { data } = await query
      if (data) setTickets(data)
    }
    fetchTickets()
  }, [setorFiltrado, statusFilter]) 

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolvido': return 'bg-green-100 text-green-700'
      case 'em_andamento': return 'bg-yellow-100 text-yellow-700'
      case 'concluido': return 'bg-blue-100 text-blue-700'
      case 'devolvida': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Função auxiliar para evitar erros de formatação no JSX
  const getPriorityColor = (priority: string) => {
    return (priority === 'alta' || priority === 'critica') ? 'text-red-600' : 'text-blue-600';
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">
                {setorFiltrado || "Visão Geral"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
                Acompanhe as solicitações recentes
            </p>
        </div>

        <div className="flex gap-3 items-center flex-wrap md:flex-nowrap">
            <div className="w-[160px]">
                <Select onValueChange={setStatusFilter} defaultValue="todos">
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Filtrar Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos os Status</SelectItem>
                        <SelectItem value="aberto">Abertos</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="devolvida">Devolvidas</SelectItem>
                        <SelectItem value="resolvido">Resolvidos</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <ExportTickets data={tickets} />
            <NewTicket />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                        <th className="px-6 py-3">ID</th>
                        <th className="px-6 py-3">Solicitante</th>
                        <th className="px-6 py-3 w-1/3">Assunto / Descrição</th>
                        <th className="px-6 py-3">Categoria</th>
                        <th className="px-6 py-3">Prioridade</th>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {tickets.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                Nenhuma solicitação encontrada.
                            </td>
                        </tr>
                    ) : (
                        tickets.map((ticket) => (
                            <tr 
                                key={ticket.id} 
                                className="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => window.location.href = `/dashboard/ticket/${ticket.id}`} 
                            >
                                <td className="px-6 py-4 font-mono text-gray-500">#{ticket.id}</td>
                                
                                <td className="px-6 py-4 font-medium text-gray-800">
                                    {ticket.requester_name || "—"}
                                </td>

                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{ticket.title}</div>
                                    <div className="text-xs text-gray-500 line-clamp-1 mt-1">{ticket.description}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-200">
                                        {ticket.category}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-bold uppercase ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${getStatusColor(ticket.status)}`}>
                                        {ticket.status ? ticket.status.replace('_', ' ') : '-'}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}

export default function DashboardClient() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return <div className="p-10 text-center">Carregando painel...</div>
  }

  return (
    <Suspense fallback={<div className="p-10 text-center">Carregando dados...</div>}>
      <DashboardContent />
    </Suspense>
  )
}