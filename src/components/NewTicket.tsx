'use client'
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Trash2, Plus, UploadCloud, X } from "lucide-react"

export function NewTicket() {
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [category, setCategory] = useState("Geral")
  const [requesterName, setRequesterName] = useState("") 
  const [title, setTitle] = useState("") 
  
  // ATENÇÃO AQUI: Iniciamos o formulário já com espaço para o primeiro PAT
  const [formData, setFormData] = useState<any>({ prioridade: 'media', pats: [''] })
  
  const [items, setItems] = useState([
    { codigo: '', descricao: '', qtd: 1, pat: '', aplicacao: '' }
  ])
  
  const [arquivosParaUpload, setArquivosParaUpload] = useState<File[]>([])

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const nomeSalvo = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]
        if (nomeSalvo) {
            const nomeFormatado = nomeSalvo
                .replace(/[._]/g, ' ') 
                .replace(/\b\w/g, (l: string) => l.toUpperCase())
            
            setRequesterName(nomeFormatado)
        }
      }
    }

    if (open) {
        fetchUser()
        const setorAtual = searchParams.get('sector')
        if (setorAtual) {
            setCategory(setorAtual)
        } else {
            setCategory("Geral")
        }

        // Garante que toda vez que abrir a tela, o PAT esteja vazio e pronto para uso
        setFormData({ prioridade: 'media', pats: [''] })
        setItems([{ codigo: '', descricao: '', qtd: 1, pat: '', aplicacao: '' }])
        setTitle("")
        setArquivosParaUpload([]) 
    }
  }, [open, searchParams]) 

  const updateForm = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]; 
    // @ts-ignore
    newItems[index][field] = value; 
    setItems(newItems)
  }
  const addItem = () => setItems([...items, { codigo: '', descricao: '', qtd: 1, pat: '', aplicacao: '' }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  const sanitizeFileName = (name: string) => {
    return name
      .normalize("NFD") 
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/\s+/g, '_') 
      .replace(/[^a-zA-Z0-9._-]/g, '') 
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          setArquivosParaUpload(prev => [...prev, ...Array.from(e.target.files!)])
      }
  }

  const removeFile = (index: number) => {
      setArquivosParaUpload(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit() {
    if (!requesterName) return alert("Por favor, informe o Nome do Solicitante.")
    if (!formData.prioridade) return alert("Por favor, selecione a Prioridade.")

    // VALIDAÇÃO EXCLUSIVA PARA DEVOLUÇÃO LOCAÇÃO
    if (category === "Devolução Locação") {
        const patsList = formData.pats || []
        const hasValidPat = patsList.some((p: string) => p.trim() !== "")
        
        if (!formData.cliente || !hasValidPat || !formData.data_devolucao || !formData.nf_numero) {
            return alert("Por favor, preencha todos os campos obrigatórios (Cliente, ao menos 1 PAT, Data de Devolução e Nº Nota Fiscal).")
        }
    }

    const categoriasObrigatorias = [
      'Cadastro Fornecedor', 'Cadastro Cliente', 'Solicitação de Pagamento', 
      'Solicitação de Reembolso', 'Divergência', 'Devolução Locação'
    ]
    if (categoriasObrigatorias.includes(category) && arquivosParaUpload.length === 0) {
        return alert(`É obrigatório anexar pelo menos um documento para ${category}.`)
    }

    setLoading(true)

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
         throw new Error("Sessão expirada. Por favor, faça logout e entre novamente.")
      }
      
      const userId = session.user.id
      const listaAnexosSalvos = []

      if (arquivosParaUpload.length > 0) {
          for (const arquivo of arquivosParaUpload) {
              const nomeLimpo = sanitizeFileName(arquivo.name)
              const nomeArquivoUnico = `${Date.now()}-${nomeLimpo}`
              
              const { error: errorUpload } = await supabase.storage.from('anexos').upload(nomeArquivoUnico, arquivo)
              if (errorUpload) throw new Error(`Erro ao enviar ${arquivo.name}: ` + errorUpload.message)
              
              const { data: dataUrl } = supabase.storage.from('anexos').getPublicUrl(nomeArquivoUnico)
              
              listaAnexosSalvos.push({
                  nome: nomeLimpo,
                  url: dataUrl.publicUrl
              })
          }
      }

      let finalTitle = title
      let description = formData.description || ""

      // MONTAGEM DO TICKET DE DEVOLUÇÃO
      if (category === "Devolução Locação") {
        // Junta os PATs que foram digitados com vírgula
        const patString = (formData.pats || []).filter((p: string) => p.trim() !== "").join(', ')
        
        finalTitle = `Devolução Locação: ${formData.cliente} - PAT(s): ${patString}`
        description = `NF Nº: ${formData.nf_numero} | Data Devolução: ${formData.data_devolucao} | Valor Frete: R$ ${formData.valor_frete || '0,00'}`
        
        if (formData.nao_altera_contrato === 'SIM') {
            description += `\n[ATENÇÃO: MARCADO COMO "NÃO ALTERA CONTRATO"]`
        }
        
        description += `\nObs: ${formData.description || '-'}`
        
        // Salva a string formatada para o painel de detalhes ler depois
        formData.pat = patString 
      }
      else if (category === "Nova Locação") {
        finalTitle = `Locação: ${formData.cliente || "Cliente"} - ${formData.equipamento?.substring(0, 15) || ""}...`
      } 
      else if (category === "Cadastro Fornecedor" || category === "Cadastro Cliente") {
        finalTitle = `${category}: ${formData.razao_social || 'Novo Cadastro'}`
        description = `IE: ${formData.ie} | Email: ${formData.email} | Tel: ${formData.telefone}`
      }
      else if (category === "Cadastro Mercadoria") {
        finalTitle = `Cadastro Item: ${formData.descricao_item}`
        description = `Cód: ${formData.codigo} | NCM: ${formData.ncm} | Valor: R$ ${formData.valor_item}`
        if (formData.observacao) description += ` | Obs: ${formData.observacao}`
      }
      else if (category === "Emissão de Documento") {
        finalTitle = `Doc: ${formData.tipo_emissao}`
        description = formData.description || '-'
      }
      else if (category === "Solicitação de Pagamento") {
        finalTitle = `Pagamento: ${formData.beneficiario || 'Diversos'} - R$ ${formData.valor || '0,00'}`
        description = `Vencimento: ${formData.vencimento} | Obs: ${formData.description || '-'}`
      }
      else if (category === "Solicitação de Reembolso") {
        finalTitle = `Reembolso: R$ ${formData.valor || '0,00'}`
        description = `Data Despesa: ${formData.data_despesa} | Motivo: ${formData.description || '-'}`
      }
      else if (category === "Divergência") {
        finalTitle = `Divergência: ${formData.motivo_divergencia || 'Geral'}`
        description = `Fornecedor: ${formData.cnpj_fornecedor} | NF: ${formData.numero_nf} | Pedido: ${formData.pedido_compra} | Detalhes: ${formData.description || '-'}`
      }
      else if (category === "Compra" || category === "Cotação") {
        const primeiro = items[0].descricao || "Itens"
        finalTitle = `${category}: ${primeiro} ${items.length > 1 ? `(+${items.length - 1})` : ''}`
      }

      const { error } = await supabase.from('tickets').insert({
        title: finalTitle || category,
        description: description,
        priority: formData.prioridade,
        category: category,
        status: 'aberto',
        user_id: userId,
        requester_name: requesterName,
        custom_data: {
          ...formData,
          fase_atual: category === "Devolução Locação" ? 1 : undefined,
          itens_tabela: category === "Compra" || category === "Cotação" ? items : null,
          anexos: listaAnexosSalvos,
          nome_arquivo_anexo: listaAnexosSalvos[0]?.nome || "",
          url_arquivo_anexo: listaAnexosSalvos[0]?.url || ""
        },
      })

      if (error) throw error
      
      alert("Solicitação criada com sucesso!")
      setOpen(false)
      window.location.reload()

    } catch (error: any) {
      console.error(error)
      if (error.message && error.message.includes("foreign key constraint")) {
         alert("Erro de permissão: Seu usuário foi criado recentemente. Por favor, SAIA do sistema (Logout) e entre novamente para validar seu cadastro.")
      } else {
         alert("Erro: " + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const renderItemsTable = () => (
    <div className="border rounded-md overflow-hidden bg-white shadow-sm mt-2">
       <div className="grid grid-cols-12 gap-2 bg-gray-100 p-2 text-xs font-bold text-gray-700 border-b">
            <div className="col-span-2">Código</div>
            <div className="col-span-4">Descrição *</div>
            <div className="col-span-1">Qtd</div>
            <div className="col-span-2">PAT</div>
            <div className="col-span-2">Aplicação</div>
            <div className="col-span-1"></div>
        </div>
        <div className="max-h-60 overflow-y-auto">
            {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 p-2 border-b items-center hover:bg-gray-50">
                    <div className="col-span-2"><Input className="h-8 text-xs" value={item.codigo} onChange={e => updateItem(index, 'codigo', e.target.value)} /></div>
                    <div className="col-span-4"><Input className="h-8 text-xs" value={item.descricao} onChange={e => updateItem(index, 'descricao', e.target.value)} /></div>
                    <div className="col-span-1"><Input className="h-8 text-xs" type="number" value={item.qtd} onChange={e => updateItem(index, 'qtd', e.target.value)} /></div>
                    <div className="col-span-2"><Input className="h-8 text-xs" value={item.pat} onChange={e => updateItem(index, 'pat', e.target.value)} /></div>
                    <div className="col-span-2"><Input className="h-8 text-xs" value={item.aplicacao} onChange={e => updateItem(index, 'aplicacao', e.target.value)} /></div>
                    <div className="col-span-1 text-center">
                        {items.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="h-8 w-8 text-red-500"><Trash2 size={16}/></Button>}
                    </div>
                </div>
            ))}
        </div>
        <div className="p-2 bg-gray-50 border-t"><Button variant="outline" size="sm" onClick={addItem} className="w-full text-xs"><Plus size={14} className="mr-2"/> Adicionar Item</Button></div>
    </div>
  )

  const renderFields = () => {
    switch (category) {
      case "Devolução Locação":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-amber-50/60 border-amber-200">
                <h3 className="font-bold text-sm text-amber-900">Dados da Devolução de Locação</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div><Label className="font-bold">Cliente *</Label><Input className="bg-white" placeholder="Nome do cliente" onChange={e => updateForm('cliente', e.target.value)} /></div>
                    <div><Label className="font-bold">Data de Devolução *</Label><Input className="bg-white" type="date" onChange={e => updateForm('data_devolucao', e.target.value)} /></div>
                    <div><Label className="font-bold">Nº Nota Fiscal *</Label><Input className="bg-white" placeholder="Número da NF" onChange={e => updateForm('nf_numero', e.target.value)} /></div>
                    <div><Label className="font-bold">Valor do Frete (R$)</Label><Input className="bg-white" type="number" step="0.01" placeholder="0,00 (Se houver)" onChange={e => updateForm('valor_frete', e.target.value)} /></div>
                </div>

                {/* --- AQUI ESTÁ A MÁGICA DOS PATS DINÂMICOS --- */}
                <div className="bg-white p-3 rounded border border-amber-200 shadow-sm mt-1">
                    <Label className="font-bold block mb-2 text-amber-900">Equipamentos (PATs) *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {(formData.pats || ['']).map((patValue: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1">
                                <Input 
                                    className="bg-gray-50 h-8 text-sm font-semibold uppercase" 
                                    placeholder="Ex: 0123" 
                                    value={patValue} 
                                    onChange={e => {
                                        const newPats = [...(formData.pats || [''])]
                                        newPats[idx] = e.target.value
                                        updateForm('pats', newPats)
                                    }} 
                                />
                                {idx === 0 ? (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="h-8 w-8 p-0 shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100" 
                                        onClick={() => updateForm('pats', [...(formData.pats || ['']), ''])}
                                        title="Adicionar mais um PAT"
                                    >
                                        <Plus size={16} />
                                    </Button>
                                ) : (
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="h-8 w-8 p-0 shrink-0 border-red-200 text-red-500 hover:bg-red-50" 
                                        onClick={() => {
                                            const newPats = [...formData.pats]
                                            newPats.splice(idx, 1)
                                            updateForm('pats', newPats)
                                        }}
                                        title="Remover este PAT"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* CHECKBOX DE NÃO ALTERA CONTRATO */}
                <div className="flex items-center space-x-3 bg-white p-3 rounded border border-amber-300 mt-1">
                    <input 
                        type="checkbox" 
                        id="nao_altera_contrato" 
                        className="h-5 w-5 accent-amber-600 cursor-pointer" 
                        onChange={e => updateForm('nao_altera_contrato', e.target.checked ? 'SIM' : 'NÃO')} 
                    />
                    <label htmlFor="nao_altera_contrato" className="text-sm font-extrabold text-amber-900 cursor-pointer select-none">
                        NÃO ALTERA CONTRATO
                    </label>
                </div>

                <div><Label className="font-bold">Observações</Label><Textarea className="bg-white" placeholder="Detalhes ou observações sobre a devolução..." onChange={e => updateForm('description', e.target.value)} /></div>
            </div>
        )
      case "Nova Locação":
        return (
          <div className="grid gap-3 border p-4 rounded-md bg-gray-50">
             <div className="grid grid-cols-2 gap-2">
                <div><Label>Cliente</Label><Input onChange={e => updateForm('cliente', e.target.value)} /></div>
                <div><Label>CNPJ</Label><Input onChange={e => updateForm('cnpj', e.target.value)} /></div>
            </div>
            <div><Label>Equipamentos</Label><Textarea onChange={e => updateForm('equipamento', e.target.value)} /></div>
            <div><Label>Local de Entrega</Label><Input onChange={e => updateForm('local', e.target.value)} /></div>
          </div>
        )
      case "Compra":
      case "Cotação":
        return (
            <div className="grid gap-2">
                <Label className="text-base font-bold">Lista de Itens ({category})</Label>
                {renderItemsTable()}
                <div className="mt-2"><Label>Obs. Gerais</Label><Textarea onChange={e => updateForm('description', e.target.value)} /></div>
            </div>
        )
      case "Solicitação de Pagamento":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-emerald-50">
                <h3 className="font-bold text-sm text-emerald-900">Dados do Pagamento</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>Beneficiário / Empresa</Label><Input onChange={e => updateForm('beneficiario', e.target.value)} placeholder="Quem vai receber?" /></div>
                    <div><Label>Valor Total (R$)</Label><Input type="number" step="0.01" onChange={e => updateForm('valor', e.target.value)} placeholder="0,00" /></div>
                    <div><Label>Data Vencimento</Label><Input type="date" onChange={e => updateForm('vencimento', e.target.value)} /></div>
                </div>
                <div><Label>Observações / Dados Bancários</Label><Textarea onChange={e => updateForm('description', e.target.value)} placeholder="PIX, conta ou detalhes..." /></div>
            </div>
        )
      case "Solicitação de Reembolso":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-indigo-50">
                <h3 className="font-bold text-sm text-indigo-900">Dados do Reembolso</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor a Reembolsar (R$)</Label><Input type="number" step="0.01" onChange={e => updateForm('valor', e.target.value)} placeholder="0,00" /></div>
                    <div><Label>Data da Despesa</Label><Input type="date" onChange={e => updateForm('data_despesa', e.target.value)} /></div>
                </div>
                <div><Label>Motivo / Justificativa</Label><Textarea onChange={e => updateForm('description', e.target.value)} placeholder="Almoço com cliente, Combustível, etc..." /></div>
            </div>
        )
      case "Divergência":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-orange-50">
                <h3 className="font-bold text-sm text-orange-900">Recebimento / Devolução</h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label>CNPJ Fornecedor</Label><Input onChange={e => updateForm('cnpj_fornecedor', e.target.value)} /></div>
                    <div><Label>Nº Nota Fiscal</Label><Input onChange={e => updateForm('numero_nf', e.target.value)} /></div>
                    <div><Label>Nº Pedido Compra</Label><Input onChange={e => updateForm('pedido_compra', e.target.value)} /></div>
                </div>
                
                <div className="mt-2">
                    <Label className="mb-1 block">Motivo</Label>
                    <Select onValueChange={val => updateForm('motivo_divergencia', val)}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="S/ Pedido Compra">S/ Pedido Compra</SelectItem>
                            <SelectItem value="Itens c/ diverg. Fisica">Itens c/ diverg. Física</SelectItem>
                            <SelectItem value="CNPJ Incorreto">CNPJ Incorreto</SelectItem>
                            <SelectItem value="NF Incompleta">NF Incompleta</SelectItem>
                            <SelectItem value="S/ NF">S/ NF</SelectItem>
                            <SelectItem value="Falha Mecanica">Falha Mecânica</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                            <SelectItem value="Devolucao">Devolução</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label>Detalhamento do Motivo</Label>
                    <Textarea 
                        placeholder="Explique melhor a situação..." 
                        onChange={e => updateForm('description', e.target.value)} 
                    />
                </div>
            </div>
        )
      case "Cadastro Fornecedor":
      case "Cadastro Cliente":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-blue-50">
                <h3 className="font-bold text-sm text-blue-900">Dados Cadastrais</h3>
                {category === "Cadastro Cliente" && (
                    <div className="bg-yellow-100 p-2 text-xs text-yellow-800 rounded border border-yellow-200 font-semibold">
                        ⚠️ Observação: Solicitação para análise de crédito e cadastro.
                    </div>
                )}
                <div className="grid gap-2"><Label>Razão Social / Nome</Label><Input onChange={e => updateForm('razao_social', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                    <div><Label>Inscrição Estadual</Label><Input onChange={e => updateForm('ie', e.target.value)} /></div>
                    <div><Label>Telefone</Label><Input onChange={e => updateForm('telefone', e.target.value)} /></div>
                </div>
                <div><Label>E-mail (Financeiro/Comercial)</Label><Input type="email" onChange={e => updateForm('email', e.target.value)} /></div>
            </div>
        )
      case "Cadastro Mercadoria":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-purple-50">
                <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1"><Label>Código</Label><Input onChange={e => updateForm('codigo', e.target.value)} /></div>
                    <div className="col-span-2"><Label>Descrição (Catálogo)</Label><Input onChange={e => updateForm('descricao_item', e.target.value)} /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div><Label>NCM</Label><Input onChange={e => updateForm('ncm', e.target.value)} placeholder="0000.00.00" /></div>
                    <div><Label>Valor do Item (R$)</Label><Input type="number" step="0.01" onChange={e => updateForm('valor_item', e.target.value)} placeholder="0,00" /></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div><Label>Medidas</Label><Input onChange={e => updateForm('medidas', e.target.value)} /></div>
                    <div><Label>Aplicação</Label><Input onChange={e => updateForm('aplicacao', e.target.value)} /></div>
                </div>
                <div className="mt-2">
                    <Label>Alocação (Destino)</Label>
                    <Select onValueChange={val => updateForm('alocacao', val)}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Revenda">Revenda (Itens a Revender)</SelectItem>
                            <SelectItem value="Frota">Frota (Maq/Bat/Carreg)</SelectItem>
                            <SelectItem value="Almoxarifado">Almoxarifado (Peças/Insumos)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-[10px] text-gray-500 mt-1">
                        * Revenda: Venda externa. Frota: Uso interno. Almox: Estoque de manutenção.
                    </p>
                </div>
                <div className="mt-2 border-t border-purple-100 pt-2">
                    <Label>Observação</Label>
                    <Textarea onChange={e => updateForm('observacao', e.target.value)} placeholder="Detalhes ou observações sobre a mercadoria..." />
                </div>
            </div>
        )
      case "Emissão de Documento":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-green-50">
                <Label>Tipo de Emissão</Label>
                <div className="grid gap-2">
                     {["Remessa Conserto", "Remessa Locação", "Fatur. Serviço", "Fatur. Peças", "Mau Uso"].map((tipo) => (
                        <div key={tipo} className="flex items-center space-x-2 bg-white p-2 rounded border hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="tipo_doc" id={tipo} value={tipo} onChange={(e) => updateForm('tipo_emissao', e.target.value)} className="h-4 w-4 accent-black cursor-pointer" />
                            <label htmlFor={tipo} className="text-sm font-medium leading-none cursor-pointer w-full">{tipo}</label>
                        </div>
                     ))}
                </div>
                <div className="mt-2"><Label>Observações Adicionais</Label><Textarea placeholder="Detalhes para a emissão..." onChange={e => updateForm('description', e.target.value)} /></div>
            </div>
        )
      default: return <div className="grid gap-3"><Label>Assunto</Label><Input value={title} onChange={e => setTitle(e.target.value)} /><Label>Descrição</Label><Textarea onChange={e => updateForm('description', e.target.value)} /></div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#F3C843] text-black hover:bg-[#d4ac33] font-bold">+ Nova Solicitação</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Solicitação</DialogTitle></DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="bg-slate-100 p-3 rounded border">
            <Label className="font-bold text-gray-700">Nome do Solicitante *</Label>
            <Input value={requesterName} onChange={e => setRequesterName(e.target.value)} placeholder="Carregando..." className="bg-white mt-1" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>Tipo de Solicitação</Label>
                <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-gray-400 font-bold"><SelectValue placeholder="..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Geral">Geral</SelectItem>
                        <SelectItem value="Nova Locação">Nova Locação</SelectItem>
                        <SelectItem value="Devolução Locação">Devolução Locação</SelectItem>
                        <SelectItem value="Compra">Compra</SelectItem>
                        <SelectItem value="Cotação">Cotação</SelectItem>
                        <SelectItem value="Solicitação de Pagamento">Solicitação de Pagamento</SelectItem>
                        <SelectItem value="Solicitação de Reembolso">Solicitação de Reembolso</SelectItem>
                        <SelectItem value="Divergência">Divergência / Devolução</SelectItem>
                        <SelectItem value="Cadastro Mercadoria">Cadastro Mercadoria</SelectItem>
                        <SelectItem value="Cadastro Cliente">Cadastro Cliente</SelectItem>
                        <SelectItem value="Cadastro Fornecedor">Cadastro Fornecedor</SelectItem>
                        <SelectItem value="Emissão de Documento">Emissão de Documento</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label className="text-red-600 font-bold">Prioridade *</Label>
                <Select onValueChange={val => updateForm('prioridade', val)} defaultValue="media">
                    <SelectTrigger className="border-red-200 bg-red-50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="media">Normal</SelectItem>
                        <SelectItem value="alta">Urgente</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          {renderFields()}

          <div className="border-t pt-4 mt-2 bg-gray-50 p-3 rounded border-dashed border border-gray-300">
            {category === "Devolução Locação" && <div className="bg-amber-100 p-2 text-[11px] text-amber-800 rounded mb-2 border border-amber-200 font-bold">⚠️ Obrigatório: Anexar a Nota Fiscal de Devolução e comprovantes de coleta.</div>}
            {category === "Nova Locação" && <div className="bg-amber-100 p-2 text-[11px] text-amber-800 rounded mb-2 border border-amber-200 font-bold">⚠️ Obrigatório: Cartão CNPJ, Dados Cadastrais, Proposta e docs relevantes.</div>}
            {(category === "Cadastro Cliente" || category === "Cadastro Fornecedor") && <div className="bg-blue-100 p-2 text-[11px] text-blue-800 rounded mb-2 border border-blue-200 font-bold">⚠️ Obrigatório anexar o Cartão CNPJ aqui.</div>}
            {category === "Solicitação de Pagamento" && <div className="bg-emerald-100 p-2 text-[11px] text-emerald-800 rounded mb-2 border border-emerald-200 font-bold">⚠️ Obrigatório anexar o Boleto ou Nota Fiscal.</div>}
            {category === "Solicitação de Reembolso" && <div className="bg-indigo-100 p-2 text-[11px] text-indigo-800 rounded mb-2 border border-indigo-200 font-bold">⚠️ Obrigatório anexar o Comprovante/Recibo.</div>}
            {category === "Emissão de Documento" && <div className="bg-green-100 p-2 text-[11px] text-green-800 rounded mb-2 border border-green-200 font-bold">⚠️ Obrigatório anexar a OV.</div>}
            {category === "Divergência" && <div className="bg-orange-100 p-2 text-[11px] text-orange-800 rounded mb-2 border border-orange-200 font-bold">⚠️ Se possível, anexe foto ou evidência da divergência.</div>}

            <Label className="mb-2 block font-semibold flex items-center gap-2"><UploadCloud size={16}/> Anexar Arquivos <span className="text-xs font-normal text-gray-500">(Segure CTRL para selecionar vários)</span></Label>
            
            <div className="flex gap-2 mb-3">
                <Input type="file" multiple className="cursor-pointer bg-white" onChange={handleFileChange} />
            </div>

            {arquivosParaUpload.length > 0 && (
                <div className="space-y-2">
                    {arquivosParaUpload.map((file, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                            <span className="truncate max-w-[250px]">{file.name}</span>
                            <Button variant="ghost" size="sm" onClick={() => removeFile(idx)} className="h-6 w-6 text-red-500 p-0">
                                <X size={14}/>
                            </Button>
                        </div>
                    ))}
                </div>
            )}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full bg-black text-white hover:bg-gray-800">
          {loading ? "Processando..." : "Confirmar Solicitação"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}