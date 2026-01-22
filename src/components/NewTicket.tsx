'use client'
import { useState, useEffect } from "react"
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
import { Trash2, Plus, UploadCloud } from "lucide-react"

export function NewTicket() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [category, setCategory] = useState("Geral")
  const [requesterName, setRequesterName] = useState("") // Novo: Estado para o solicitante
  const [title, setTitle] = useState("") 
  const [formData, setFormData] = useState<any>({})
  const [items, setItems] = useState([
    { codigo: '', descricao: '', qtd: 1, pat: '', aplicacao: '' }
  ])
  const [arquivoParaUpload, setArquivoParaUpload] = useState<File | null>(null)

  useEffect(() => {
    setFormData({})
    setItems([{ codigo: '', descricao: '', qtd: 1, pat: '', aplicacao: '' }])
    setTitle("")
    setRequesterName("") // Limpa o nome ao trocar categoria ou abrir
    setArquivoParaUpload(null)
  }, [category, open])

  const updateForm = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  // Funções da Tabela
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]; 
    // @ts-ignore
    newItems[index][field] = value; 
    setItems(newItems)
  }
  const addItem = () => setItems([...items, { codigo: '', descricao: '', qtd: 1, pat: '', aplicacao: '' }])
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index))

  async function handleSubmit() {
    // Validação de Campos Obrigatórios
    if (!requesterName) {
        return alert("Por favor, informe o Nome do Solicitante.")
    }
    if (!formData.prioridade) {
        return alert("Por favor, selecione a Urgência (Prioridade) da solicitação.")
    }

    // Validação Específica: Cadastro Fornecedor/Cliente exige CNPJ
    if ((category === 'Cadastro Fornecedor' || category === 'Cadastro Cliente') && !arquivoParaUpload) {
        return alert("O Cartão CNPJ é obrigatório para este cadastro.")
    }

    setLoading(true)

    try {
      // Busca o usuário na hora do clique para garantir a sessão e evitar erro de user_id
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error("Usuário não logado ou sessão expirada.")

      // Upload Arquivo
      let urlArquivo = "", nomeArquivo = ""
      if (arquivoParaUpload) {
        nomeArquivo = arquivoParaUpload.name
        const nomeArquivoUnico = `${Date.now()}-${nomeArquivo}`
        const { error: errorUpload } = await supabase.storage.from('anexos').upload(nomeArquivoUnico, arquivoParaUpload)
        if (errorUpload) throw new Error("Erro upload: " + errorUpload.message)
        const { data: dataUrl } = supabase.storage.from('anexos').getPublicUrl(nomeArquivoUnico)
        urlArquivo = dataUrl.publicUrl
      }

      // Títulos e Descrições Automáticas
      let finalTitle = title
      let description = formData.description || ""

      if (category === "Nova Locação") {
        finalTitle = `Locação: ${formData.cliente || "Cliente"} - ${formData.equipamento?.substring(0, 15) || ""}...`
      } 
      else if (category === "Cadastro Fornecedor" || category === "Cadastro Cliente") {
        finalTitle = `${category}: ${formData.razao_social || 'Novo Cadastro'}`
        description = `CNPJ Anexado. IE: ${formData.ie} | Email: ${formData.email} | Tel: ${formData.telefone}`
      }
      else if (category === "Cadastro Mercadoria") {
        finalTitle = `Cadastro Item: ${formData.descricao_item}`
        description = `Cód: ${formData.codigo} | Medidas: ${formData.medidas} | Aplicação: ${formData.aplicacao} | Alocação: ${formData.alocacao}`
      }
      else if (category === "Emissão de Documento") {
        finalTitle = `Doc: ${formData.tipo_emissao}`
        description = `Solicitação de emissão de: ${formData.tipo_emissao}. \nObs: ${formData.description || '-'}`
      }
      else if (category === "Compra" || category === "Cotação") {
        const primeiro = items[0].descricao || "Itens"
        finalTitle = `${category}: ${primeiro} ${items.length > 1 ? `(+${items.length - 1})` : ''}`
      }

      const customDataPayload = {
        ...formData,
        itens_tabela: items,
        nome_arquivo_anexo: nomeArquivo,
        url_arquivo_anexo: urlArquivo
      }

      const { error } = await supabase.from('tickets').insert({
        title: finalTitle || category,
        description: description,
        priority: formData.prioridade,
        category: category,
        status: 'aberto',
        user_id: user.id,
        requester_name: requesterName, // Adicionado conforme solicitado
        custom_data: customDataPayload,
      })

      if (error) throw error
      alert("Solicitação criada!")
      setOpen(false)
      window.location.reload()

    } catch (error: any) {
      alert("Erro: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- COMPONENTE DE TABELA (Cotação/Compra) ---
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

  // --- RENDERIZAÇÃO DOS CAMPOS ESPECÍFICOS ---
  const renderFields = () => {
    switch (category) {
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

      case "Cadastro Fornecedor":
      case "Cadastro Cliente":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-blue-50">
                <h3 className="font-bold text-sm text-blue-900">Dados Cadastrais</h3>
                
                {category === "Cadastro Cliente" && (
                    <div className="bg-yellow-100 p-2 text-xs text-yellow-800 rounded border border-yellow-200 font-semibold">
                        ⚠️ Observação: Cadastro só pode ser solicitado após análise de crédito aprovada.
                    </div>
                )}

                <div className="grid gap-2">
                    <Label>Razão Social / Nome</Label>
                    <Input onChange={e => updateForm('razao_social', e.target.value)} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    <div><Label>Inscrição Estadual</Label><Input onChange={e => updateForm('ie', e.target.value)} /></div>
                    <div><Label>Telefone</Label><Input onChange={e => updateForm('telefone', e.target.value)} /></div>
                </div>
                <div><Label>E-mail (Financeiro/Comercial)</Label><Input type="email" onChange={e => updateForm('email', e.target.value)} /></div>
                
                <div className="bg-white p-3 border rounded border-dashed border-blue-300 mt-2">
                    <Label className="flex items-center gap-2 text-blue-800"><UploadCloud size={16}/> Anexar Cartão CNPJ (Obrigatório)</Label>
                    <p className="text-[10px] text-gray-500 mb-2">Faça o upload do arquivo PDF ou Imagem do cartão.</p>
                </div>
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
            </div>
        )

      case "Emissão de Documento":
        return (
            <div className="grid gap-3 border p-4 rounded-md bg-green-50">
                <Label>Tipo de Emissão</Label>
                <div className="grid gap-2">
                     {["Remessa Conserto", "Remessa Locação", "Fatur. Serviço", "Fatur. Peças", "Mau Uso"].map((tipo) => (
                        <div key={tipo} className="flex items-center space-x-2 bg-white p-2 rounded border hover:bg-gray-50 cursor-pointer">
                            <input 
                                type="radio" 
                                name="tipo_doc" 
                                id={tipo} 
                                value={tipo}
                                onChange={(e) => updateForm('tipo_emissao', e.target.value)}
                                className="h-4 w-4 accent-black cursor-pointer"
                            />
                            <label htmlFor={tipo} className="text-sm font-medium leading-none cursor-pointer w-full">
                                {tipo}
                            </label>
                        </div>
                     ))}
                </div>
                <div className="mt-2">
                    <Label>Observações Adicionais</Label>
                    <Textarea placeholder="Detalhes para a emissão..." onChange={e => updateForm('description', e.target.value)} />
                </div>
            </div>
        )

      default: return <div className="grid gap-3"><Label>Assunto</Label><Input value={title} onChange={e => setTitle(e.target.value)} /><Label>Descrição</Label><Textarea onChange={e => updateForm('description', e.target.value)} /></div>
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#F3C843] text-black hover:bg-[#d4ac33] font-bold">
          + Nova Solicitação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova Solicitação</DialogTitle></DialogHeader>
        
        <div className="grid gap-4 py-4">
          
          {/* CAMPO NOVO: NOME DO SOLICITANTE */}
          <div className="bg-slate-100 p-3 rounded border">
            <Label className="font-bold text-gray-700">Nome do Solicitante *</Label>
            <Input 
                value={requesterName} 
                onChange={e => setRequesterName(e.target.value)} 
                placeholder="Informe seu nome ou setor"
                className="bg-white mt-1 border-gray-300"
                required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label>Tipo de Solicitação</Label>
                <Select onValueChange={setCategory} defaultValue="Geral">
                    <SelectTrigger className="border-gray-400 font-bold"><SelectValue placeholder="..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Geral">Geral</SelectItem>
                        <SelectItem value="Nova Locação">Nova Locação</SelectItem>
                        <SelectItem value="Compra">Compra</SelectItem>
                        <SelectItem value="Cotação">Cotação</SelectItem>
                        <SelectItem value="Cadastro Mercadoria">Cadastro Mercadoria</SelectItem>
                        <SelectItem value="Cadastro Cliente">Cadastro Cliente</SelectItem>
                        <SelectItem value="Cadastro Fornecedor">Cadastro Fornecedor</SelectItem>
                        <SelectItem value="Emissão de Documento">Emissão de Documento</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label className="text-red-600 font-bold">Urgência *</Label>
                <Select onValueChange={val => updateForm('prioridade', val)}>
                    <SelectTrigger className="border-red-200 bg-red-50"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="media">Normal</SelectItem>
                        <SelectItem value="alta">Urgente</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>

          {renderFields()}

          <div className="border-t pt-4 mt-2 bg-gray-50 p-3 rounded border-dashed border border-gray-300">
            {/* Observação dinâmica para Nova Locação ou Cadastros */}
            {category === "Nova Locação" && (
                <div className="bg-amber-100 p-2 text-xs text-amber-800 rounded mb-3 border border-amber-200 font-bold">
                    ⚠️ Obrigatório: Cartão CNPJ, Dados Cadastrais, Proposta e docs relevantes.
                </div>
            )}

            <Label className="mb-2 block font-semibold flex items-center gap-2"><UploadCloud size={16}/> 
                {category.includes('Cadastro') ? "Anexar Arquivo (CNPJ Obrigatório aqui)" : "Anexar Arquivo (Opcional)"}
            </Label>
            <Input type="file" className="cursor-pointer bg-white" onChange={(e) => { const file = e.target.files?.[0]; if (file) setArquivoParaUpload(file); }} />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full bg-black text-white hover:bg-gray-800">
          {loading ? "Processando..." : "Confirmar Solicitação"}
        </Button>
      </DialogContent>
    </Dialog>
  )
}