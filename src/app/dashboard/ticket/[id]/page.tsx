'use client'
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { 
    CheckCircle2, AlertCircle, Clock, DownloadCloud, 
    Undo2, AlertTriangle, UploadCloud, Paperclip, XCircle, User 
} from "lucide-react"

export default function TicketDetails() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState("Usuário") // NOVO: Guarda quem está logado

  // Estados para a Baixa de Item (Sucesso)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [resolutionData, setResolutionData] = useState({ valor: '', oc: '', previsao: '' })
  const [arquivoBaixa, setArquivoBaixa] = useState<File | null>(null)

  // Estados para Devolução de ITEM (Parcial)
  const [modalItemReturnOpen, setModalItemReturnOpen] = useState(false)
  const [itemReturnReason, setItemReturnReason] = useState("")

  // Estados para Devolução GLOBAL (Ticket inteiro)
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnReason, setReturnReason] = useState("")

  // Estados para Resolução GLOBAL
  const [globalResolveModalOpen, setGlobalResolveModalOpen] = useState(false)
  const [arquivoGlobal, setArquivoGlobal] = useState<File | null>(null)
  const [obsGlobal, setObsGlobal] = useState("")

  useEffect(() => {
    async function fetchData() {
      // 1. Busca quem está logado para registrar na ação
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const nome = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Usuário"
        setCurrentUserName(nome.replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))
      }

      // 2. Busca os dados do ticket
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
    fetchData()
  }, [params.id])

  const sanitizeFileName = (name: string) => {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
  }

  async function uploadFile(file: File) {
      const nomeLimpo = sanitizeFileName(file.name)
      const nomeArquivoUnico = `${Date.now()}-${nomeLimpo}`
      const { error } = await supabase.storage.from('anexos').upload(nomeArquivoUnico, file)
      if (error) throw new Error("Erro no upload: " + error.message)
      const { data } = supabase.storage.from('anexos').getPublicUrl(nomeArquivoUnico)
      return { url: data.publicUrl, nome: nomeLimpo }
  }

  // --- LÓGICA: BAIXAR ITEM (SUCESSO) ---
  const abrirModalBaixa = (index: number) => {
    setSelectedItemIndex(index)
    setResolutionData({ valor: '', oc: '', previsao: '' }) 
    setArquivoBaixa(null) 
    setModalOpen(true)
  }

  const confirmarBaixaItem = async () => {
    if (selectedItemIndex === null || !ticket) return
    if (ticket.category === 'Cotação' && !resolutionData.valor) return alert("Informe o preço!")
    if (ticket.category === 'Compras' && (!resolutionData.oc || !resolutionData.previsao)) return alert("Informe OC e Previsão!")

    try {
        let dadosArquivo = null
        if (arquivoBaixa) dadosArquivo = await uploadFile(arquivoBaixa)

        const novosItens = [...ticket.custom_data.itens_tabela]
        novosItens[selectedItemIndex] = {
            ...novosItens[selectedItemIndex],
            status: 'concluido', 
            resolucao: {
                data_baixa: new Date().toISOString(),
                responsavel: currentUserName, // NOVO: REGISTRA QUEM FEZ
                ...resolutionData,
                arquivo: dadosArquivo
            }
        }

        const todosProcessados = novosItens.every((item: any) => item.status === 'concluido' || item.status === 'devolvido')
        const todosDevolvidos = novosItens.every((item: any) => item.status === 'devolvido')
        
        const novoStatusTicket = todosProcessados 
            ? (todosDevolvidos ? 'devolvida' : 'resolvido') 
            : 'em_andamento'
        
        const novoCustomData = { ...ticket.custom_data, itens_tabela: novosItens }

        const { error } = await supabase.from('tickets').update({ custom_data: novoCustomData, status: novoStatusTicket }).eq('id', ticket.id)

        if (!error) {
            setTicket({ ...ticket, custom_data: novoCustomData, status: novoStatusTicket })
            setModalOpen(false)
            alert(todosProcessados ? "Todos os itens processados. Chamado finalizado!" : "Item baixado com sucesso!")
            if(todosProcessados) router.push('/dashboard')
        } else {
            alert("Erro ao salvar.")
        }
    } catch (err: any) { alert(err.message) }
  }

  // --- LÓGICA: DEVOLVER ITEM (PARCIAL) ---
  const abrirModalDevolucaoItem = (index: number) => {
      setSelectedItemIndex(index)
      setItemReturnReason("")
      setModalItemReturnOpen(true)
  }

  const confirmarDevolucaoItem = async () => {
      if (selectedItemIndex === null || !ticket) return
      if (!itemReturnReason.trim()) return alert("Informe o motivo da devolução deste item.")

      try {
        const novosItens = [...ticket.custom_data.itens_tabela]
        novosItens[selectedItemIndex] = {
            ...novosItens[selectedItemIndex],
            status: 'devolvido', 
            resolucao: {
                data_baixa: new Date().toISOString(),
                motivo_devolucao: itemReturnReason,
                responsavel: currentUserName // NOVO: REGISTRA QUEM DEVOLVEU
            }
        }

        const todosProcessados = novosItens.every((item: any) => item.status === 'concluido' || item.status === 'devolvido')
        const todosDevolvidos = novosItens.every((item: any) => item.status === 'devolvido')
        
        const novoStatusTicket = todosProcessados 
            ? (todosDevolvidos ? 'devolvida' : 'resolvido') 
            : 'em_andamento'
        
        const novoCustomData = { ...ticket.custom_data, itens_tabela: novosItens }

        const { error } = await supabase.from('tickets').update({ custom_data: novoCustomData, status: novoStatusTicket }).eq('id', ticket.id)

        if (!error) {
            setTicket({ ...ticket, custom_data: novoCustomData, status: novoStatusTicket })
            setModalItemReturnOpen(false)
            alert("Item marcado como devolvido.")
            if(todosProcessados) router.push('/dashboard')
        } else {
            alert("Erro ao salvar.")
        }

      } catch (err: any) { alert(err.message) }
  }

  // --- LÓGICA GERAL (Ticket Inteiro) ---
  const handleOpenGlobalResolve = () => {
      setObsGlobal("")
      setArquivoGlobal(null)
      setGlobalResolveModalOpen(true)
  }

  async function confirmarResolucaoGlobal() {
    try {
        let dadosArquivo = null
        if (arquivoGlobal) dadosArquivo = await uploadFile(arquivoGlobal)

        const novoCustomData = {
            ...ticket.custom_data,
            resolucao_global: {
                data_resolucao: new Date().toISOString(),
                obs: obsGlobal,
                arquivo: dadosArquivo,
                responsavel: currentUserName // NOVO: REGISTRA QUEM RESOLVEU GLOBAL
            }
        }

        const { error } = await supabase.from('tickets').update({ status: 'resolvido', custom_data: novoCustomData }).eq('id', ticket.id)

        if (!error) {
            setTicket({ ...ticket, status: 'resolvido', custom_data: novoCustomData })
            setGlobalResolveModalOpen(false)
            alert("Chamado resolvido com sucesso!")
            router.push('/dashboard')
        } else {
            alert("Erro ao salvar resolução.")
        }
    } catch (err: any) { alert(err.message) }
  }

  async function confirmarDevolucaoGlobal() {
      if (!returnReason.trim()) return alert("Por favor, explique o motivo da devolução.")
      const novoCustomData = { 
        ...ticket.custom_data, 
        motivo_devolucao: returnReason,
        responsavel_devolucao: currentUserName // NOVO: REGISTRA QUEM DEVOLVEU GLOBAL
      }
      const { error } = await supabase.from('tickets').update({ status: 'devolvida', custom_data: novoCustomData }).eq('id', ticket.id)
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
  const anexos = ticket.custom_data?.anexos || []
  const anexoUnico = ticket.custom_data?.url_arquivo_anexo ? [{ nome: ticket.custom_data.nome_arquivo_anexo || 'Arquivo', url: ticket.custom_data.url_arquivo_anexo }] : []
  const listaExibicao = anexos.length > 0 ? anexos : anexoUnico

  // Pendencia agora considera itens que não são concluidos NEM devolvidos
  const pendencias = itensTabela?.filter((i: any) => i.status !== 'concluido' && i.status !== 'devolvido').length || 0
  const resolucaoGlobal = ticket.custom_data?.resolucao_global

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="hover:bg-gray-100">← Voltar</Button>

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

      {/* BANNERS DE STATUS GLOBAL */}
      {ticket.status === 'devolvida' && ticket.custom_data?.motivo_devolucao && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
              <div className="flex items-start gap-3">
                  <AlertTriangle className="text-orange-600 mt-1" />
                  <div>
                      <h3 className="font-bold text-orange-800">Solicitação Devolvida (Global)</h3>
                      <p className="text-orange-900 mt-1 font-medium">Motivo: "{ticket.custom_data.motivo_devolucao}"</p>
                      {/* MOSTRA QUEM DEVOLVEU NO BANNER GLOBAL */}
                      {ticket.custom_data.responsavel_devolucao && (
                          <p className="text-orange-700 text-xs mt-2 flex items-center gap-1 font-semibold">
                             <User size={12}/> Devolvido por: {ticket.custom_data.responsavel_devolucao}
                          </p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {resolucaoGlobal && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-sm">
              <div className="flex items-start gap-3">
                  <CheckCircle2 className="text-green-600 mt-1" />
                  <div>
                      <h3 className="font-bold text-green-800">Solicitação Resolvida/Concluída</h3>
                      {resolucaoGlobal.obs && <p className="text-green-900 mt-1">{resolucaoGlobal.obs}</p>}
                      {/* MOSTRA QUEM RESOLVEU NO BANNER GLOBAL */}
                      {resolucaoGlobal.responsavel && (
                          <p className="text-green-700 text-xs mt-2 flex items-center gap-1 font-semibold">
                             <User size={12}/> Finalizado por: {resolucaoGlobal.responsavel}
                          </p>
                      )}
                      {resolucaoGlobal.arquivo && (
                          <div className="mt-3">
                              <a href={resolucaoGlobal.arquivo.url} target="_blank" rel="noopener noreferrer" 
                                 className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-green-200 text-green-700 hover:bg-green-50 w-fit text-sm font-bold">
                                  <Paperclip size={16}/> Baixar Arquivo da Resolução ({resolucaoGlobal.arquivo.nome})
                              </a>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 space-y-6">
            
            {/* ALERTAS DE ITENS */}
            {ticket.status !== 'resolvido' && ticket.status !== 'devolvida' && itensTabela && (
                <div className={`p-4 rounded-md flex items-center gap-3 ${pendencias > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                    {pendencias > 0 ? <Clock className="text-blue-500" /> : <CheckCircle2 className="text-green-500" />}
                    <div>
                        <p className="font-bold text-gray-800">{pendencias > 0 ? `Existem ${pendencias} itens pendentes.` : "Todos os itens foram processados."}</p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Detalhes da Solicitação</CardTitle>
                    <CardDescription>Solicitante: <b>{ticket.requester_name || 'Desconhecido'}</b> | Categoria: <b>{ticket.category}</b></CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-gray-50 p-4 rounded border">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Descrição Geral</h3>
                        <p className="whitespace-pre-wrap break-words">{ticket.description}</p>
                    </div>

                    {/* TABELA DE ITENS */}
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
                                const isReturned = item.status === 'devolvido'
                                
                                return (
                                    <div key={idx} className={`p-3 text-sm border-b grid grid-cols-12 gap-4 items-center ${isDone ? 'bg-green-50/50' : isReturned ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}>
                                        <div className="col-span-1 text-gray-500 text-xs">{item.codigo || '-'}</div>
                                        <div className="col-span-4 font-medium break-words">{item.descricao}{item.pat && <span className="block text-xs text-gray-400">PAT: {item.pat}</span>}</div>
                                        <div className="col-span-1 text-center font-bold bg-gray-100 rounded p-1">{item.qtd}</div>
                                        <div className="col-span-2 text-xs text-gray-500 break-words">{item.aplicacao || '-'}</div>
                                        
                                        {/* COLUNA DE STATUS DO ITEM */}
                                        <div className="col-span-2 text-xs">
                                            {isDone && (
                                                <div className="text-green-700">
                                                    <span className="flex items-center gap-1 font-bold"><CheckCircle2 size={12}/> Concluído</span>
                                                    {/* MOSTRA QUEM BAIXOU O ITEM */}
                                                    {item.resolucao?.responsavel && <span className="block text-[10px] text-green-600 font-semibold mt-0.5">por {item.resolucao.responsavel}</span>}
                                                    {item.resolucao?.valor && <span className="block mt-1">R$ {item.resolucao.valor}</span>}
                                                    {item.resolucao?.oc && <span className="block">OC: {item.resolucao.oc}</span>}
                                                    {item.resolucao?.arquivo && (
                                                        <a href={item.resolucao.arquivo.url} target="_blank" className="flex items-center gap-1 text-blue-600 underline mt-1"><Paperclip size={10}/> Anexo</a>
                                                    )}
                                                </div>
                                            )}
                                            {isReturned && (
                                                <div className="text-orange-700">
                                                    <span className="flex items-center gap-1 font-bold"><Undo2 size={12}/> Devolvido</span>
                                                    {/* MOSTRA QUEM DEVOLVEU O ITEM */}
                                                    {item.resolucao?.responsavel && <span className="block text-[10px] text-orange-600 font-semibold mt-0.5">por {item.resolucao.responsavel}</span>}
                                                    <span className="block mt-1 italic">"{item.resolucao?.motivo_devolucao}"</span>
                                                </div>
                                            )}
                                            {!isDone && !isReturned && (
                                                <span className="flex items-center gap-1 text-orange-500 font-bold"><Clock size={12}/> Pendente</span>
                                            )}
                                        </div>

                                        {/* COLUNA DE AÇÃO */}
                                        <div className="col-span-2 text-center flex flex-col gap-2">
                                            {!isDone && !isReturned && ticket.status !== 'devolvida' && (
                                                <>
                                                    <Button size="sm" onClick={() => abrirModalBaixa(idx)} className="bg-black text-white hover:bg-gray-800 w-full h-7 text-xs">
                                                        Baixar
                                                    </Button>
                                                    <Button size="sm" onClick={() => abrirModalDevolucaoItem(idx)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 w-full h-7 text-xs">
                                                        Devolver
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {ticket.custom_data && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {Object.entries(ticket.custom_data).map(([key, value]) => {
                                if (['description', 'prioridade', 'itens_tabela', 'nome_arquivo_anexo', 'url_arquivo_anexo', 'motivo_devolucao', 'resolucao_global', 'responsavel_devolucao', 'anexos'].includes(key)) return null
                                if (!value) return null
                                return (
                                    <div key={key} className="bg-white p-3 rounded border shadow-sm max-h-60 overflow-y-auto">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase">{formatKey(key)}</span>
                                        {/* AQUI ESTÁ A CORREÇÃO: break-words e whitespace-pre-wrap */}
                                        <span className="font-medium text-sm break-words whitespace-pre-wrap">{String(value)}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {listaExibicao.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-blue-200 p-2 rounded text-blue-700"><DownloadCloud size={20}/></div>
                                <p className="text-sm font-bold text-blue-800 uppercase">Arquivos Anexados ({listaExibicao.length})</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {listaExibicao.map((anexo: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100 shadow-sm">
                                        <span className="text-sm text-gray-600 truncate max-w-[200px]">{anexo.nome}</span>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="text-blue-700 border-blue-200 hover:bg-blue-50 h-8"
                                            onClick={() => window.open(anexo.url, '_blank')}
                                        >
                                            Baixar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </CardContent>
            </Card>

            <div className="flex gap-4 justify-end mt-6 border-t pt-6">
                {ticket.status !== 'resolvido' && ticket.status !== 'devolvida' && (
                    <>
                        <Button variant="outline" onClick={() => setReturnModalOpen(true)} className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 gap-2">
                            <Undo2 size={16} /> Devolver Tudo
                        </Button>
                        {(!itensTabela || itensTabela.length === 0) && (
                            <Button onClick={handleOpenGlobalResolve} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                <CheckCircle2 size={16} /> Resolver Solicitação
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* MODAL BAIXA ITEM */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Baixar Item</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
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
                <div className="border-t pt-4 mt-2">
                    <Label className="flex items-center gap-2 mb-2 text-blue-800 font-bold text-xs uppercase"><UploadCloud size={14}/> Anexar Comprovante (Opcional)</Label>
                    <Input type="file" className="cursor-pointer" onChange={e => setArquivoBaixa(e.target.files?.[0] || null)} />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarBaixaItem} className="bg-black text-white">Confirmar Baixa</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DEVOLUÇÃO ITEM (PARCIAL) */}
      <Dialog open={modalItemReturnOpen} onOpenChange={setModalItemReturnOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-red-600 flex items-center gap-2">
                    <XCircle size={20}/> Devolver Item Específico
                </DialogTitle>
                <DialogDescription>Este item será marcado como devolvido, mas o restante do chamado continuará.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label>Motivo da Devolução do Item</Label>
                <Textarea 
                    value={itemReturnReason} 
                    onChange={e => setItemReturnReason(e.target.value)} 
                    placeholder="Ex: Item indisponível; Especificação incorreta..."
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setModalItemReturnOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarDevolucaoItem} className="bg-red-600 hover:bg-red-700 text-white">Confirmar Devolução</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL RESOLUÇÃO GLOBAL */}
      <Dialog open={globalResolveModalOpen} onOpenChange={setGlobalResolveModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Finalizar Solicitação</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <div><Label>Observações</Label><Textarea value={obsGlobal} onChange={e => setObsGlobal(e.target.value)} /></div>
                <div className="border-t pt-4 mt-2"><Label className="flex items-center gap-2 mb-2 text-green-800 font-bold text-xs uppercase"><UploadCloud size={14}/> Anexar Arquivo Final</Label><Input type="file" onChange={e => setArquivoGlobal(e.target.files?.[0] || null)} /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setGlobalResolveModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarResolucaoGlobal} className="bg-green-600 text-white hover:bg-green-700">Concluir</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DEVOLUÇÃO GLOBAL */}
      <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Devolver Solicitação Inteira</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <Label>Motivo</Label><Textarea rows={4} value={returnReason} onChange={e => setReturnReason(e.target.value)}/>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setReturnModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarDevolucaoGlobal} className="bg-orange-600 text-white">Confirmar</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}