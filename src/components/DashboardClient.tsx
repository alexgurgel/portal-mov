'use client'

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { NewTicket } from "@/components/NewTicket"
import { ExportTickets } from "@/components/ExportTickets"
import { Input } from "@/components/ui/input" // Importando Input
import { Button } from "@/components/ui/button" // Importando Button
import { Search, X, Calendar } from "lucide-react" // Ícones
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
  
  // NOVOS ESTADOS PARA OS FILTROS
  const [searchTerm, setSearchTerm] = useState("") // Pesquisa por nome
  const [startDate, setStartDate] = useState("")   // Data Inicio
  const [endDate, setEndDate] = useState("")       // Data Fim

  const searchParams = useSearchParams()
  const setorFiltrado = searchParams.get('sector')

  useEffect(() => {
    const fetchTickets = async () => {
      let query = supabase
        .from('tickets')
        .select('*')
        .neq('category', 'Controle de Relatorio') 
        .order('created_at', { ascending: false })

      // 1. Filtro de Setor (URL)
      if (setorFiltrado) {
        query = query.eq('category', setorFiltrado)
      }

      // 2. Filtro de Status
      if (statusFilter !== "todos") {
        query = query.eq('status', statusFilter)
      }

      // 3. Filtro de Pesquisa (Nome do Solicitante)
      if (searchTerm) {
        // ilike faz busca que ignora maiúsculas/minúsculas
        query = query.ilike('requester_name', `%${searchTerm}%`)
      }

      // 4. Filtro de Data (Inicio)
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`)
      }

      // 5. Filtro de Data (Fim)
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`)
      }
      
      const { data } = await query
      if (data) setTickets(data)
    }

    // Adicionamos um pequeno delay (debounce) na pesquisa para não travar enquanto digita
    const delayDebounce = setTimeout(() => {
        fetchTickets()
    }, 300)

    return () => clearTimeout(delayDebounce)

  }, [setorFiltrado, statusFilter, searchTerm, startDate, endDate]) 

  const limparFiltros = () => {
      setSearchTerm("")
      setStartDate("")
      setEndDate("")
      setStatusFilter("todos")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolvido': return 'bg-green-100 text-green-700'
      case 'em_andamento': return 'bg-yellow-100 text-yellow-700'
      case 'concluido': return 'bg-blue-100 text-blue-700'
      case 'devolvida': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    return (priority === 'alta' || priority === 'critica') ? 'text-red-600' : 'text-blue-600';
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-800">
                {setorFiltrado || "Visão Geral"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
                Acompanhe as solicitações recentes
            </p>
        </div>
        <div className="flex gap-2">
            <ExportTickets data={tickets} />
            <NewTicket />
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow border grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          
          {/* Pesquisa por Nome */}
          <div className="md:col-span-4">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Pesquisar Solicitante</label>
              <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Nome do solicitante..." 
                    className="pl-8 bg-gray-50" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          {/* Data Inicial */}
          <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Data Inicial</label>
              <Input 
                type="date" 
                className="bg-gray-50 text-xs" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
          </div>

          {/* Data Final */}
          <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Data Final</label>
              <Input 
                type="date" 
                className="bg-gray-50 text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
          </div>

          {/* Status */}
          <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
              <Select onValueChange={setStatusFilter} value={statusFilter}>
                    <SelectTrigger className="bg-gray-50">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="aberto">Abertos</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="devolvida">Devolvidas</SelectItem>
                        <SelectItem value="resolvido">Resolvidos</SelectItem>
                    </SelectContent>
                </Select>
          </div>

          {/* Botão Limpar */}
          <div className="md:col-span-2 flex justify-end">
              {(searchTerm || startDate || endDate || statusFilter !== 'todos') && (
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-red-500 hover:text-red-700 hover:bg-red-50 w-full md:w-auto">
                      <X className="w-4 h-4 mr-1"/> Limpar Filtros
                  </Button>
              )}
          </div>
      </div>

      {/* TABELA DE RESULTADOS */}
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
                                Nenhuma solicitação encontrada com esses filtros.
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