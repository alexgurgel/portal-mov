'use client'
import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, UploadCloud, FileText, ArrowLeft, CheckCircle, Clock, XCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

export default function ControleRelatorio() {
  const [registros, setRegistros] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Controle das Modais
  const [openNew, setOpenNew] = useState(false) // Modal de Novo Cadastro
  const [openDetails, setOpenDetails] = useState(false) // Modal de Detalhes/Edição
  const [selectedTicket, setSelectedTicket] = useState<any>(null) // Ticket selecionado para ver detalhes

  const [uploading, setUploading] = useState(false)
  
  // Estados do Formulário de Criação
  const [empresa, setEmpresa] = useState("")
  const [pat, setPat] = useState("")
  const [assunto, setAssunto] = useState("")
  const [descricao, setDescricao] = useState("")
  const [numRelatorio, setNumRelatorio] = useState("")
  const [acao, setAcao] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)

  useEffect(() => {
    fetchRegistros()
  }, [])

  async function fetchRegistros() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('category', 'Controle de Relatorio') 
      .order('created_at', { ascending: false })

    if (data) setRegistros(data)
    setLoading(false)
  }

  // --- FUNÇÃO DE SALVAR NOVO ---
  async function handleSalvar() {
    if (!empresa || !assunto || !acao) {
        return alert("Preencha Empresa, Assunto e Ação.")
    }

    setUploading(true)

    try {
        const { data: { user } } = await supabase.auth.getUser()
        
        let urlArquivo = null
        let nomeArquivo = null

        if (arquivo) {
            nomeArquivo = arquivo.name
            const nomeUnico = `${Date.now()}-${nomeArquivo}`
            const { error: uploadError } = await supabase.storage.from('anexos').upload(nomeUnico, arquivo)
            if (uploadError) throw new Error("Erro no upload: " + uploadError.message)
            
            const { data: publicUrl } = supabase.storage.from('anexos').getPublicUrl(nomeUnico)
            urlArquivo = publicUrl.publicUrl
        }

        const { error } = await supabase.from('tickets').insert({
            title: assunto,
            description: descricao,
            category: 'Controle de Relatorio',
            priority: 'media', 
            status: 'aberto', // AUTOMÁTICO: Sempre nasce aberto
            user_id: user?.id,
            requester_name: "Controle Interno",
            custom_data: {
                empresa: empresa,
                pat: pat,
                num_relatorio: numRelatorio,
                acao: acao,
                nome_arquivo: nomeArquivo,
                url_arquivo: urlArquivo
            }
        })

        if (error) throw error

        alert("Relatório criado com sucesso!")
        setOpenNew(false)
        fetchRegistros()
        limparForm()

    } catch (error: any) {
        console.error(error)
        alert("Erro ao salvar: " + error.message)
    } finally {
        setUploading(false)
    }
  }

  // --- FUNÇÃO DE ATUALIZAR STATUS ---
  async function handleUpdateStatus(newStatus: string) {
    if (!selectedTicket) return

    setUploading(true)
    try {
        const { error } = await supabase
            .from('tickets')
            .update({ status: newStatus })
            .eq('id', selectedTicket.id)

        if (error) throw error

        // Atualiza a lista localmente e fecha modal
        fetchRegistros()
        setOpenDetails(false)
        alert(`Status atualizado para: ${newStatus === 'resolvido' ? 'Concluído' : 'Em Andamento'}`)

    } catch (error: any) {
        alert("Erro ao atualizar: " + error.message)
    } finally {
        setUploading(false)
    }
  }

  function limparForm() {
    setEmpresa(""); setPat(""); setAssunto(""); setDescricao(""); setNumRelatorio(""); setAcao(""); setArquivo(null);
  }

  // Helpers de visual
  const getStatusColor = (st: string) => {
    switch(st) {
        case 'resolvido': return 'bg-green-100 text-green-800 border-green-200';
        case 'andamento': return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  }
  
  const getStatusLabel = (st: string) => {
    switch(st) {
        case 'resolvido': return 'Concluído';
        case 'andamento': return 'Em Andamento';
        default: return 'Pendente';
    }
  }

  const getAcaoColor = (ac: string) => {
      return ac === 'Corretiva Imediata' 
        ? 'bg-red-50 text-red-700 border-red-200' 
        : 'bg-blue-50 text-blue-700 border-blue-200';
  }

  // Abre os detalhes ao clicar na linha
  const handleRowClick = (item: any) => {
      setSelectedTicket(item)
      setOpenDetails(true)
  }

  return (
    <div className="p-8 space-y-4 bg-gray-50 min-h-screen">
      
      {/* BOTÃO VOLTAR */}
      <div>
        <Link href="/dashboard">
            <Button variant="ghost" className="pl-0 text-gray-500 hover:text-gray-900 gap-2 mb-2">
                <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
            </Button>
        </Link>
      </div>

      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-blue-900">Controle de Relatório</h1>
            <p className="text-gray-500 text-sm">Gestão interna de preventivas e corretivas.</p>
        </div>
        
        {/* MODAL DE NOVO CADASTRO */}
        <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
                    <Plus className="w-4 h-4"/> Novo Relatório
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Inserir Novo Relatório</DialogTitle></DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Empresa</Label>
                            <Input value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Cliente" />
                        </div>
                        <div className="space-y-1">
                            <Label>PAT (Patrimônio)</Label>
                            <Input value={pat} onChange={e => setPat(e.target.value)} placeholder="Ex: 00123" />
                        </div>
                        <div className="space-y-1">
                            <Label>Nº do Relatório</Label>
                            <Input value={numRelatorio} onChange={e => setNumRelatorio(e.target.value)} placeholder="001/2026" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label>Assunto</Label>
                        <Input value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Título do problema ou serviço" />
                    </div>

                    <div className="space-y-1">
                        <Label>Descrição Detalhada</Label>
                        <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes do que foi feito..." rows={3} />
                    </div>

                    <div className="space-y-1">
                        <Label>Ação Necessária</Label>
                        <Select onValueChange={setAcao}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Prox. Preventiva">Prox. Preventiva</SelectItem>
                                <SelectItem value="Corretiva Imediata">Corretiva Imediata</SelectItem>
                                <SelectItem value="Acompanhamento">Acompanhamento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* STATUS REMOVIDO DAQUI - VAI AUTOMATICO */}

                    <div className="border border-dashed border-blue-300 bg-blue-50 p-4 rounded-md">
                        <Label className="flex items-center gap-2 mb-2 text-blue-800">
                            <UploadCloud className="w-4 h-4"/> Anexar Documento
                        </Label>
                        <Input type="file" className="bg-white cursor-pointer" onChange={e => setArquivo(e.target.files?.[0] || null)} />
                    </div>

                    <Button onClick={handleSalvar} disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700">
                        {uploading ? "Salvando..." : "Salvar Registro"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        {/* MODAL DE DETALHES E EDIÇÃO DE STATUS */}
        <Dialog open={openDetails} onOpenChange={setOpenDetails}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-blue-900">Detalhes do Relatório #{selectedTicket?.id}</DialogTitle>
                    <DialogDescription>Gerencie o status e veja os detalhes deste registro.</DialogDescription>
                </DialogHeader>
                
                {selectedTicket && (
                    <div className="space-y-6 py-2">
                        {/* Cabeçalho do Ticket */}
                        <div className="bg-gray-50 p-4 rounded-md border grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Empresa</p>
                                <p className="font-medium">{selectedTicket.custom_data?.empresa}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Patrimônio</p>
                                <p className="font-medium">{selectedTicket.custom_data?.pat || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Nº Relatório</p>
                                <p className="font-medium">{selectedTicket.custom_data?.num_relatorio || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Data</p>
                                <p className="font-medium">{new Date(selectedTicket.created_at).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        {/* Corpo do Ticket */}
                        <div className="space-y-3">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{selectedTicket.title}</h3>
                                <span className={`inline-block px-2 py-1 rounded text-xs font-bold border mt-1 ${getAcaoColor(selectedTicket.custom_data?.acao)}`}>
                                    {selectedTicket.custom_data?.acao}
                                </span>
                            </div>
                            <div className="bg-white border p-3 rounded text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                {selectedTicket.description}
                            </div>
                        </div>

                        {/* Anexo */}
                        {selectedTicket.custom_data?.url_arquivo_anexo && (
                            <a href={selectedTicket.custom_data.url_arquivo_anexo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline bg-blue-50 p-2 rounded border border-blue-100">
                                <FileText className="w-4 h-4"/> 
                                Ver Documento Anexado ({selectedTicket.custom_data?.nome_arquivo || 'Arquivo'})
                            </a>
                        )}

                        {/* Ações de Status */}
                        <div className="border-t pt-4">
                            <Label className="mb-3 block text-gray-500 text-xs uppercase font-bold">Alterar Status</Label>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    className={`flex-1 gap-2 ${selectedTicket.status === 'andamento' ? 'bg-blue-100 border-blue-500' : ''}`}
                                    onClick={() => handleUpdateStatus('andamento')}
                                >
                                    <Clock className="w-4 h-4 text-blue-600"/> Em Andamento
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className={`flex-1 gap-2 ${selectedTicket.status === 'resolvido' ? 'bg-green-100 border-green-500' : ''}`}
                                    onClick={() => handleUpdateStatus('resolvido')}
                                >
                                    <CheckCircle className="w-4 h-4 text-green-600"/> Concluir
                                </Button>
                            </div>
                            {selectedTicket.status !== 'aberto' && (
                                <div className="mt-2 text-center">
                                    <Button variant="link" size="sm" className="text-xs text-gray-400" onClick={() => handleUpdateStatus('aberto')}>
                                        Reabrir (Voltar para Pendente)
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-700 font-bold uppercase text-xs">
                    <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Empresa</th>
                        <th className="px-4 py-3">PAT</th>
                        <th className="px-4 py-3">Assunto / Descrição</th>
                        <th className="px-4 py-3">Nº Rel.</th>
                        <th className="px-4 py-3">Ação</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-center">Anexo</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {registros.length === 0 && (
                        <tr><td colSpan={9} className="text-center py-8 text-gray-500">Nenhum relatório encontrado.</td></tr>
                    )}
                    {registros.map((item: any) => (
                        <tr 
                            key={item.id} 
                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => handleRowClick(item)}
                        >
                            <td className="px-4 py-3 font-bold text-gray-600">#{item.id}</td>
                            <td className="px-4 py-3 font-medium">{item.custom_data?.empresa || '-'}</td>
                            <td className="px-4 py-3 font-bold text-gray-700">{item.custom_data?.pat || '-'}</td>
                            <td className="px-4 py-3">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900">{item.title}</span>
                                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</span>
                                </div>
                            </td>
                            <td className="px-4 py-3">{item.custom_data?.num_relatorio || '-'}</td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getAcaoColor(item.custom_data?.acao)}`}>
                                    {item.custom_data?.acao || '-'}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                                {new Date(item.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                                    {getStatusLabel(item.status)}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                                {item.custom_data?.url_arquivo_anexo ? (
                                    <div className="flex justify-center">
                                        <FileText className="w-4 h-4 text-blue-600"/>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-300">-</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  )
}