'use client'

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Plus, Upload } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"

export function NewTicket() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Estados do Formulário
  const [requesterName, setRequesterName] = useState("") // NOVO CAMPO
  const [category, setCategory] = useState("")
  const [priority, setPriority] = useState("normal")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)

  // Campos específicos de Mercadoria
  const [codigo, setCodigo] = useState("")
  const [medidas, setMedidas] = useState("")
  const [aplicacao, setAplicacao] = useState("")
  const [alocacao, setAlocacao] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        alert("Erro de sessão: Você precisa estar logado para abrir um chamado.")
        setLoading(false)
        return
      }

      let fileUrl = null
      if (file) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('tickets-files')
          .upload(fileName, file)

        if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
                .from('tickets-files')
                .getPublicUrl(fileName)
            fileUrl = publicUrlData.publicUrl
        }
      }

      let finalDescription = description
      if (category === "Cadastro Mercadoria") {
        finalDescription = `Código: ${codigo}\nMedidas: ${medidas}\nAplicação: ${aplicacao}\nAlocação: ${alocacao}\n\nDescrição: ${description}`
      }

      const { error } = await supabase
        .from('tickets')
        .insert({
          title: title || category,
          description: finalDescription,
          category,
          priority,
          status: 'aberto',
          user_id: user.id,
          requester_name: requesterName, // SALVANDO NOVO CAMPO
          attachment_url: fileUrl
        })

      if (error) throw error

      setOpen(false)
      resetForm()
      router.refresh()
      alert("Solicitação criada com sucesso!")

    } catch (error: any) {
      console.error(error)
      alert("Erro ao criar solicitação: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setRequesterName("") // LIMPAR NOVO CAMPO
    setTitle("")
    setDescription("")
    setCategory("")
    setPriority("normal")
    setFile(null)
    setCodigo("")
    setMedidas("")
    setAplicacao("")
    setAlocacao("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-500 font-bold">
          <Plus className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          
          {/* NOVO CAMPO: SOLICITANTE */}
          <div className="space-y-2 bg-yellow-50 p-3 rounded border border-yellow-200">
            <label className="text-sm font-bold text-gray-700">Nome do Solicitante *</label>
            <Input 
                value={requesterName} 
                onChange={(e) => setRequesterName(e.target.value)} 
                placeholder="Quem está pedindo? (Ex: Seu nome ou Setor)" 
                required 
                className="bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Solicitação</label>
              <Select onValueChange={setCategory} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cadastro Mercadoria">Cadastro Mercadoria</SelectItem>
                  <SelectItem value="Nova Locação">Nova Locação</SelectItem>
                  <SelectItem value="Cadastro Cliente">Cadastro Cliente</SelectItem>
                  <SelectItem value="Cadastro Fornecedor">Cadastro Fornecedor</SelectItem>
                  <SelectItem value="Emissão de Documento">Emissão de Documento</SelectItem>
                  <SelectItem value="Outros">Outros / TI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-red-600">Prioridade *</label>
              <Select onValueChange={setPriority} defaultValue="normal">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica (Urgente)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CAMPOS ESPECÍFICOS DE MERCADORIA */}
          {category === "Cadastro Mercadoria" && (
            <div className="bg-gray-50 p-4 rounded-md space-y-3 border border-gray-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500">Código</label>
                  <Input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex: 444" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Descrição (Catálogo)</label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: 14411" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500">Medidas</label>
                  <Input value={medidas} onChange={e => setMedidas(e.target.value)} placeholder="Ex: 20x1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500">Aplicação</label>
                  <Input value={aplicacao} onChange={e => setAplicacao(e.target.value)} placeholder="Ex: EGV" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500">Alocação (Destino)</label>
                <Select onValueChange={setAlocacao}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Revenda">Revenda (Itens a Revender)</SelectItem>
                    <SelectItem value="Frota">Frota (Uso interno)</SelectItem>
                    <SelectItem value="Almoxarifado">Almoxarifado (Manutenção)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-gray-400 mt-1">* Revenda: Venda externa. Frota: Uso interno.</p>
              </div>
            </div>
          )}

          {category !== "Cadastro Mercadoria" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Assunto / Título</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Resumo da solicitação" 
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição Detalhada</label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Descreva o que precisa..." 
                  rows={4} 
                />
              </div>
            </>
          )}

          <div className="space-y-2 bg-slate-50 p-3 rounded border border-dashed border-slate-300">
            <label className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4" /> Anexar Arquivos
            </label>

            {category === "Nova Locação" && (
                <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-2 border border-amber-200">
                    <strong>⚠️ Obrigatório:</strong> Anexar Cartão CNPJ, Dados Cadastrais do cliente, Proposta e outros docs relevantes.
                </div>
            )}

            {(category === "Cadastro Cliente" || category === "Cadastro Fornecedor") && (
                <div className="text-xs text-blue-700 bg-blue-50 p-2 rounded mb-2 border border-blue-200">
                    <strong>⚠️ Documentação:</strong> É obrigatório anexar o <u>Cartão CNPJ</u> aqui.
                </div>
            )}

             {category === "Emissão de Documento" && (
                <div className="text-xs text-green-700 bg-green-50 p-2 rounded mb-2 border border-green-200">
                    <strong>⚠️ Atenção:</strong> OV (Ordem de Venda) Obrigatória.
                </div>
            )}

            <Input 
              type="file" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="bg-white cursor-pointer"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gray-900 text-white hover:bg-gray-800"
            disabled={loading}
          >
            {loading ? "Processando..." : "Criar Solicitação"}
          </Button>

        </form>
      </DialogContent>
    </Dialog>
  )
}