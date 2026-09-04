'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowRightCircle, CheckCircle2, Lock } from "lucide-react"
import { getNovaLocacaoStage, isContratoManutencao } from "@/lib/ticketPhases"

type Anexo = { nome: string; url: string; campo?: string }

type AvancarFn = (dadosEstagio: any, chaveEstagio: string | null, anexosEstagio?: Anexo[], nextFase?: number) => Promise<void>

type Props = {
  ticket: any
  uploadFile: (file: File) => Promise<{ nome: string; url: string }>
  podeAgir: boolean
  onAvancar: AvancarFn
}

type CommonProps = {
  onAvancar: AvancarFn
  submitting: boolean
  setSubmitting: (v: boolean) => void
}

function StageCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-[#F3C843] rounded-lg p-4 md:p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-lg text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Fase1Form({ onAvancar, submitting, setSubmitting }: CommonProps) {
  const handleClick = async () => {
    setSubmitting(true)
    try {
      await onAvancar(undefined, null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 1 — Comercial" subtitle="Dados do cliente e documentos cadastrados na abertura do chamado.">
      <p className="text-sm text-gray-700">
        Confirme os dados e documentos enviados na abertura para avançar para o Estágio 2 (Frota - Validação).
      </p>
      <div className="flex justify-end">
        <Button onClick={handleClick} disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Avançar para Frota (Validação)
        </Button>
      </div>
    </StageCard>
  )
}

function Fase2Form({ onAvancar, submitting, setSubmitting }: CommonProps) {
  const [tipoAtivo, setTipoAtivo] = useState("")
  const [pat, setPat] = useState("")
  const [acessorios, setAcessorios] = useState("")

  const handleSubmit = async () => {
    if (!tipoAtivo) return alert("Selecione o tipo de ativo.")
    if (tipoAtivo === 'Frota' && !pat.trim()) return alert("Informe o PAT do ativo da frota.")

    setSubmitting(true)
    try {
      await onAvancar(
        { tipo_ativo: tipoAtivo, pat: tipoAtivo === 'Frota' ? pat : undefined, acessorios: acessorios || undefined },
        'estagio_2'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 2 — Frota (Validação)" subtitle="Indique se o ativo é novo ou já está na frota.">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="font-bold">Tipo de Ativo *</Label>
          <Select value={tipoAtivo} onValueChange={setTipoAtivo}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Novo">Novo</SelectItem>
              <SelectItem value="Frota">Frota</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tipoAtivo === 'Frota' && (
          <div>
            <Label className="font-bold">PAT *</Label>
            <Input value={pat} onChange={e => setPat(e.target.value)} placeholder="Número do PAT" />
          </div>
        )}
        <div className="md:col-span-2">
          <Label className="font-bold">Acessórios (opcional)</Label>
          <Textarea value={acessorios} onChange={e => setAcessorios(e.target.value)} placeholder="Descreva acessórios incluídos, se houver" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Avançar para Análise de Crédito
        </Button>
      </div>
    </StageCard>
  )
}

// Etapa 1 do Estágio 3 — responsabilidade do Financeiro: analisa o crédito do
// cliente e faz o cadastro sistêmico antes de Contratos elaborar o contrato.
function Fase3Form({ ticket, uploadFile, onAvancar, submitting, setSubmitting }: CommonProps & { ticket: any; uploadFile: Props['uploadFile'] }) {
  const credito = ticket.custom_data?.estagio_3_credito || {}
  const [resultado, setResultado] = useState(credito.resultado || "")
  const [codigoCliente, setCodigoCliente] = useState(credito.codigo_cliente || "")
  const [parecer, setParecer] = useState(credito.parecer || "")
  const [arquivoParecer, setArquivoParecer] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!resultado) return alert("Selecione o resultado da análise de crédito.")
    if (!codigoCliente.trim()) return alert("Informe o código do cliente no sistema (cadastro sistêmico).")
    if (!parecer.trim()) return alert("Descreva o parecer da análise de crédito e cadastro.")

    setSubmitting(true)
    try {
      const anexos: Anexo[] = []
      let parecerArquivo: { nome: string; url: string } | undefined
      if (arquivoParecer) {
        parecerArquivo = await uploadFile(arquivoParecer)
        anexos.push({ ...parecerArquivo, campo: 'parecer_credito' })
      }

      await onAvancar(
        {
          resultado,
          codigo_cliente: codigoCliente,
          parecer,
          ...(parecerArquivo ? { parecer_credito: parecerArquivo } : {}),
        },
        'estagio_3_credito',
        anexos
      )
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard
      title="Estágio 3 — Análise de Crédito e Cadastro Sistêmico"
      subtitle="Etapa do Financeiro: aprove o crédito do cliente e registre o cadastro no sistema."
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="font-bold">Resultado da Análise *</Label>
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Aprovado com ressalvas">Aprovado com ressalvas</SelectItem>
              <SelectItem value="Reprovado">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-bold">Código do Cliente no Sistema *</Label>
          <Input value={codigoCliente} onChange={e => setCodigoCliente(e.target.value)} placeholder="Cadastro sistêmico" />
        </div>
        <div className="md:col-span-2">
          <Label className="font-bold">Parecer / Observações *</Label>
          <Textarea
            value={parecer}
            onChange={e => setParecer(e.target.value)}
            placeholder="Descreva o resultado da análise de crédito e do cadastro do cliente"
            rows={4}
          />
        </div>
        <div className="md:col-span-2">
          <Label className="font-bold">Anexo do Parecer (opcional)</Label>
          <Input type="file" className="cursor-pointer" onChange={e => setArquivoParecer(e.target.files?.[0] || null)} />
          {arquivoParecer && <span className="text-xs text-green-600 mt-1 block">✓ {arquivoParecer.name}</span>}
        </div>
      </div>

      {resultado === 'Reprovado' && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700 font-semibold">
          Crédito reprovado: registre o motivo no parecer. Se a locação não deve seguir, use &quot;Devolver Tudo&quot; para retornar o chamado ao Comercial.
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Avançar para Contratos
        </Button>
      </div>
    </StageCard>
  )
}

function Fase4Form({ ticket, onAvancar, submitting, setSubmitting }: CommonProps & { ticket: any }) {
  const credito = ticket.custom_data?.estagio_3_credito || {}
  const [observacoes, setObservacoes] = useState(ticket.custom_data?.estagio_3?.observacoes || "")

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await onAvancar({ observacoes: observacoes || undefined }, 'estagio_3')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 3 — Contratos: Em Elaboração" subtitle="Crédito já analisado pelo Financeiro. Elabore o contrato e avance para a assinatura.">
      {(credito.resultado || credito.codigo_cliente) && (
        <div className="bg-emerald-50 border border-emerald-200 rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] font-bold text-emerald-600 uppercase">Análise de Crédito</span>
            <span className="font-medium text-sm">{credito.resultado || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-emerald-600 uppercase">Código do Cliente</span>
            <span className="font-medium text-sm">{credito.codigo_cliente || '-'}</span>
          </div>
          {credito.parecer && (
            <div className="md:col-span-2">
              <span className="block text-[10px] font-bold text-emerald-600 uppercase">Parecer</span>
              <span className="text-sm text-gray-700 whitespace-pre-wrap">{credito.parecer}</span>
            </div>
          )}
        </div>
      )}

      <div>
        <Label className="font-bold">Observações do Contrato (opcional)</Label>
        <Textarea
          value={observacoes}
          onChange={e => setObservacoes(e.target.value)}
          placeholder="Anotações sobre a elaboração do contrato"
          rows={3}
        />
      </div>
      <p className="text-xs text-gray-500">
        A data de início da locação passou a ser informada pela Frota, na etapa de Carregamento.
      </p>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Avançar para Assinatura
        </Button>
      </div>
    </StageCard>
  )
}

function Fase5Form({ ticket, onAvancar, submitting, setSubmitting }: CommonProps & { ticket: any }) {
  const handleClick = async () => {
    setSubmitting(true)
    try {
      await onAvancar(ticket.custom_data?.estagio_3 || {}, null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 3 — Contratos: Assinatura" subtitle="Contrato em processo de assinatura pelas partes.">
      <p className="text-sm text-gray-700">
        Quando o contrato for assinado por todas as partes, confirme para avançar.
      </p>
      <div className="flex justify-end">
        <Button onClick={handleClick} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Confirmar Contrato Assinado
        </Button>
      </div>
    </StageCard>
  )
}

function Fase6Form({ ticket, onAvancar, submitting, setSubmitting }: CommonProps & { ticket: any }) {
  // Contrato de manutenção não mobiliza equipamento: vai direto para o
  // Cadastro do Contrato (fase 10), pulando o estágio 4 inteiro.
  const manutencao = isContratoManutencao(ticket)

  const handleClick = async () => {
    setSubmitting(true)
    try {
      await onAvancar(ticket.custom_data?.estagio_3 || {}, null, undefined, manutencao ? 10 : undefined)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 3 — Contrato Assinado" subtitle="Contrato assinado e validado pelo setor de Contratos.">
      <p className="text-sm text-gray-700">
        {manutencao
          ? 'Contrato de manutenção: sem mobilização de equipamento. Avance direto para o Cadastro do Contrato.'
          : 'Avance para liberar o equipamento para a Frota (Mobilização).'}
      </p>
      <div className="flex justify-end">
        <Button onClick={handleClick} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> {manutencao ? 'Avançar para Cadastro do Contrato' : 'Avançar para Frota (Mobilização)'}
        </Button>
      </div>
    </StageCard>
  )
}

function Fase7Form({ uploadFile, onAvancar, submitting, setSubmitting }: CommonProps & { uploadFile: Props['uploadFile'] }) {
  const [arquivoOv, setArquivoOv] = useState<File | null>(null)
  const [valorFrete, setValorFrete] = useState("")
  const [tipoFrete, setTipoFrete] = useState("")

  const handleSubmit = async () => {
    if (!arquivoOv) return alert("Anexe a OV (Ordem de Venda).")
    if (!valorFrete.trim()) return alert("Informe o valor do frete.")
    if (!tipoFrete) return alert("Selecione o tipo de frete (CIF/FOB).")

    setSubmitting(true)
    try {
      const upload = await uploadFile(arquivoOv)
      await onAvancar(
        { upload_ov: upload, valor_frete: valorFrete, tipo_frete: tipoFrete },
        'estagio_4',
        [{ ...upload, campo: 'upload_ov' }],
        10
      )
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 4 — Frota: Preparação Interna" subtitle="Anexe a OV e informe os dados de frete.">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label className="font-bold">OV (Ordem de Venda) *</Label>
          <Input type="file" className="cursor-pointer" onChange={e => setArquivoOv(e.target.files?.[0] || null)} />
          {arquivoOv && <span className="text-xs text-green-600 mt-1 block">✓ {arquivoOv.name}</span>}
        </div>
        <div>
          <Label className="font-bold">Valor do Frete *</Label>
          <Input value={valorFrete} onChange={e => setValorFrete(e.target.value)} placeholder="R$ 0,00" />
        </div>
        <div>
          <Label className="font-bold">Tipo de Frete *</Label>
          <Select value={tipoFrete} onValueChange={setTipoFrete}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CIF">CIF</SelectItem>
              <SelectItem value="FOB">FOB</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Avançar para Cadastro do Contrato
        </Button>
      </div>
    </StageCard>
  )
}

function Fase8Form({ ticket, onAvancar, submitting, setSubmitting }: CommonProps & { ticket: any }) {
  const estagio4 = ticket.custom_data?.estagio_4 || {}
  // A data de início da locação é informada aqui, não mais na elaboração do
  // contrato (ticket #1905).
  const [dataInicio, setDataInicio] = useState(estagio4.data_inicio_locacao || "")

  const handleClick = async () => {
    if (!dataInicio) return alert("Informe a data de início da locação.")

    setSubmitting(true)
    try {
      await onAvancar({ ...estagio4, data_inicio_locacao: dataInicio }, 'estagio_4')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 4 — Frota: Carregamento" subtitle="A NF de remessa já foi emitida pelo Faturamento (Estágio 5). Confirme o carregamento.">
      <p className="text-sm text-gray-700">
        Com a NF de remessa já emitida, informe a data de início da locação e confirme o carregamento.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="font-bold">Data de Início da Locação *</Label>
          <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleClick} disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Confirmar Carregamento
        </Button>
      </div>
    </StageCard>
  )
}

function Fase9Form({ ticket, onAvancar, submitting, setSubmitting }: CommonProps & { ticket: any }) {
  const handleClick = async () => {
    setSubmitting(true)
    try {
      await onAvancar(
        { ...(ticket.custom_data?.estagio_4 || {}), data_inicio_periodo_locacao: new Date().toISOString() },
        'estagio_4',
        undefined,
        11
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 4 — Frota: Equipamento Entregue" subtitle="Confirme a entrega do equipamento ao cliente.">
      <p className="text-sm text-gray-700">
        Ao confirmar, o período de locação é iniciado e o chamado avança para o Cadastro do Contrato.
      </p>
      <div className="flex justify-end">
        <Button onClick={handleClick} disabled={submitting} className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> Confirmar Entrega e Avançar
        </Button>
      </div>
    </StageCard>
  )
}

function Fase10Form({ ticket, uploadFile, onAvancar, submitting, setSubmitting }: CommonProps & { ticket: any; uploadFile: Props['uploadFile'] }) {
  const estagio5 = ticket.custom_data?.estagio_5 || {}
  const estagio4 = ticket.custom_data?.estagio_4 || {}
  // Sem mobilização, o próximo passo depois do cadastro é o Faturamento.
  const manutencao = isContratoManutencao(ticket)
  const [numeroContrato, setNumeroContrato] = useState(estagio5.numero_contrato || "")
  const [printContrato, setPrintContrato] = useState<File | null>(null)
  const [emailFatura, setEmailFatura] = useState(estagio5.email_fatura || ticket.custom_data?.email_contato || "")
  const [valorMensal, setValorMensal] = useState(estagio5.valor_mensal || "")
  const [dataInicioCobranca, setDataInicioCobranca] = useState(estagio5.data_inicio_cobranca || "")

  const handleSubmit = async () => {
    if (!numeroContrato.trim()) return alert("Informe o número do contrato.")
    if (!printContrato && !estagio5.print_contrato) return alert("Anexe o print do contrato.")
    if (!emailFatura.trim()) return alert("Informe o e-mail para envio da fatura.")
    if (!valorMensal.trim()) return alert("Informe o valor mensal.")
    if (!dataInicioCobranca) return alert("Informe a data de início da cobrança.")

    setSubmitting(true)
    try {
      let printData = estagio5.print_contrato
      const anexos: Anexo[] = []
      if (printContrato) {
        printData = await uploadFile(printContrato)
        anexos.push({ ...printData, campo: 'print_contrato' })
      }

      await onAvancar({
        numero_contrato: numeroContrato,
        print_contrato: printData,
        email_fatura: emailFatura,
        valor_mensal: valorMensal,
        data_inicio_cobranca: dataInicioCobranca,
        valor_frete_ref: estagio4.valor_frete,
        tipo_frete_ref: estagio4.tipo_frete,
      }, 'estagio_5', anexos, manutencao ? 11 : 8)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 5 — Cadastro do Contrato (ADM/Contratos)" subtitle="Finalize o cadastro do contrato no sistema.">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="font-bold">Número do Contrato *</Label>
          <Input value={numeroContrato} onChange={e => setNumeroContrato(e.target.value)} />
        </div>
        <div>
          <Label className="font-bold">Print do Contrato *</Label>
          <Input type="file" className="cursor-pointer" onChange={e => setPrintContrato(e.target.files?.[0] || null)} />
          {printContrato ? (
            <span className="text-xs text-green-600 mt-1 block">✓ {printContrato.name}</span>
          ) : estagio5.print_contrato ? (
            <span className="text-xs text-gray-500 mt-1 block">Atual: {estagio5.print_contrato.nome}</span>
          ) : null}
        </div>
        <div>
          <Label className="font-bold">E-mail para Fatura *</Label>
          <Input type="email" value={emailFatura} onChange={e => setEmailFatura(e.target.value)} />
        </div>
        <div>
          <Label className="font-bold">Valor Mensal *</Label>
          <Input value={valorMensal} onChange={e => setValorMensal(e.target.value)} placeholder="R$ 0,00" />
        </div>
        <div>
          <Label className="font-bold">Data de Início da Cobrança *</Label>
          <Input type="date" value={dataInicioCobranca} onChange={e => setDataInicioCobranca(e.target.value)} />
        </div>
      </div>

      {(estagio4.valor_frete || estagio4.tipo_frete) && (
        <div className="bg-gray-50 border rounded p-3 grid grid-cols-2 gap-3">
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Valor de Frete (Estágio 4)</span>
            <span className="font-medium text-sm">{estagio4.valor_frete || '-'}</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 uppercase">Tipo de Frete (Estágio 4)</span>
            <span className="font-medium text-sm">{estagio4.tipo_frete || '-'}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold">
          <ArrowRightCircle size={16} /> {manutencao ? 'Avançar para Faturamento' : 'Avançar para Carregamento'}
        </Button>
      </div>
    </StageCard>
  )
}

function Fase11Form({ uploadFile, onAvancar, submitting, setSubmitting }: CommonProps & { uploadFile: Props['uploadFile'] }) {
  const [numeroFatura, setNumeroFatura] = useState("")
  const [arquivoFatura, setArquivoFatura] = useState<File | null>(null)
  const [numeroNd, setNumeroNd] = useState("")
  const [arquivoNd, setArquivoNd] = useState<File | null>(null)

  const handleSubmit = async () => {
    if (!numeroFatura.trim()) return alert("Informe o número da 1ª fatura de locação.")

    setSubmitting(true)
    try {
      const anexos: Anexo[] = []
      let faturaArquivo: { nome: string; url: string } | undefined
      if (arquivoFatura) {
        faturaArquivo = await uploadFile(arquivoFatura)
        anexos.push({ ...faturaArquivo, campo: 'fatura_locacao' })
      }
      let ndArquivo: { nome: string; url: string } | undefined
      if (arquivoNd) {
        ndArquivo = await uploadFile(arquivoNd)
        anexos.push({ ...ndArquivo, campo: 'nd_frete' })
      }

      const dados: any = {
        fatura_locacao: { numero: numeroFatura, arquivo: faturaArquivo },
      }
      if (numeroNd.trim() || ndArquivo) {
        dados.nd_frete = { numero: numeroNd, arquivo: ndArquivo }
      }

      await onAvancar(dados, 'estagio_6', anexos)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <StageCard title="Estágio 6 — Faturamento" subtitle="Lance a 1ª fatura de locação e, se aplicável, a ND de frete.">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="font-bold">Nº da 1ª Fatura de Locação *</Label>
          <Input value={numeroFatura} onChange={e => setNumeroFatura(e.target.value)} />
        </div>
        <div>
          <Label className="font-bold">Anexo da Fatura (opcional)</Label>
          <Input type="file" className="cursor-pointer" onChange={e => setArquivoFatura(e.target.files?.[0] || null)} />
          {arquivoFatura && <span className="text-xs text-green-600 mt-1 block">✓ {arquivoFatura.name}</span>}
        </div>
        <div>
          <Label className="font-bold">Nº ND de Frete (quando aplicável)</Label>
          <Input value={numeroNd} onChange={e => setNumeroNd(e.target.value)} />
        </div>
        <div>
          <Label className="font-bold">Anexo da ND de Frete (opcional)</Label>
          <Input type="file" className="cursor-pointer" onChange={e => setArquivoNd(e.target.files?.[0] || null)} />
          {arquivoNd && <span className="text-xs text-green-600 mt-1 block">✓ {arquivoNd.name}</span>}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting} className="bg-pink-600 hover:bg-pink-700 text-white gap-2 font-bold">
          <CheckCircle2 size={16} /> Concluir Locação (Baixar)
        </Button>
      </div>
    </StageCard>
  )
}

export default function NovaLocacaoStageForm({ ticket, uploadFile, podeAgir, onAvancar }: Props) {
  const faseAtual = ticket.custom_data?.fase_atual || 1
  const stageDef = getNovaLocacaoStage(ticket)
  const [submitting, setSubmitting] = useState(false)

  if (!podeAgir) {
    return (
      <div className="bg-gray-50 border rounded-lg p-4 text-sm text-gray-500 flex items-center gap-2">
        <Lock size={16} />
        <span>Aguardando ação do setor <b>{stageDef.setor}</b> para avançar este chamado.</span>
      </div>
    )
  }

  const common: CommonProps = { onAvancar, submitting, setSubmitting }

  switch (faseAtual) {
    case 1: return <Fase1Form {...common} />
    case 2: return <Fase2Form {...common} />
    case 3: return <Fase3Form {...common} ticket={ticket} uploadFile={uploadFile} />
    case 4: return <Fase4Form {...common} ticket={ticket} />
    case 5: return <Fase5Form {...common} ticket={ticket} />
    case 6: return <Fase6Form {...common} ticket={ticket} />
    case 7: return <Fase7Form {...common} uploadFile={uploadFile} />
    case 8: return <Fase8Form {...common} ticket={ticket} />
    case 9: return <Fase9Form {...common} ticket={ticket} />
    case 10: return <Fase10Form {...common} ticket={ticket} uploadFile={uploadFile} />
    case 11: return <Fase11Form {...common} uploadFile={uploadFile} />
    default: return null
  }
}
