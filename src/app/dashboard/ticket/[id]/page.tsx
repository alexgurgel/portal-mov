'use client'
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { CheckCircle2, AlertCircle, Clock, DownloadCloud } from "lucide-react"

export default function TicketDetails() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Estados para a Baixa de Item (Modal)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [resolutionData, setResolutionData] = useState({ valor: '', oc: '', previsao: '' })

  // 1. Busca os dados do ticket
  useEffect(() => {
    async function fetchTicket() {
      if (!params.id) return
      
      // Buscamos apenas o ticket (sem profiles para evitar erro de relação por enquanto)
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
    setResolutionData({ valor: '', oc: '', previsao: '' }) // Limpa campos
    setModalOpen(true)
  }

  const confirmarBaixaItem = async () => {
    if (selectedItemIndex === null || !ticket) return

    // Validação básica
    if (ticket.category === 'Cotação' && !resolutionData.valor) return alert("Informe o preço!")
    if (ticket.category === 'Compras' && (!resolutionData.oc || !resolutionData.previsao)) return alert("Informe OC e Previsão!")

    // 1. Clona a estrutura atual dos itens
    const novosItens = [...ticket.custom_data.itens_tabela]
    
    // 2. Atualiza o item específico com os dados da baixa
    novosItens[selectedItemIndex] = {
        ...novosItens[selectedItemIndex],
        status: 'concluido',
        resolucao: {
            data_baixa: new Date().toISOString(),
            ...resolutionData
        }
    }

    // 3. Verifica se TODOS os itens estão concluídos
    const todosConcluidos = novosItens.every((item: any) => item.status === 'concluido')
    const novoStatusTicket = todosConcluidos ? 'resolvido' : 'em_andamento'

    // 4. Salva no Supabase
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
        alert(todosConcluidos ? "Item baixado! Todos os itens foram resolvidos, ticket fechado." : "Item baixado com sucesso!")
        if(todosConcluidos) router.push('/dashboard')
    } else {
        alert("Erro ao salvar.")
    }
  }

  // --- LÓGICA GERAL DO TICKET ---

  async function updateGlobalStatus(newStatus: string) {
    const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', ticket.id)
    if (!error) {
        setTicket({ ...ticket, status: newStatus })
        if(newStatus === 'resolvido') router.push('/dashboard')
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
                    ticket.status === 'resolvido' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                    {ticket.status.replace('_', ' ')}
                </span>
            </div>
            <p className="text-gray-500 mt-1 text-lg">{ticket.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA (Detalhes e Lista) */}
        <div className="md:col-span-3 space-y-6">
            
            {/* ALERTA DE PENDÊNCIA */}
            {ticket.status !== 'resolvido' && itensTabela && (
                <div className={`p-4 rounded-md flex items-center gap-3 ${pendencias > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                    {pendencias > 0 ? <AlertCircle className="text-orange-500" /> : <CheckCircle2 className="text-green-500" />}
                    <div>
                        <p className="font-bold text-gray-800">
                            {pendencias > 0 ? `Atenção: Existem ${pendencias} itens pendentes neste ticket.` : "Todos os itens foram resolvidos."}
                        </p>
                        <p className="text-sm text-gray-600">O ticket só será finalizado quando todos os itens forem baixados.</p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Detalhes da Solicitação</CardTitle>
                    <CardDescription>Categoria: <b>{ticket.category}</b></CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    
                    {/* Descrição */}
                    <div className="bg-gray-50 p-4 rounded border">
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Descrição Geral</h3>
                        <p className="whitespace-pre-wrap">{ticket.description}</p>
                    </div>

                    {/* --- TABELA INTELIGENTE (Cotação/Compras) --- */}
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
                                        
                                        {/* COLUNA DE RESOLUÇÃO (O que foi feito) */}
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

                                        {/* BOTÃO DE AÇÃO */}
                                        <div className="col-span-2 text-center">
                                            {!isDone && (
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
                                if (['description', 'prioridade', 'itens_tabela', 'nome_arquivo_anexo', 'url_arquivo_anexo'].includes(key)) return null
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

            {/* Ações Globais (Só mostra se não for lista de itens, ou se quiser forçar fechamento) */}
            {(!itensTabela || itensTabela.length === 0) && (
                <div className="flex gap-4 justify-end">
                    {ticket.status !== 'resolvido' && (
                        <Button onClick={() => updateGlobalStatus('resolvido')} className="bg-green-600 hover:bg-green-700 text-white">
                            Marcar Chamado Inteiro como Resolvido
                        </Button>
                    )}
                </div>
            )}
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

                {/* FORMULÁRIO DINÂMICO BASEADO NO TIPO */}
                {ticket.category === 'Cotação' ? (
                    <div>
                        <Label>Preço de Compra / Fornecedor Fechado</Label>
                        <Input 
                            placeholder="Ex: R$ 150,00 - Loja do Mecânico" 
                            value={resolutionData.valor}
                            onChange={e => setResolutionData({...resolutionData, valor: e.target.value})}
                        />
                    </div>
                ) : ticket.category === 'Compras' ? (
                    <div className="grid gap-4">
                        <div>
                            <Label>Número da O.C. (Ordem de Compra)</Label>
                            <Input 
                                placeholder="Ex: 12345" 
                                value={resolutionData.oc}
                                onChange={e => setResolutionData({...resolutionData, oc: e.target.value})}
                            />
                        </div>
                        <div>
                            <Label>Previsão de Entrega</Label>
                            <Input 
                                type="date"
                                value={resolutionData.previsao}
                                onChange={e => setResolutionData({...resolutionData, previsao: e.target.value})}
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <Label>Observação de Conclusão</Label>
                        <Input 
                            placeholder="O que foi feito?" 
                            value={resolutionData.valor}
                            onChange={e => setResolutionData({...resolutionData, valor: e.target.value})}
                        />
                    </div>
                )}
            </div>

            <DialogFooter>
                <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarBaixaItem} className="bg-black text-white">Confirmar Baixa</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}