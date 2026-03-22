'use client'

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Bug, Lightbulb, Clock, CheckCircle, XCircle, ChevronUp, Send, MessageSquare } from "lucide-react"

const VIVIANE_EMAIL = "viviane.lopes@grupomov.com.br"
const ALEX_EMAIL = "alexgabrielb@hotmail.com"
const CHAT_EMAILS = [VIVIANE_EMAIL, ALEX_EMAIL]

type ChatMessage = {
  id: number
  sender_name: string
  sender_email: string
  message: string
  created_at: string
}

type BugReport = {
  id: number
  requester_name: string
  type: "bug" | "melhoria"
  title: string
  description: string
  status: "pendente" | "aprovado" | "recusado"
  created_at: string
  ticket_id?: number
}

export default function SuporteClient() {
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [userId, setUserId] = useState("")
  const [reports, setReports] = useState<BugReport[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [type, setType] = useState<"bug" | "melhoria">("bug")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [sendingChat, setSendingChat] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isViviane = userEmail === VIVIANE_EMAIL
  const hasChat = CHAT_EMAILS.includes(userEmail)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || "")
        setUserId(user.id)
        const nome = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || ""
        setUserName(nome.replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))
        await fetchReports()
        if (CHAT_EMAILS.includes(user.email || "")) {
          await fetchChat()
        }
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!hasChat) return
    const channel = supabase
      .channel('support_chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_chat' }, (payload) => {
        setChatMessages(prev => [...prev, payload.new as ChatMessage])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [hasChat])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function fetchChat() {
    const { data } = await supabase
      .from('support_chat')
      .select('*')
      .order('created_at', { ascending: true })
    setChatMessages(data || [])
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim()) return
    setSendingChat(true)
    await supabase.from('support_chat').insert({
      user_id: userId,
      sender_name: userName,
      sender_email: userEmail,
      message: chatInput.trim(),
    })
    setChatInput("")
    setSendingChat(false)
  }

  async function fetchReports() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('Erro ao buscar relatos:', error)
    setReports(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return alert("Preencha todos os campos.")
    setSubmitting(true)

    const { error } = await supabase.from('bug_reports').insert({
      user_id: userId,
      requester_name: userName,
      type,
      title: title.trim(),
      description: description.trim(),
      status: 'pendente',
    })

    if (error) {
      alert("Erro ao enviar: " + error.message)
    } else {
      alert("Enviado com sucesso! Aguardando aprovação.")
      setTitle("")
      setDescription("")
      setShowForm(false)
      fetchReports()
    }
    setSubmitting(false)
  }

  async function handleAprovar(report: BugReport) {
    // Cria ticket na tabela tickets
    const { data: ticket, error: ticketError } = await supabase.from('tickets').insert({
      title: `[${report.type === 'bug' ? 'BUG' : 'MELHORIA'}] ${report.title}`,
      description: `${report.description}\n\n— Solicitado por: ${report.requester_name}`,
      priority: report.type === 'bug' ? 'alta' : 'media',
      category: 'Suporte Sistema',
      status: 'aberto',
      user_id: userId,
      requester_name: report.requester_name,
      custom_data: { origem: 'bug_report', bug_report_id: report.id },
    }).select().single()

    if (ticketError) return alert("Erro ao criar ticket: " + ticketError.message)

    await supabase.from('bug_reports').update({
      status: 'aprovado',
      ticket_id: ticket.id,
    }).eq('id', report.id)

    fetchReports()
  }

  async function handleRecusar(id: number) {
    await supabase.from('bug_reports').update({ status: 'recusado' }).eq('id', id)
    fetchReports()
  }

  const statusIcon = (status: string) => {
    if (status === 'aprovado') return <CheckCircle size={16} className="text-green-600" />
    if (status === 'recusado') return <XCircle size={16} className="text-red-500" />
    return <Clock size={16} className="text-yellow-500" />
  }

  const statusLabel = (status: string) => {
    if (status === 'aprovado') return 'Aprovado'
    if (status === 'recusado') return 'Recusado'
    return 'Aguardando'
  }

  const pendentes = reports.filter(r => r.status === 'pendente')

  return (
    <div className="w-full space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Suporte / Melhorias</h1>
          <p className="text-gray-500 text-sm mt-1">Reporte bugs ou sugira melhorias para o sistema</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#F3C843] text-black hover:bg-[#d4ac33] font-bold"
        >
          {showForm ? <><ChevronUp size={16} className="mr-1" /> Fechar</> : <>+ Novo Relato</>}
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-5 shadow space-y-4">
          <h2 className="font-bold text-gray-700 text-base">Novo Relato</h2>

          {/* Tipo */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setType("bug")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${type === 'bug' ? 'bg-red-50 border-red-400 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
            >
              <Bug size={16} /> Bug / Erro
            </button>
            <button
              type="button"
              onClick={() => setType("melhoria")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${type === 'melhoria' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
            >
              <Lightbulb size={16} /> Melhoria / Sugestão
            </button>
          </div>

          <div>
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'bug' ? 'Ex: Botão de exportar não funciona' : 'Ex: Adicionar filtro por prioridade'}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label>Descrição detalhada *</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={type === 'bug' ? 'Descreva o que aconteceu, quando e em qual tela...' : 'Explique a melhoria e como ela ajudaria no dia a dia...'}
              className="mt-1 min-h-[100px]"
              required
            />
          </div>

          <Button type="submit" disabled={submitting} className="w-full bg-black text-white hover:bg-gray-800">
            {submitting ? 'Enviando...' : 'Enviar Relato'}
          </Button>
        </form>
      )}

      {/* Painel de Aprovação (só Viviane) */}
      {isViviane && pendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-5 shadow space-y-3">
          <h2 className="font-bold text-yellow-800 text-base flex items-center gap-2">
            <Clock size={18} /> Aguardando sua aprovação ({pendentes.length})
          </h2>
          {pendentes.map(report => (
            <div key={report.id} className="bg-white border border-yellow-200 rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${report.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {report.type === 'bug' ? '🐛 Bug' : '💡 Melhoria'}
                  </span>
                  <span className="text-xs text-gray-400">{report.requester_name} · {new Date(report.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
              <p className="font-bold text-gray-900 text-sm">{report.title}</p>
              <p className="text-xs text-gray-600">{report.description}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={() => handleAprovar(report)} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                  <CheckCircle size={14} className="mr-1" /> Aprovar e Criar Ticket
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleRecusar(report.id)} className="border-red-300 text-red-600 hover:bg-red-50 text-xs">
                  <XCircle size={14} className="mr-1" /> Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de relatos */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50">
          <h2 className="font-bold text-gray-700 text-sm">
            {isViviane ? 'Todos os Relatos' : 'Meus Relatos'}
          </h2>
        </div>

        {loading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">Nenhum relato encontrado.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-600 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 w-[8%]">Tipo</th>
                <th className="px-4 py-3 w-[35%]">Título</th>
                {isViviane && <th className="px-4 py-3 w-[15%]">Solicitante</th>}
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3 w-[12%]">Data</th>
                <th className="px-4 py-3 w-[12%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${report.type === 'bug' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {report.type === 'bug' ? 'Bug' : 'Melhoria'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{report.title}</td>
                  {isViviane && <td className="px-4 py-3 text-gray-600 text-xs">{report.requester_name}</td>}
                  <td className="px-4 py-3 text-xs text-gray-500 line-clamp-2">{report.description}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(report.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      {statusIcon(report.status)} {statusLabel(report.status)}
                      {report.ticket_id && (
                        <a href={`/dashboard/ticket/${report.ticket_id}`} className="ml-1 text-blue-500 underline text-xs">
                          #{report.ticket_id}
                        </a>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* CHAT - só para alex e viviane */}
      {hasChat && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2">
            <MessageSquare size={16} className="text-gray-600" />
            <h2 className="font-bold text-gray-700 text-sm">Chat Interno</h2>
            <span className="text-xs text-gray-400 ml-1">— apenas você e Viviane</span>
          </div>

          {/* Mensagens */}
          <div className="h-72 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">Nenhuma mensagem ainda. Diga olá!</p>
            ) : (
              chatMessages.map(msg => {
                const isMe = msg.sender_email === userEmail
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <span className="text-xs text-gray-400 mb-0.5">{isMe ? 'Você' : msg.sender_name}</span>
                    <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#F3C843] text-black rounded-tr-sm' : 'bg-white border text-gray-800 rounded-tl-sm shadow-sm'}`}>
                      {msg.message}
                    </div>
                    <span className="text-[10px] text-gray-300 mt-0.5">
                      {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendChat} className="flex gap-2 p-3 border-t bg-white">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Digite uma mensagem..."
              className="flex-1"
              disabled={sendingChat}
            />
            <Button type="submit" disabled={sendingChat || !chatInput.trim()} className="bg-black text-white hover:bg-gray-800 px-4">
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
