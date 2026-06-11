'use client'

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { getDisplayStatus, getResponsibleSector } from "@/lib/ticketPhases"
import { ListChecks, Inbox } from "lucide-react"

export default function PendentesClient() {
  const [loading, setLoading] = useState(true)
  const [setor, setSetor] = useState<string | null>(null)
  const [tickets, setTickets] = useState<any[]>([])

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
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    Nenhum chamado pendente para o seu setor no momento.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
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
