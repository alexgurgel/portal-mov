'use client'

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { NewTicket } from "@/components/NewTicket"
import { ExportTickets } from "@/components/ExportTickets"
import { Input } from "@/components/ui/input" // Importando Input
import { Button } from "@/components/ui/button" // Importando Button
import { Search, X } from "lucide-react" // Ícones
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getDisplayStatus } from "@/lib/ticketPhases"
import { buildTicketOrFilter, TICKET_CATEGORIES, TIPOS_DOCUMENTO, PRIORIDADES } from "@/lib/ticketSearch"

function DashboardContent() {
  const [tickets, setTickets] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState("todos")

  // NOVOS ESTADOS PARA OS FILTROS
  const [searchTerm, setSearchTerm] = useState("") // Pesquisa livre (solicitante, assunto, descrição, nº, cliente, NF...)
  const [startDate, setStartDate] = useState("")   // Data Inicio
  const [endDate, setEndDate] = useState("")       // Data Fim
  const [categoryFilter, setCategoryFilter] = useState("todas") // Tipo de Solicitação
  const [tipoDocumento, setTipoDocumento] = useState("todos")   // Tipo de Documento (Emissão de Documento)
  const [priorityFilter, setPriorityFilter] = useState("todas") // Prioridade

  const searchParams = useSearchParams()
  const setorFiltrado = searchParams.get('sector')

  // Dentro de um setor a categoria vem da URL; na Visão Geral vem do seletor.
  const categoriaAtiva = setorFiltrado || (categoryFilter !== "todas" ? categoryFilter : null)
  const mostrarTipoDocumento = categoriaAtiva === "Emissão de Documento"

  useEffect(() => {
    // A pesquisa livre também varre campos do formulário (cliente, NF, PAT...).
    // Se o banco recusar esse formato, refazemos a consulta só com as colunas.
    const montarQuery = (comCustomData: boolean) => {
      let query = supabase
        .from('tickets')
        .select('*')
        .neq('category', 'Controle de Relatorio')
        .order('created_at', { ascending: false })

      // 1. Filtro de Setor (URL) ou Tipo de Solicitação (seletor)
      if (setorFiltrado) {
        query = query.eq('category', setorFiltrado)
      } else if (categoryFilter !== "todas") {
        query = query.eq('category', categoryFilter)
      }

      // 2. Filtro de Status
      if (statusFilter !== "todos") {
        query = query.eq('status', statusFilter)
      }

      // 3. Filtro de Prioridade
      if (priorityFilter !== "todas") {
        query = query.eq('priority', priorityFilter)
      }

      // 4. Pesquisa livre (nº do chamado, solicitante, assunto, descrição, categoria...)
      const filtroBusca = buildTicketOrFilter(searchTerm, comCustomData)
      if (filtroBusca) {
        query = query.or(filtroBusca)
      }

      // 5. Filtro de Data (Inicio)
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`)
      }

      // 6. Filtro de Data (Fim)
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`)
      }

      return query
    }

    const fetchTickets = async () => {
      let { data, error } = await montarQuery(true)

      if (error) {
        console.warn('Pesquisa ampliada indisponível, refazendo apenas com as colunas principais:', error.message)
        const retry = await montarQuery(false)
        data = retry.data
        error = retry.error
      }

      if (error) console.error('Erro ao buscar chamados:', error.message)
      setTickets(data || [])
    }

    // Adicionamos um pequeno delay (debounce) na pesquisa para não travar enquanto digita
    const delayDebounce = setTimeout(() => {
        fetchTickets()
    }, 300)

    return () => clearTimeout(delayDebounce)

  }, [setorFiltrado, statusFilter, searchTerm, startDate, endDate, categoryFilter, priorityFilter])

  // O tipo de documento fica dentro do custom_data, então é aplicado no resultado.
  const ticketsFiltrados = mostrarTipoDocumento && tipoDocumento !== "todos"
    ? tickets.filter((t) => t.custom_data?.tipo_emissao === tipoDocumento)
    : tickets

  // Só conta o que está realmente visível/aplicado na tela atual.
  const temFiltroAtivo =
    searchTerm !== "" ||
    startDate !== "" ||
    endDate !== "" ||
    statusFilter !== "todos" ||
    priorityFilter !== "todas" ||
    (!setorFiltrado && categoryFilter !== "todas") ||
    (mostrarTipoDocumento && tipoDocumento !== "todos")

  const limparFiltros = () => {
      setSearchTerm("")
      setStartDate("")
      setEndDate("")
      setStatusFilter("todos")
      setCategoryFilter("todas")
      setPriorityFilter("todas")
      setTipoDocumento("todos")
  }

  const getPriorityColor = (priority: string) => {
    return (priority === 'alta' || priority === 'critica') ? 'text-red-600' : 'text-blue-600';
  }

  return (
    <div className="w-full space-y-6">
      
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
            <ExportTickets data={ticketsFiltrados} />
            <NewTicket />
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow border grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          
          {/* Pesquisa Livre */}
          <div className={setorFiltrado ? "md:col-span-8" : "md:col-span-5"}>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Pesquisar</label>
              <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Solicitante, assunto, descrição, nº do chamado, cliente, NF..."
                    className="pl-8 bg-gray-50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          {/* Tipo de Solicitação (na Visão Geral; dentro do setor vem da URL) */}
          {!setorFiltrado && (
            <div className="md:col-span-3">
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tipo de Solicitação</label>
                <Select onValueChange={setCategoryFilter} value={categoryFilter}>
                      <SelectTrigger className="bg-gray-50">
                          <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="todas">Todos os tipos</SelectItem>
                          {TICKET_CATEGORIES.map((categoria) => (
                              <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
            </div>
          )}

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

          {/* Prioridade */}
          <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1 block">Prioridade</label>
              <Select onValueChange={setPriorityFilter} value={priorityFilter}>
                    <SelectTrigger className="bg-gray-50">
                        <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {PRIORIDADES.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
          </div>

          {/* Tipo de Documento (só aparece em Emissão de Documento) */}
          {mostrarTipoDocumento && (
            <div className="md:col-span-3">
                <label className="text-xs font-bold text-gray-500 mb-1 block">Tipo de Documento</label>
                <Select onValueChange={setTipoDocumento} value={tipoDocumento}>
                      <SelectTrigger className="bg-gray-50">
                          <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          {TIPOS_DOCUMENTO.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
            </div>
          )}

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

          {/* Contador de resultados + Botão Limpar */}
          <div className={`${mostrarTipoDocumento ? 'md:col-span-5' : 'md:col-span-8'} flex items-center justify-between gap-2`}>
              <span className="text-xs text-gray-500 font-medium">
                  {ticketsFiltrados.length} {ticketsFiltrados.length === 1 ? 'chamado encontrado' : 'chamados encontrados'}
              </span>
              {temFiltroAtivo && (
                  <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <X className="w-4 h-4 mr-1"/> Limpar Filtros
                  </Button>
              )}
          </div>
      </div>

      {/* TABELA DE RESULTADOS */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left table-fixed">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 w-[5%]">ID</th>
                        <th className="px-4 py-3 w-[11%]">Solicitante</th>
                        <th className="px-4 py-3 w-[40%]">Assunto / Descrição</th>
                        <th className="px-4 py-3 w-[12%]">Categoria</th>
                        <th className="px-4 py-3 w-[8%]">Prioridade</th>
                        <th className="px-4 py-3 w-[10%]">Data</th>
                        <th className="px-4 py-3 w-[10%]">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {ticketsFiltrados.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                Nenhuma solicitação encontrada com esses filtros.
                            </td>
                        </tr>
                    ) : (
                        ticketsFiltrados.map((ticket) => (
                            <tr 
                                key={ticket.id} 
                                className="bg-white border-b hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => window.location.href = `/dashboard/ticket/${ticket.id}`} 
                            >
                                <td className="px-4 py-4 font-mono text-gray-500">#{ticket.id}</td>
                                
                                <td className="px-4 py-4 font-medium text-gray-800 truncate">
                                    {ticket.requester_name || "—"}
                                </td>

                                <td className="px-4 py-3 overflow-hidden">
                                    <div className="font-bold text-gray-900 truncate">{ticket.title}</div>
                                    <div className="text-xs text-gray-500 line-clamp-2 mt-1">{ticket.description}</div>
                                </td>
                                <td className="px-4 py-4">
                                    <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                                        {ticket.category}
                                    </span>
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`text-xs font-bold uppercase whitespace-nowrap ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                                    {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-4 py-4">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase whitespace-nowrap ${getDisplayStatus(ticket).colorClass}`}>
                                        {getDisplayStatus(ticket).label}
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