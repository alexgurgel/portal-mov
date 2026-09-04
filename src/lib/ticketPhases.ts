// Mapeia categorias "de fase única" para o setor responsável.
// Categorias com fluxo em fases (Devolução Locação, Solicitação de Reembolso,
// Nova Locação) são tratadas separadamente em getDisplayStatus / getResponsibleSector.
export const SECTOR_BY_CATEGORY: Record<string, string> = {
  "Cadastro Cliente": "Contratos",
  "Solicitação de Pagamento": "Faturamento",
  "Entrada de NF": "Financeiro",
  "Divergência": "Faturamento",
  "Emissão de Documento": "Faturamento",
  "Compra": "Compras",
  "Cotação": "Compras",
  "Cadastro Fornecedor": "Compras",
  "Cadastro Mercadoria": "Compras",
  "Baixa Revenda": "Compras",
}

export type DisplayStatus = {
  label: string
  colorClass: string
}

// Definição das 11 fases lineares do fluxo "Nova Locação".
// `stage` (1-6) agrupa visualmente os estágios pedidos pela Viviane;
// o estágio 3 tem 4 sub-fases (a 1ª é a análise de crédito, do Financeiro)
// e o estágio 4 tem 3 sub-fases (subLabel).
export type NovaLocacaoStageDef = {
  fase: number
  stage: number
  stageLabel: string
  subLabel?: string
  label: string
  setor: string
  colorClass: string
}

export const NOVA_LOCACAO_STAGES: NovaLocacaoStageDef[] = [
  { fase: 1, stage: 1, stageLabel: "Comercial", label: "Comercial", setor: "Comercial", colorClass: "bg-amber-100 text-amber-700" },
  { fase: 2, stage: 2, stageLabel: "Frota (Validação)", label: "Frota (Validação)", setor: "Comercial", colorClass: "bg-amber-100 text-amber-700" },
  { fase: 3, stage: 3, stageLabel: "Contratos", subLabel: "Análise de Crédito", label: "Contratos: Análise de Crédito e Cadastro", setor: "Financeiro", colorClass: "bg-emerald-100 text-emerald-700" },
  { fase: 4, stage: 3, stageLabel: "Contratos", subLabel: "Em Elaboração", label: "Contratos: Em Elaboração", setor: "Contratos", colorClass: "bg-blue-100 text-blue-700" },
  { fase: 5, stage: 3, stageLabel: "Contratos", subLabel: "Assinatura", label: "Contratos: Assinatura", setor: "Contratos", colorClass: "bg-blue-100 text-blue-700" },
  { fase: 6, stage: 3, stageLabel: "Contratos", subLabel: "Contrato Assinado", label: "Contratos: Contrato Assinado", setor: "Contratos", colorClass: "bg-blue-100 text-blue-700" },
  { fase: 7, stage: 4, stageLabel: "Frota (Mobilização)", subLabel: "Preparação Interna", label: "Frota: Preparação Interna", setor: "Comercial", colorClass: "bg-purple-100 text-purple-700" },
  { fase: 8, stage: 4, stageLabel: "Frota (Mobilização)", subLabel: "Carregamento", label: "Frota: Carregamento (NF Remessa)", setor: "Comercial", colorClass: "bg-purple-100 text-purple-700" },
  { fase: 9, stage: 4, stageLabel: "Frota (Mobilização)", subLabel: "Equipamento Entregue", label: "Frota: Equipamento Entregue", setor: "Comercial", colorClass: "bg-purple-100 text-purple-700" },
  { fase: 10, stage: 5, stageLabel: "Cadastro do Contrato", label: "Cadastro do Contrato (ADM)", setor: "Contratos", colorClass: "bg-indigo-100 text-indigo-700" },
  { fase: 11, stage: 6, stageLabel: "Faturamento", label: "Faturamento", setor: "Faturamento", colorClass: "bg-pink-100 text-pink-700" },
]

// Contrato de manutenção não envia equipamento: pula o estágio 4 inteiro
// (Frota - Mobilização), indo do contrato assinado direto para o cadastro.
export const NOVA_LOCACAO_STAGE_MOBILIZACAO = 4

export function isContratoManutencao(ticket: any): boolean {
  return ticket?.custom_data?.contrato_manutencao === 'SIM'
}

export function getNovaLocacaoStage(ticket: any): NovaLocacaoStageDef {
  const fase = ticket.custom_data?.fase_atual || 1
  const idx = Math.min(Math.max(fase, 1), NOVA_LOCACAO_STAGES.length) - 1
  return NOVA_LOCACAO_STAGES[idx]
}

export function getDisplayStatus(ticket: any): DisplayStatus {
  if (ticket.status === 'resolvido') {
    return { label: 'Finalizado', colorClass: 'bg-green-100 text-green-700' }
  }

  if (ticket.status === 'devolvida') {
    return { label: 'Devolvida', colorClass: 'bg-orange-100 text-orange-700' }
  }

  if (ticket.category === 'Nova Locação') {
    const stage = getNovaLocacaoStage(ticket)
    return { label: stage.label, colorClass: stage.colorClass }
  }

  if (ticket.category === 'Devolução Locação') {
    const faseAtual = ticket.custom_data?.fase_atual || 1
    return faseAtual === 2
      ? { label: 'Lançamento NF', colorClass: 'bg-blue-100 text-blue-700' }
      : { label: 'Em Validação Contrato', colorClass: 'bg-amber-100 text-amber-700' }
  }

  if (ticket.category === 'Solicitação de Reembolso') {
    if (ticket.status === 'aberto') return { label: 'Aguardando entrada NF', colorClass: 'bg-amber-100 text-amber-700' }
    if (ticket.status === 'em_andamento') return { label: 'NF Registrada – Em Processamento', colorClass: 'bg-indigo-100 text-indigo-700' }
  }

  if (ticket.status === 'em_andamento') {
    return { label: 'Em Andamento', colorClass: 'bg-yellow-100 text-yellow-700' }
  }

  return { label: 'Aberto', colorClass: 'bg-gray-100 text-gray-700' }
}

// Setor responsável por dar o próximo passo no ticket. `null` quando o
// ticket já está finalizado/devolvido ou não entra em "Pendentes para mim".
export function getResponsibleSector(ticket: any): string | null {
  if (ticket.status === 'resolvido' || ticket.status === 'devolvida') return null

  if (ticket.category === 'Nova Locação') {
    return getNovaLocacaoStage(ticket).setor
  }

  if (ticket.category === 'Devolução Locação') {
    const faseAtual = ticket.custom_data?.fase_atual || 1
    return faseAtual === 2 ? 'Faturamento' : 'Contratos'
  }

  if (ticket.category === 'Solicitação de Reembolso') {
    return (ticket.status === 'aberto' || ticket.status === 'em_andamento') ? 'Financeiro' : null
  }

  return SECTOR_BY_CATEGORY[ticket.category] ?? null
}
