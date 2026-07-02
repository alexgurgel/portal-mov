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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
    CheckCircle2, AlertCircle, Clock, DownloadCloud,
    Undo2, AlertTriangle, UploadCloud, Paperclip, XCircle, User, FastForward, RotateCcw
} from "lucide-react"
import { getDisplayStatus, getNovaLocacaoStage, NOVA_LOCACAO_STAGES } from "@/lib/ticketPhases"
import NovaLocacaoTracker from "@/components/ticket/NovaLocacaoTracker"
import NovaLocacaoStageForm from "@/components/ticket/NovaLocacaoStageForm"
import HistoricoEstagiosTimeline from "@/components/ticket/HistoricoEstagiosTimeline"

export default function TicketDetails() {
  const params = useParams()
  const router = useRouter()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserName, setCurrentUserName] = useState("Usuário")
  const [userRole, setUserRole] = useState("")
  const [userDepartmentName, setUserDepartmentName] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)
  const [resolutionData, setResolutionData] = useState({ valor: '', oc: '', previsao: '' })
  const [arquivoBaixa, setArquivoBaixa] = useState<File | null>(null)

  const [modalItemReturnOpen, setModalItemReturnOpen] = useState(false)
  const [itemReturnReason, setItemReturnReason] = useState("")

  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnReason, setReturnReason] = useState("")

  const [globalResolveModalOpen, setGlobalResolveModalOpen] = useState(false)
  const [arquivoGlobal, setArquivoGlobal] = useState<File | null>(null)
  const [obsGlobal, setObsGlobal] = useState("")
  const [docReferenciaIdx, setDocReferenciaIdx] = useState("")

  const [registroNFModalOpen, setRegistroNFModalOpen] = useState(false)
  const [docNFIdx, setDocNFIdx] = useState("")
  const [obsRegistroNF, setObsRegistroNF] = useState("")

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const nome = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Usuário"
        setCurrentUserName(nome.replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()))

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, department_id')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserRole(profile.role || "")
          if (profile.department_id) {
            const { data: dept } = await supabase
              .from('departments')
              .select('name')
              .eq('id', profile.department_id)
              .single()
            setUserDepartmentName(dept?.name || null)
          }
        }
      }

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

  const podeAgirNaFase = (setorDaFase: string) => userRole === 'admin' || userDepartmentName === setorDaFase

  // --- LÓGICA GENÉRICA DE AVANÇO DE FASE (NOVA LOCAÇÃO - 10 FASES) ---
  async function avancarFase(dadosEstagio: any, chaveEstagio: string | null, anexosEstagio?: Array<{ nome: string; url: string; campo?: string }>, nextFase?: number) {
      if (!ticket) return

      const faseAtual = ticket.custom_data?.fase_atual || 1
      const stageDef = getNovaLocacaoStage(ticket)
      const novaFase = nextFase ?? (faseAtual + 1)

      const novoHistorico = [
          ...(ticket.custom_data?.historico_estagios || []),
          {
              fase: faseAtual,
              label: stageDef.label,
              data: new Date().toISOString(),
              usuario: currentUserName,
              dados: dadosEstagio,
              anexos: anexosEstagio || [],
          }
      ]

      const novoCustomData: any = {
          ...ticket.custom_data,
          fase_atual: Math.min(novaFase, NOVA_LOCACAO_STAGES.length),
          historico_estagios: novoHistorico,
      }

      if (chaveEstagio) {
          novoCustomData[chaveEstagio] = dadosEstagio
      }

      const novoStatus = novaFase > NOVA_LOCACAO_STAGES.length
          ? 'resolvido'
          : (ticket.status === 'aberto' ? 'em_andamento' : ticket.status)

      const { error } = await supabase.from('tickets').update({ custom_data: novoCustomData, status: novoStatus }).eq('id', ticket.id)

      if (!error) {
          setTicket({ ...ticket, custom_data: novoCustomData, status: novoStatus })
          if (novoStatus === 'resolvido') {
              alert("Locação concluída e baixada com sucesso!")
              router.push('/dashboard')
          } else {
              alert("Fase avançada com sucesso!")
          }
      } else {
          alert("Erro ao avançar fase: " + error.message)
      }
  }

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

        const chaveItens = ticket.category === 'Baixa Revenda' ? 'itens_baixa' : 'itens_tabela'
        const novosItens = [...(ticket.custom_data[chaveItens] || [])]
        novosItens[selectedItemIndex] = {
            ...novosItens[selectedItemIndex],
            status: 'concluido',
            resolucao: {
                data_baixa: new Date().toISOString(),
                responsavel: currentUserName,
                ...resolutionData,
                arquivo: dadosArquivo
            }
        }

        const todosProcessados = novosItens.every((item: any) => item.status === 'concluido' || item.status === 'devolvido')
        const todosDevolvidos = novosItens.every((item: any) => item.status === 'devolvido')

        const novoStatusTicket = todosProcessados
            ? (todosDevolvidos ? 'devolvida' : 'resolvido')
            : 'em_andamento'

        const novoCustomData = { ...ticket.custom_data, [chaveItens]: novosItens }

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

  const abrirModalDevolucaoItem = (index: number) => {
      setSelectedItemIndex(index)
      setItemReturnReason("")
      setModalItemReturnOpen(true)
  }

  const confirmarDevolucaoItem = async () => {
      if (selectedItemIndex === null || !ticket) return
      if (!itemReturnReason.trim()) return alert("Informe o motivo da devolução deste item.")

      try {
        const chaveItens = ticket.category === 'Baixa Revenda' ? 'itens_baixa' : 'itens_tabela'
        const novosItens = [...(ticket.custom_data[chaveItens] || [])]
        novosItens[selectedItemIndex] = {
            ...novosItens[selectedItemIndex],
            status: 'devolvido',
            resolucao: {
                data_baixa: new Date().toISOString(),
                motivo_devolucao: itemReturnReason,
                responsavel: currentUserName
            }
        }

        const todosProcessados = novosItens.every((item: any) => item.status === 'concluido' || item.status === 'devolvido')
        const todosDevolvidos = novosItens.every((item: any) => item.status === 'devolvido')

        const novoStatusTicket = todosProcessados
            ? (todosDevolvidos ? 'devolvida' : 'resolvido')
            : 'em_andamento'

        const novoCustomData = { ...ticket.custom_data, [chaveItens]: novosItens }

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

  const handleOpenGlobalResolve = () => {
      setObsGlobal("")
      setArquivoGlobal(null)
      setDocReferenciaIdx("")
      setGlobalResolveModalOpen(true)
  }

  // --- LÓGICA DE AVANÇAR FASE (GESTAO DE CONTRATO -> FATURAMENTO) ---
  const confirmarAvancoFase = async () => {
      try {
          const novoCustomData = {
              ...ticket.custom_data,
              fase_atual: 2,
              responsavel_fase1: currentUserName,
              data_fase1: new Date().toISOString()
          }

          const { error } = await supabase.from('tickets').update({ custom_data: novoCustomData }).eq('id', ticket.id)

          if (!error) {
              setTicket({ ...ticket, custom_data: novoCustomData })
              alert("Gestão de Contratos validada com sucesso! O chamado avançou para a Fase 2 (Faturamento).")
          } else {
              alert("Erro ao avançar fase.")
          }
      } catch (err: any) { alert(err.message) }
  }

  // --- FASE 1 DO REEMBOLSO: registra a NF e avança para em_andamento ---
  async function confirmarRegistroNF() {
    if (docNFIdx === "") return alert("Selecione qual anexo é a Nota Fiscal de referência.")
    const anexosTicket = ticket.custom_data?.anexos || []
    const anexoUnicoTicket = ticket.custom_data?.url_arquivo_anexo
        ? [{ nome: ticket.custom_data.nome_arquivo_anexo || 'Arquivo', url: ticket.custom_data.url_arquivo_anexo }]
        : []
    const listaAnexos = anexosTicket.length > 0 ? anexosTicket : anexoUnicoTicket
    const docNF = listaAnexos[Number(docNFIdx)]
    const novoCustomData = {
        ...ticket.custom_data,
        doc_referencia_nf: docNF,
        fase_atual: 2,
        responsavel_fase1: currentUserName,
        data_fase1: new Date().toISOString(),
        ...(obsRegistroNF ? { obs_fase1: obsRegistroNF } : {})
    }
    const { error } = await supabase.from('tickets').update({ status: 'em_andamento', custom_data: novoCustomData }).eq('id', ticket.id)
    if (!error) {
        setTicket({ ...ticket, status: 'em_andamento', custom_data: novoCustomData })
        setRegistroNFModalOpen(false)
        alert("NF registrada! O chamado avançou para a Fase 2 – Em Processamento.")
    } else {
        alert("Erro ao registrar NF: " + error.message)
    }
  }

  // --- LÓGICA DE CONCLUIR DEFINITIVO (FASE 2 E GERAL) ---
  async function confirmarResolucaoGlobal() {
    // TRAVA DE SEGURANÇA: Obriga o Faturamento a anexar o arquivo na Fase 2
    if (ticket?.category === "Devolução Locação" && !arquivoGlobal) {
        return alert("Erro: É obrigatório anexar o documento/faturamento emitido para concluir o ticket!")
    }

    try {
        let dadosArquivo = null
        if (arquivoGlobal) dadosArquivo = await uploadFile(arquivoGlobal)

        const docReferenciaNf = ticket.category === "Solicitação de Reembolso" && docReferenciaIdx !== ""
            ? listaExibicao[Number(docReferenciaIdx)]
            : undefined

        const novoCustomData = {
            ...ticket.custom_data,
            ...(docReferenciaNf ? { doc_referencia_nf: docReferenciaNf } : {}),
            resolucao_global: {
                data_resolucao: new Date().toISOString(),
                obs: obsGlobal,
                arquivo: dadosArquivo,
                responsavel: currentUserName
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

      const novoCustomData: any = {
        ...ticket.custom_data,
        motivo_devolucao: returnReason,
        responsavel_devolucao: currentUserName
      }

      if (ticket.category === 'Nova Locação') {
          novoCustomData.devolucao_estagio = ticket.custom_data?.fase_atual || 1
          novoCustomData.status_anterior_devolucao = ticket.status
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

  // --- REABERTURA (NOVA LOCAÇÃO): volta o ticket à fase de onde foi devolvido ---
  async function confirmarReabertura() {
      if (!ticket) return

      const novoCustomData = { ...ticket.custom_data }
      delete novoCustomData.motivo_devolucao
      delete novoCustomData.responsavel_devolucao
      const novoStatus = novoCustomData.status_anterior_devolucao || 'em_andamento'
      delete novoCustomData.devolucao_estagio
      delete novoCustomData.status_anterior_devolucao

      const { error } = await supabase.from('tickets').update({ status: novoStatus, custom_data: novoCustomData }).eq('id', ticket.id)

      if (!error) {
          setTicket({ ...ticket, status: novoStatus, custom_data: novoCustomData })
          alert("Chamado reaberto. Edite e avance a fase novamente.")
      } else {
          alert("Erro ao reabrir o chamado.")
      }
  }

  const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  if (loading) return <div className="flex h-screen items-center justify-center animate-pulse">Carregando...</div>
  if (!ticket) return <div className="p-10 text-center text-red-500 font-bold">Ticket não encontrado.</div>

  const itensTabela = ticket.custom_data?.itens_tabela
  const isBaixaRevenda = ticket.category === "Baixa Revenda"
  const itensBaixa: any[] = ticket.custom_data?.itens_baixa || []
  const anexos = ticket.custom_data?.anexos || []
  const anexoUnico = ticket.custom_data?.url_arquivo_anexo ? [{ nome: ticket.custom_data.nome_arquivo_anexo || 'Arquivo', url: ticket.custom_data.url_arquivo_anexo }] : []
  const listaExibicao = anexos.length > 0 ? anexos : anexoUnico

  const todosItens = isBaixaRevenda ? itensBaixa : (itensTabela || [])
  const pendencias = todosItens.filter((i: any) => i.status !== 'concluido' && i.status !== 'devolvido').length
  const resolucaoGlobal = ticket.custom_data?.resolucao_global

  const isDevolucaoLocacao = ticket.category === "Devolução Locação"
  const isReembolso = ticket.category === "Solicitação de Reembolso"
  const isNovaLocacao = ticket.category === "Nova Locação"
  const faseAtual = ticket.custom_data?.fase_atual || 1

  const devolucaoEstagio = ticket.custom_data?.devolucao_estagio
  const podeReabrirNovaLocacao = isNovaLocacao && ticket.status === 'devolvida' && devolucaoEstagio &&
      podeAgirNaFase(NOVA_LOCACAO_STAGES[devolucaoEstagio - 1]?.setor)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="hover:bg-gray-100">← Voltar</Button>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
            <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">Ticket #{ticket.id}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${getDisplayStatus(ticket).colorClass}`}>
                    {getDisplayStatus(ticket).label}
                </span>
            </div>
            <p className="text-gray-500 mt-1 text-lg">{ticket.title}</p>
        </div>
      </div>

      {/* PAINEL VISUAL DE PROGRESSO (NOVA LOCAÇÃO) */}
      {isNovaLocacao && <NovaLocacaoTracker ticket={ticket} />}

      {/* BANNER DE FASE (DEVOLUÇÃO LOCAÇÃO) */}
      {isDevolucaoLocacao && ticket.status !== 'resolvido' && ticket.status !== 'devolvida' && (
          <div className={`p-4 rounded shadow-sm border-l-4 ${faseAtual === 1 ? 'bg-amber-50 border-amber-500' : 'bg-blue-50 border-blue-500'}`}>
              <div className="flex items-start gap-3">
                  <FastForward className={faseAtual === 1 ? 'text-amber-600' : 'text-blue-600'} />
                  <div>
                      <h3 className={`font-bold ${faseAtual === 1 ? 'text-amber-800' : 'text-blue-800'}`}>
                          Fase Atual: {getDisplayStatus(ticket).label}
                      </h3>
                      <p className={`text-sm mt-1 ${faseAtual === 1 ? 'text-amber-900' : 'text-blue-900'}`}>
                          {faseAtual === 1 ? 'O setor de Contratos precisa validar as informações antes de liberar para o faturamento.' : 'Contrato validado! O setor de Faturamento deve anexar o documento fiscal para concluir.'}
                      </p>
                      {faseAtual === 2 && ticket.custom_data?.responsavel_fase1 && (
                          <p className="text-xs text-blue-700 mt-2 font-semibold">
                              ✓ Fase 1 validada e liberada por: {ticket.custom_data.responsavel_fase1}
                          </p>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* BANNER FASE 1 (REEMBOLSO: Aguardando entrada NF) */}
      {isReembolso && ticket.status === 'aberto' && (
          <div className="p-4 rounded shadow-sm border-l-4 bg-amber-50 border-amber-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                      <FastForward className="text-amber-600 mt-1 shrink-0" />
                      <div>
                          <h3 className="font-bold text-amber-800">Fase 1 — Aguardando Entrada de NF</h3>
                          <p className="text-sm mt-1 text-amber-900">
                              Identifique nos anexos qual documento é a Nota Fiscal de referência e registre para avançar para a Fase 2.
                          </p>
                      </div>
                  </div>
                  {podeAgirNaFase('Financeiro') && (
                      <Button
                          onClick={() => { setDocNFIdx(""); setObsRegistroNF(""); setRegistroNFModalOpen(true) }}
                          className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-bold shrink-0"
                      >
                          <CheckCircle2 size={16} /> Registrar NF Recebida
                      </Button>
                  )}
              </div>
          </div>
      )}

      {/* BANNER FASE 2 (REEMBOLSO: NF Registrada – Em Processamento) */}
      {isReembolso && ticket.status === 'em_andamento' && (
          <div className="p-4 rounded shadow-sm border-l-4 bg-indigo-50 border-indigo-500">
              <div className="flex items-start gap-3">
                  <FastForward className="text-indigo-600 mt-1 shrink-0" />
                  <div>
                      <h3 className="font-bold text-indigo-800">Fase 2 — NF Registrada, Em Processamento</h3>
                      {ticket.custom_data?.doc_referencia_nf && (
                          <p className="text-sm mt-1 text-indigo-900 flex items-center gap-1">
                              <Paperclip size={14}/> NF de referência: <a href={ticket.custom_data.doc_referencia_nf.url} target="_blank" rel="noopener noreferrer" className="underline font-semibold">{ticket.custom_data.doc_referencia_nf.nome}</a>
                          </p>
                      )}
                      {ticket.custom_data?.responsavel_fase1 && (
                          <p className="text-xs text-indigo-700 mt-1 font-semibold">
                              ✓ Fase 1 registrada por: {ticket.custom_data.responsavel_fase1}
                              {ticket.custom_data?.obs_fase1 && ` — "${ticket.custom_data.obs_fase1}"`}
                          </p>
                      )}
                      <p className="text-sm mt-2 text-indigo-900">Conclua o processamento do reembolso pelo botão abaixo.</p>
                  </div>
              </div>
          </div>
      )}

      {ticket.status === 'devolvida' && ticket.custom_data?.motivo_devolucao && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                      <AlertTriangle className="text-orange-600 mt-1" />
                      <div>
                          <h3 className="font-bold text-orange-800">Solicitação Devolvida (Global)</h3>
                          <p className="text-orange-900 mt-1 font-medium">Motivo: "{ticket.custom_data.motivo_devolucao}"</p>
                          {ticket.custom_data.responsavel_devolucao && (
                              <p className="text-orange-700 text-xs mt-2 flex items-center gap-1 font-semibold">
                                 <User size={14}/> Devolvido por: {ticket.custom_data.responsavel_devolucao}
                              </p>
                          )}
                      </div>
                  </div>
                  {podeReabrirNovaLocacao && (
                      <Button onClick={confirmarReabertura} className="bg-orange-600 hover:bg-orange-700 text-white gap-2 font-bold shrink-0">
                          <RotateCcw size={16} /> Reabrir e Editar
                      </Button>
                  )}
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
                      {resolucaoGlobal.responsavel && (
                          <p className="text-green-700 text-xs mt-2 flex items-center gap-1 font-semibold">
                             <User size={14}/> Finalizado por: {resolucaoGlobal.responsavel}
                          </p>
                      )}
                      {ticket.custom_data?.doc_referencia_nf && (
                          <a href={ticket.custom_data.doc_referencia_nf.url} target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-1 text-green-700 text-xs mt-1 font-semibold underline w-fit">
                             <Paperclip size={14}/> Documento de referência (NF): {ticket.custom_data.doc_referencia_nf.nome}
                          </a>
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

      {/* AÇÃO DA FASE ATUAL (NOVA LOCAÇÃO) */}
      {isNovaLocacao && ticket.status !== 'resolvido' && ticket.status !== 'devolvida' && (
          <NovaLocacaoStageForm
              key={faseAtual}
              ticket={ticket}
              uploadFile={uploadFile}
              podeAgir={podeAgirNaFase(getNovaLocacaoStage(ticket).setor)}
              onAvancar={avancarFase}
          />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 space-y-6">

            {ticket.status !== 'resolvido' && ticket.status !== 'devolvida' && todosItens.length > 0 && (
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

                    {isBaixaRevenda && itensBaixa.length > 0 && (
                        <div className="border rounded overflow-hidden">
                            <div className="bg-rose-50 p-3 text-xs font-bold text-rose-800 border-b grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-2">Código</div>
                                <div className="col-span-1 text-center">Qtd</div>
                                <div className="col-span-3">Requisição</div>
                                <div className="col-span-2">Data Req.</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2 text-center">Ação</div>
                            </div>
                            {itensBaixa.map((item: any, idx: number) => {
                                const isDone = item.status === 'concluido'
                                const isReturned = item.status === 'devolvido'
                                return (
                                    <div key={idx} className={`p-3 text-sm border-b grid grid-cols-12 gap-4 items-center ${isDone ? 'bg-green-50/50' : isReturned ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}>
                                        <div className="col-span-2 font-semibold text-gray-800">{item.codigo || '-'}</div>
                                        <div className="col-span-1 text-center font-bold bg-gray-100 rounded p-1">{item.quantidade || '-'}</div>
                                        <div className="col-span-3 text-gray-700">{item.requisicao || '-'}</div>
                                        <div className="col-span-2 text-xs text-gray-500">
                                            {item.data_requisicao ? new Date(item.data_requisicao + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                        </div>
                                        <div className="col-span-2 text-xs">
                                            {isDone && (
                                                <div className="text-green-700">
                                                    <span className="flex items-center gap-1 font-bold"><CheckCircle2 size={12}/> Baixado</span>
                                                    {item.resolucao?.responsavel && <span className="block text-[10px] text-green-600 font-bold mt-0.5 uppercase">{item.resolucao.responsavel}</span>}
                                                    {item.resolucao?.valor && <span className="block mt-1 italic">{item.resolucao.valor}</span>}
                                                </div>
                                            )}
                                            {isReturned && (
                                                <div className="text-orange-700">
                                                    <span className="flex items-center gap-1 font-bold"><Undo2 size={12}/> Devolvido</span>
                                                    {item.resolucao?.responsavel && <span className="block text-[10px] text-orange-600 font-bold mt-0.5 uppercase">{item.resolucao.responsavel}</span>}
                                                    <span className="block mt-1 italic">"{item.resolucao?.motivo_devolucao}"</span>
                                                </div>
                                            )}
                                            {!isDone && !isReturned && (
                                                <span className="flex items-center gap-1 text-orange-500 font-bold"><Clock size={12}/> Pendente</span>
                                            )}
                                        </div>
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

                    {!isBaixaRevenda && itensTabela && Array.isArray(itensTabela) && itensTabela.length > 0 && (
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
                                        
                                        <div className="col-span-2 text-xs">
                                            {isDone && (
                                                <div className="text-green-700">
                                                    <span className="flex items-center gap-1 font-bold"><CheckCircle2 size={12}/> Concluído</span>
                                                    {item.resolucao?.responsavel && <span className="block text-[10px] text-green-600 font-bold mt-0.5 uppercase tracking-wide">por {item.resolucao.responsavel}</span>}
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
                                                    {item.resolucao?.responsavel && <span className="block text-[10px] text-orange-600 font-bold mt-0.5 uppercase tracking-wide">por {item.resolucao.responsavel}</span>}
                                                    <span className="block mt-1 italic">"{item.resolucao?.motivo_devolucao}"</span>
                                                </div>
                                            )}
                                            {!isDone && !isReturned && (
                                                <span className="flex items-center gap-1 text-orange-500 font-bold"><Clock size={12}/> Pendente</span>
                                            )}
                                        </div>

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
                                if (['description', 'prioridade', 'itens_tabela', 'itens_baixa', 'nome_arquivo_anexo', 'url_arquivo_anexo', 'motivo_devolucao', 'resolucao_global', 'responsavel_devolucao', 'anexos', 'fase_atual', 'responsavel_fase1', 'data_fase1', 'pats', 'doc_referencia_nf', 'historico_estagios', 'documentos_estagio1', 'devolucao_estagio', 'status_anterior_devolucao'].includes(key)) return null
                                if (!value || typeof value === 'object') return null
                                return (
                                    <div key={key} className="bg-white p-3 rounded border shadow-sm max-h-60 overflow-y-auto">
                                        <span className="block text-[10px] font-bold text-gray-400 uppercase">{formatKey(key)}</span>
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

                    {isNovaLocacao && ticket.custom_data?.documentos_estagio1 && (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-amber-200 p-2 rounded text-amber-700"><Paperclip size={20}/></div>
                                <p className="text-sm font-bold text-amber-800 uppercase">Documentos do Estágio 1 (Comercial)</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.entries(ticket.custom_data.documentos_estagio1).map(([key, doc]: [string, any]) => doc && (
                                    <div key={key} className="flex items-center justify-between bg-white p-2 rounded border border-amber-100 shadow-sm">
                                        <span className="text-sm text-gray-600 truncate max-w-[200px]">{doc.nome}</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-amber-700 border-amber-200 hover:bg-amber-50 h-8"
                                            onClick={() => window.open(doc.url, '_blank')}
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
                        
                        {todosItens.length === 0 && !isNovaLocacao && (
                            isDevolucaoLocacao ? (
                                faseAtual === 1 ? (
                                    <Button onClick={confirmarAvancoFase} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-bold shadow-md">
                                        <CheckCircle2 size={16} /> Validar Gestão de Contrato (Avançar para Fase 2)
                                    </Button>
                                ) : (
                                    <Button onClick={handleOpenGlobalResolve} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold shadow-md">
                                        <UploadCloud size={16} /> Anexar Documento e Concluir Devolução
                                    </Button>
                                )
                            ) : isReembolso ? (
                                ticket.status === 'em_andamento' && podeAgirNaFase('Financeiro') ? (
                                    <Button onClick={handleOpenGlobalResolve} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold">
                                        <CheckCircle2 size={16} /> Concluir Reembolso
                                    </Button>
                                ) : null
                            ) : (
                                <Button onClick={handleOpenGlobalResolve} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                                    <CheckCircle2 size={16} /> Resolver Solicitação
                                </Button>
                            )
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* HISTÓRICO DO PROCESSO (NOVA LOCAÇÃO) */}
      {isNovaLocacao && <HistoricoEstagiosTimeline historico={ticket.custom_data?.historico_estagios} />}

      {/* MODAL 1: BAIXA DE ITEM */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle>Baixar Item</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                {ticket?.category === 'Cotação' ? (
                    <div><Label>Preço Fechado</Label><Input value={resolutionData.valor} onChange={e => setResolutionData({...resolutionData, valor: e.target.value})} /></div>
                ) : ticket?.category === 'Compras' ? (
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

      {/* MODAL 2: DEVOLUÇÃO DE ITEM */}
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

      {/* MODAL 3: RESOLUÇÃO GLOBAL / FASE 2 */}
      <Dialog open={globalResolveModalOpen} onOpenChange={setGlobalResolveModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    {isDevolucaoLocacao ? "Fase 2: Faturamento - Lançar Documento"
                    : isReembolso ? "Fase 2: Concluir Reembolso"
                    : "Finalizar Solicitação"}
                </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                {isReembolso && ticket?.custom_data?.doc_referencia_nf && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-sm text-indigo-800 flex items-center gap-2">
                        <Paperclip size={14}/> NF de referência registrada na Fase 1: <span className="font-bold">{ticket.custom_data.doc_referencia_nf.nome}</span>
                    </div>
                )}
                <div><Label>Observações</Label><Textarea value={obsGlobal} onChange={e => setObsGlobal(e.target.value)} /></div>
                <div className="border-t pt-4 mt-2">
                    <Label className="flex items-center gap-2 mb-2 text-green-800 font-bold text-xs uppercase">
                        <UploadCloud size={14}/> Anexar Arquivo Final {isDevolucaoLocacao && "*"}
                    </Label>
                    <Input type="file" onChange={e => setArquivoGlobal(e.target.files?.[0] || null)} />
                    {isDevolucaoLocacao && <p className="text-[11px] text-red-500 font-bold mt-1">* O anexo do documento/faturamento é obrigatório para concluir o chamado.</p>}
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setGlobalResolveModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarResolucaoGlobal} className="bg-green-600 text-white hover:bg-green-700">Concluir</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: REGISTRO DE NF (FASE 1 REEMBOLSO) */}
      <Dialog open={registroNFModalOpen} onOpenChange={setRegistroNFModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="text-amber-700 flex items-center gap-2">
                    <Paperclip size={18}/> Registrar Nota Fiscal de Referência
                </DialogTitle>
                <DialogDescription>Selecione qual dos anexos é a NF deste reembolso. O chamado avançará para a Fase 2.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <Label className="mb-2 block font-bold text-amber-800 text-xs uppercase">Qual anexo é a NF de referência? *</Label>
                    <Select value={docNFIdx} onValueChange={setDocNFIdx}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione o anexo correspondente à NF" />
                        </SelectTrigger>
                        <SelectContent>
                            {listaExibicao.map((anexo: any, idx: number) => (
                                <SelectItem key={idx} value={String(idx)}>{anexo.nome}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {listaExibicao.length === 0 && (
                        <p className="text-[11px] text-red-500 font-bold mt-1">Nenhum anexo encontrado neste chamado. O solicitante deve ter anexado o documento na abertura.</p>
                    )}
                </div>
                <div>
                    <Label>Observações (opcional)</Label>
                    <Textarea value={obsRegistroNF} onChange={e => setObsRegistroNF(e.target.value)} placeholder="Ex: NF conferida, valor conforme solicitação..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setRegistroNFModalOpen(false)}>Cancelar</Button>
                <Button onClick={confirmarRegistroNF} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    <CheckCircle2 size={16} className="mr-1"/> Registrar NF e Avançar
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: DEVOLUÇÃO GLOBAL */}
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