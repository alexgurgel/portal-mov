'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { getDisplayStatus, getResponsibleSector } from "@/lib/ticketPhases"
import { matchesTicketSearch, PRIORIDADES } from "@/lib/ticketSearch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ListChecks, Inbox, Search, X } from "lucide-react"

export default function PendentesClient() {
  const [loading, setLoading] = useState(true)
  const [setor, setSetor] = useState<string | null>(null)
  const [tickets, setTickets] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas")
  const [prioridadeFiltro, setPrioridadeFiltro] = useState("todas")

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('id', user.id)
        .single()

      if (!profile?.department_id) {
        setLoading(false)
        return
      }

      const { data: department } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .single()

      if (!department?.name) {
        setLoading(false)
        return
      }

      setSetor(department.name)

      const { data: ticketsData } = await supabase
        .from('tickets')
        .select('*')
        .not('status', 'in', '(resolvido,devolvida)')
        .neq('category', 'Controle de Relatorio')
        .order('created_at', { ascending: false })

      const pendentes = (ticketsData || []).filter(
        (t: any) => getResponsibleSector(t) === department.name
      )

      setTickets(pendentes)
      setLoading(false)
    }
    init()
  }, [])

  const getPriorityColor = (priority: string) => {
    return (priority === 'alta' || priority === 'critica') ? 'text-red-600' : 'text-blue-600'
  }

  // Tipos de solicitação que realmente aparecem na fila do setor.
  const categoriasDisponiveis = Array.from(
    new Set(tickets.map((t) => t.category).filter(Boolean))
  ).sort()

  const ticketsFiltrados = tickets.filter((ticket) => {
    if (categoriaFiltro !== "todas" && ticket.category !== categoriaFiltro) return false
    if (prioridadeFiltro !== "todas" && ticket.priority !== prioridadeFiltro) return false
    return matchesTicketSearch(ticket, searchTerm)
  })

  const temFiltroAtivo = searchTerm !== "" || categoriaFiltro !== "todas" || prioridadeFiltro !== "todas"

  const limparFiltros = () => {
    setSearchTerm("")
    setCategoriaFiltro("todas")
    setPrioridadeFiltro("todas")
  }

  if (loading) {
    return <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
  }

  if (!setor) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-3 text-gray-500 text-center">
        <Inbox className="w-10 h-10 text-gray-300" />
        <p className="font-bold text-gray-700">Seu setor ainda não foi configurado.</p>
        <p className="text-sm max-w-md">
          Peça para um administrador definir o seu setor na página "Usuários" para que os chamados pendentes para o seu setor apareçam aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ListChecks className="text-[#F3C843]" /> Pendentes para Mim
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Chamados aguardando uma ação do setor <b>{setor}</b>
        </p>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow border grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-6">
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

        <div className="md:col-span-3">
          <label className="text-xs font-bold text-gray-500 mb-1 block">Tipo de Solicitação</label>
          <Select onValueChange={setCategoriaFiltro} value={categoriaFiltro}>
            <SelectTrigger className="bg-gray-50">
              <SelectValue placeholder="Todos os tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os tipos</SelectItem>
              {categoriasDisponiveis.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3">
          <label className="text-xs font-bold text-gray-500 mb-1 block">Prioridade</label>
          <Select onValueChange={setPrioridadeFiltro} value={prioridadeFiltro}>
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

        <div className="md:col-span-12 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {ticketsFiltrados.length} {ticketsFiltrados.length === 1 ? 'chamado encontrado' : 'chamados encontrados'}
          </span>
          {temFiltroAtivo && (
            <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <X className="w-4 h-4 mr-1" /> Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 w-[5%]">ID</th>
                <th className="px-4 py-3 w-[12%]">Solicitante</th>
                <th className="px-4 py-3 w-[40%]">Assunto / Descrição</th>
                <th className="px-4 py-3 w-[13%]">Categoria</th>
                <th className="px-4 py-3 w-[8%]">Prioridade</th>
                <th className="px-4 py-3 w-[10%]">Data</th>
                <th className="px-4 py-3 w-[12%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {ticketsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    {temFiltroAtivo
                      ? 'Nenhum chamado encontrado com esses filtros.'
                      : 'Nenhum chamado pendente para o seu setor no momento.'}
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
