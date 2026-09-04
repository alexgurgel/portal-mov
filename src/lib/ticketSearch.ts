// Helpers de pesquisa usados por todos os módulos (Visão Geral, Pendentes,
// Suporte, Controle de Relatório e Usuários).
//
// Existem duas estratégias:
//  - `buildTicketOrFilter`: pesquisa feita no banco (Supabase/PostgREST), usada
//    onde a lista pode ser grande (Visão Geral / setores).
//  - `matchesTicketSearch`: pesquisa feita na tela, usada onde a lista já vem
//    inteira do banco (Pendentes, Suporte, Controle de Relatório).

// Categorias disponíveis na abertura de chamado ("Tipo de Solicitação").
export const TICKET_CATEGORIES = [
  "Geral",
  "Nova Locação",
  "Devolução Locação",
  "Compra",
  "Cotação",
  "Solicitação de Pagamento",
  "Entrada de NF",
  "Solicitação de Reembolso",
  "Divergência",
  "Cadastro Mercadoria",
  "Baixa Revenda",
  "Cadastro Cliente",
  "Cadastro Fornecedor",
  "Emissão de Documento",
  "Suporte Sistema",
]

// Tipos de documento do módulo "Emissão de Documento" (custom_data.tipo_emissao).
export const TIPOS_DOCUMENTO = [
  "Remessa Conserto",
  "Remessa Locação",
  "Fatur. Serviço",
  "Fatur. Peças",
  "Mau Uso",
]

export const PRIORIDADES = [
  { value: "alta", label: "Urgente" },
  { value: "media", label: "Normal" },
]

// Campos do custom_data que fazem sentido pesquisar no banco.
const CUSTOM_DATA_SEARCH_KEYS = [
  "cliente",
  "cnpj",
  "fornecedor",
  "beneficiario",
  "razao_social",
  "numero_nf",
  "nf_numero",
  "pat",
  "empresa",
  "num_relatorio",
  "tipo_emissao",
  "codigo",
  "descricao_item",
  "local_estoque",
  "motivo_divergencia",
]

// Colunas reais da tabela `tickets` que entram na pesquisa livre.
const TICKET_SEARCH_COLUMNS = ["title", "description", "requester_name", "category"]

// O parser do PostgREST usa vírgula/parênteses como separadores, então esses
// caracteres precisam sair do termo antes de virar filtro.
export function sanitizeSearchTerm(term: string): string {
  return term
    .replace(/[,()"'\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Monta o argumento do `.or()` do Supabase. `comCustomData` inclui os campos
// do JSON — quem chama deve refazer a consulta sem eles caso o banco recuse.
export function buildTicketOrFilter(term: string, comCustomData = true): string | null {
  const limpo = sanitizeSearchTerm(term)
  if (!limpo) return null

  const partes = TICKET_SEARCH_COLUMNS.map((coluna) => `${coluna}.ilike.*${limpo}*`)

  if (comCustomData) {
    for (const chave of CUSTOM_DATA_SEARCH_KEYS) {
      partes.push(`custom_data->>${chave}.ilike.*${limpo}*`)
    }
  }

  // "#1744" ou "1744" busca direto pelo número do chamado.
  const numero = limpo.replace(/^#/, "")
  if (/^\d+$/.test(numero)) {
    partes.unshift(`id.eq.${numero}`)
  }

  return partes.join(",")
}

// Ignora acentos e caixa para que "cotacao" encontre "Cotação".
function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

// Percorre o custom_data juntando qualquer texto pesquisável (itens da tabela,
// PATs, códigos de entrada, nomes de anexos...). URLs ficam de fora.
function coletarTextos(valor: unknown, destino: string[]) {
  if (valor === null || valor === undefined) return

  if (typeof valor === "string") {
    if (!valor.startsWith("http")) destino.push(valor)
    return
  }
  if (typeof valor === "number" || typeof valor === "boolean") {
    destino.push(String(valor))
    return
  }
  if (Array.isArray(valor)) {
    valor.forEach((item) => coletarTextos(item, destino))
    return
  }
  if (typeof valor === "object") {
    Object.values(valor as Record<string, unknown>).forEach((item) => coletarTextos(item, destino))
  }
}

// Formato mínimo esperado de um chamado para a pesquisa na tela.
export type TicketPesquisavel = {
  id?: number | string
  title?: string | null
  description?: string | null
  requester_name?: string | null
  category?: string | null
  custom_data?: unknown
}

// Pesquisa livre na tela: nº do chamado, solicitante, assunto, descrição,
// categoria e todo o conteúdo preenchido no formulário (custom_data).
export function matchesTicketSearch(ticket: TicketPesquisavel, term: string): boolean {
  const termo = normalizar(term.trim().replace(/^#/, ""))
  if (!termo) return true

  const campos: string[] = [
    String(ticket.id ?? ""),
    ticket.title || "",
    ticket.description || "",
    ticket.requester_name || "",
    ticket.category || "",
  ]
  coletarTextos(ticket.custom_data, campos)

  return campos.some((campo) => normalizar(campo).includes(termo))
}
