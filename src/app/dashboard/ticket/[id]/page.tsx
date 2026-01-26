'use client'
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // Adicionado
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { CheckCircle2, AlertCircle, Clock, DownloadCloud, Undo2, AlertTriangle } from "lucide-react"

export default function TicketDetails() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Estados para a Baixa de Item (Modal)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [resolutionData, setResolutionData] = useState({ valor: '', oc: '', previsao: '' })

  // Estados para DEVOLUÇÃO (Novo)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnReason, setReturnReason] = useState("")

  // 1. Busca os dados do ticket
  useEffect(() => {
    async function fetchTicket() {
      if (!params.id) return
      
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error("Erro ao buscar ticket:", error)
      } else {
        setTicket(data)
      }
      setLoading(false)
    }
    fetchTicket()
  }, [params.id])

  // --- LÓGICA DE BAIXA DE ITEM ---
  const abrirModalBaixa = (index: number) => {
    setSelectedItemIndex(index)
    setResolutionData({ valor: '', oc: '', previsao: '' }) 
    setModalOpen(true)
  }

  const confirmarBaixaItem = async () => {
    if (selectedItemIndex === null || !ticket) return

    if (ticket.category === 'Cotação' && !resolutionData.valor) return alert("Informe o preço!")
    if (ticket.category === 'Compras' && (!resolutionData.oc || !resolutionData.previsao)) return alert("Informe OC e Previsão!")

    const novosItens = [...ticket.custom_data.itens_tabela]
    
    novosItens[selectedItemIndex] = {
        ...novosItens[selectedItemIndex],
        status: 'concluido',
        resolucao: {
            data_baixa: new Date().toISOString(),
            ...resolutionData
        }
    }

    const todosConcluidos = novosItens.every((item: any) => item.status === 'concluido')
    const novoStatusTicket = todosConcluidos ? 'resolvido' : 'em_andamento'

    const novoCustomData = { ...ticket.custom_data, itens_tabela: novosItens }

    const { error } = await supabase
        .from('tickets')
        .update({ 
            custom_data: novoCustomData,
            status: novoStatusTicket
        })
        .eq('id', ticket.id)

    if (!error) {
        setTicket({ ...ticket, custom_data: novoCustomData, status: novoStatusTicket })
        setModalOpen(false)
        alert(todosConcluidos ? "Ticket finalizado com sucesso!" : "Item baixado com sucesso!")
        if(todosConcluidos) router.push('/dashboard')
    } else {
        alert("Erro ao salvar.")
    }
  }

  // --- LÓGICA GERAL E DEVOLUÇÃO ---

  async function updateGlobalStatus(newStatus: string) {
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', ticket.id)
    if (!error) {
        setTicket({ ...ticket, status: newStatus })
        if(newStatus === 'resolvido') router.push('/dashboard')
    }
  }

  // Nova Função: Confirmar Devolução
  async function confirmarDevolucao() {
      if (!returnReason.trim()) return alert("Por favor, explique o motivo da devolução.")

      const novoCustomData = {
          ...ticket.custom_data,
          motivo_devolucao: returnReason // Salva o motivo dentro dos dados do ticket
      }

      const { error } = await supabase
          .from('tickets')
          .update({ 
              status: 'devolvida',
              custom_data: novoCustomData
          })
          .eq('id', ticket.id)

      if (!error) {
          setTicket({ ...ticket, status: 'devolvida', custom_data: novoCustomData })
          setReturnModalOpen(false)
          setReturnReason("")
          alert("Solicitação devolvida ao solicitante.")
      } else {
          alert("Erro ao devolver.")
      }
  }

  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  if (loading) return <div className="flex h-screen items-center justify-center animate-pulse">Carregando...</div>
  if (!ticket) return <div className="p-10 text-center text-red-500 font-bold">Ticket não encontrado.</div>

  const itensTabela = ticket.custom_data?.itens_tabela
  const arquivoAnexo = ticket.custom_data?.nome_arquivo_anexo
  const urlAnexo = ticket.custom_data?.url_arquivo_anexo
  const pendencias = itensTabela?.filter((i: any) => i.status !== 'concluido').length || 0

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="hover:bg-gray-100">← Voltar</Button>

      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Ticket #{ticket.id}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    ticket.status === 'resolvido' ? 'bg-green-100 text-green-800' : 
                    ticket.status === 'devolvida' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                }`}>
                    {ticket.status === 'devolvida' ? 'Devolvida' : ticket.status.replace('_', ' ')}
                </span>
            </div>
            <p className="text-gray-500 mt-1 text-lg">{ticket.title}</p>
        </div>
      </div>

      {/* --- BANNER DE DEVOLUÇÃO (SE EXISTIR) --- */}
      {ticket.status === 'devolvida' && ticket.custom_data?.motivo_devolucao && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
              <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-600 mt-1" />
                  <div>
                      <h3 className="font-bold text-orange-800">Solicitação Devolvida</h3>
                      <p className="text-orange-900 mt-1 font-medium">Motivo: "{ticket.custom_data.motivo_devolucao}"</p>
                      <p className="text-xs text-orange-700 mt-2">Por favor, ajuste o necessário e abra uma nova solicitação ou entre em contato.</p>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA (Detalhes e Lista) */}
        <div className="md:col-span-3 space-y-6">
            
            {/* ALERTA DE PENDÊNCIA (Se não for devolvida nem resolvido) */}
            {ticket.status !== 'resolvido' && ticket.status !== 'devolvida' && itensTabela && (
                <div className={`p-4 rounded-md flex items-center gap-3 ${pendencias > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                    {pendencias > 0 ? <Clock className="text-blue-500" /> : <CheckCircle2 className="text-green-500" />}
                    <div>
                        <p className="font-bold text-gray-800">
                            {pendencias > 0 ? `Existem ${pendencias} itens pendentes.` : "Todos os itens foram processados."}
                        </p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Detalhes da Solicitação</CardTitle>
                    <CardDescription>Solicitante: <b>{ticket.requester_name || 'Desconhecido'}</b> | Categoria: <b>{ticket.category}</b></CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Descrição */}
                    <div className="bg-gray-50 p-4 rounded border">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Descrição Geral</h3>
                        <p className="whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* --- TABELA INTELIGENTE --- */}
                    {itensTabela && Array.isArray(itensTabela) && itensTabela.length > 0 && (
                        <div className="border rounded overflow-hidden">
                            <div className="bg-gray-100 p-3 text-xs font-bold text-gray-700 border-b grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-1">Cód</div>
                                <div className="col-span-4">Descrição</div>
                                <div className="col-span-1 text-center">Qtd</div>
                                <div className="col-span-2">Detalhes</div>
                                <div className="col-span-2">Status / Resolução</div>
                                <div className="col-span-2 text-center">Ação</div>
                            </div>
                            
                            {itensTabela.map((item: any, idx: number) => {
                                const isDone = item.status === 'concluido'
                                return (
                                    <div key={idx} className={`p-3 text-sm border-b grid grid-cols-12 gap-4 items-center ${isDone ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}>
                                        <div className="col-span-1 text-gray-500 text-xs">{item.codigo || '-'}</div>
                                        <div className="col-span-4 font-medium">
                                            {item.descricao}
                                            {item.pat && <span className="block text-xs text-gray-400">PAT: {item.pat}</span>}
                                        </div>
                                        <div className="col-span-1 text-center font-bold bg-gray-100 rounded p-1">{item.qtd}</div>
                                        <div className="col-span-2 text-xs text-gray-500">{item.aplicacao || '-'}</div>
                                        
                                        <div className="col-span-2 text-xs">
                                            {isDone ? (
                                                <div className="text-green-700">
                                                    <span className="flex items-center gap-1 font-bold"><CheckCircle2 size={12}/> Concluído</span>
                                                    {item.resolucao?.valor && <span>R$ {item.resolucao.valor}</span>}
                                                    {item.resolucao?.oc && <span className="block">OC: {item.resolucao.oc}</span>}
                                                    {item.resolucao?.previsao && <span className="block">Prev: {new Date(item.resolucao.previsao).toLocaleDateString()}</span>}
                                                </div>
                                            ) : (
                                                <span className="flex items-center gap-1 text-orange-500 font-bold"><Clock size={12}/> Pendente</span>
                                            )}
                                        </div>

                                        <div className="col-span-2 text-center">
                                            {!isDone && ticket.status !== 'devolvida' && (
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => abrirModalBaixa(idx)}
                                                    className="bg-black text-white hover:bg-gray-800 w-full"
                                                >
                                                    Baixar Item
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* --- Outros dados JSON --- */}
                    {ticket.custom_data && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {Object.entries(ticket.custom_data).map(([key, value]) => {
                                if (['description', 'prioridade', 'itens_tabela', 'nome_arquivo_anexo', 'url_arquivo_anexo', 'motivo_devolucao'].includes(key)) return null
                                if (!value) return null
                                return (
                                    <div key={key} className="bg-white p-3 rounded border shadow-sm">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase">{formatKey(key)}</span>
                                        <span className="font-medium text-sm truncate">{String(value)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* --- BOTÃO DE DOWNLOAD DO ARQUIVO --- */}
                    {urlAnexo && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-200 p-2 rounded text-blue-700"><DownloadCloud size={20}/></div>
                                <div>
                                    <p className="text-xs font-bold text-blue-800 uppercase">Arquivo Anexado</p>
                                    <p className="text-sm text-blue-900 font-medium truncate max-w-[200px] sm:max-w-md">
                                        {arquivoAnexo || "Documento do chamado"}
                                    </p>
                                </div>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-700 border-blue-200 hover:bg-blue-100"
                                onClick={() => window.open(urlAnexo, '_blank')}
                            >
                                Baixar / Visualizar
                            </Button>
                        </div>
                    )}

                </CardContent>
            </Card>

            {/* AÇÕES GLOBAIS (Rodapé) */}
            <div className="flex gap-4 justify-end mt-6 border-t pt-6">
                {ticket.status !== 'resolvido' && ticket.status !== 'devolvida' && (
                    <>
                         {/* BOTÃO DE DEVOLUÇÃO */}
                        <Button 
                            variant="outline"
                            onClick={() => setReturnModalOpen(true)} 
                            className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 gap-2"
                        >
                            <Undo2 size={16} /> Devolver Solicitação
                        </Button>

                        {/* BOTÃO DE RESOLUÇÃO */}
                        {(!itensTabela || itensTabela.length === 0) && (
                            <Button onClick={() => updateGlobalStatus('resolvido')} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                <CheckCircle2 size={16} /> Marcar como Resolvido
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* --- MODAL DE BAIXA DE ITEM --- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Baixar Item</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {selectedItemIndex !== null && itensTabela && (
                    <div className="bg-gray-100 p-3 rounded mb-4">
                        <p className="text-sm font-bold">{itensTabela[selectedItemIndex].descricao}</p>
                        <p className="text-xs text-gray-500">Qtd: {itensTabela[selectedItemIndex].qtd}</p>
                    </div>
                )}
                {/* Formulario Baixa (Mantido igual) */}
                {ticket.category === 'Cotação' ? (
                    <div><Label>Preço Fechado</Label><Input value={resolutionData.valor} onChange={e => setResolutionData({...resolutionData, valor: e.target.value})} /></div>
                ) : ticket.category === 'Compras' ? (
                    <div className="grid gap-4">
                        <div><Label>O.C.</Label><Input value={resolutionData.oc} onChange={e => setResolutionData({...resolutionData, oc: e.target.value})} /></div>
                        <div><Label>Previsão</Label><Input type="date" value={resolutionData.previsao} onChange={e => setResolutionData({...resolutionData, previsao: e.target.value})} /></div>
                    </div>
                ) : (
                    <div><Label>Observação</Label><Input value={resolutionData.valor} onChange={e => setResolutionData({...resolutionData, valor: e.target.value})} /></div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarBaixaItem} className="bg-black text-white">Confirmar Baixa</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- NOVO: MODAL DE DEVOLUÇÃO --- */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-orange-700 flex items-center gap-2">
                    <Undo2 size={20}/> Devolver Solicitação
                </DialogTitle>
                <DialogDescription>
                    Explique o motivo para que o solicitante possa corrigir.
                </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <Label>Motivo da Devolução</Label>
                    <Textarea 
                        placeholder="Ex: Faltou anexar o comprovante; A quantidade está incorreta..." 
                        rows={4}
                        value={returnReason}
                        onChange={e => setReturnReason(e.target.value)}
                    />
                </div>
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setReturnModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarDevolucao} className="bg-orange-600 hover:bg-orange-700 text-white">
                    Confirmar Devolução
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}