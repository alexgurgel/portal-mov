'use client'
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation" // Adicionei usePathname
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Users, 
  Package, 
  Truck,
  FileSignature,
  LogOut,
  ClipboardList // Ícone novo para o relatório
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useState, useEffect } from "react" // Adicionei hooks para checar o usuário

export function Sidebar() {
  const searchParams = useSearchParams()
  const pathname = usePathname() // Para saber em qual página estamos
  const currentSector = searchParams.get('sector')
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("")

  // 1. Busca o e-mail do usuário logado ao carregar
  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // --- CONFIGURAÇÃO DE ACESSO ---
  // Coloque aqui os e-mails que podem ver a aba "Controle de Relatório"
  const usuariosPermitidos = [
    "alex.batista@grupomov.com.br", 
    "manuela.malagoli@grupomov.com.br",
    "paulo.diniz@grupomov.com.br"
  ]
  const temAcessoEspecial = usuariosPermitidos.includes(userEmail)

  // 2. Lista de Menus
  const menus = [
    { name: "Visão Geral", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Nova Locação", icon: Truck, href: "/dashboard?sector=Nova Locação" },
    { name: "Compra", icon: ShoppingCart, href: "/dashboard?sector=Compra" },
    { name: "Cotação", icon: FileText, href: "/dashboard?sector=Cotação" },
    { name: "Cadastro Mercadoria", icon: Package, href: "/dashboard?sector=Cadastro Mercadoria" },
    { name: "Cadastro Cliente", icon: Users, href: "/dashboard?sector=Cadastro Cliente" },
    { name: "Cadastro Fornecedor", icon: Users, href: "/dashboard?sector=Cadastro Fornecedor" },
    { name: "Emissão de Documento", icon: FileSignature, href: "/dashboard?sector=Emissão de Documento" },
  ]

  // Se tiver acesso, adicionamos o menu novo na lista
  if (temAcessoEspecial) {
    menus.push({ 
        name: "Controle de Relatório", 
        icon: ClipboardList, 
        href: "/controle-relatorio" // Link para a nova página que criamos
    })
  }

  return (
    <div className="h-screen w-64 bg-black text-white flex flex-col fixed left-0 top-0 shadow-xl z-50">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-[#F3C843]">Grupo MOV</h1>
        <p className="text-xs text-gray-400">Portal de Serviços</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menus.map((item) => {
            // Lógica para saber se o botão está ativo (Amarelo)
            // Verifica se é a página exata OU se é um setor do dashboard
            const isActive = 
                (item.href === "/dashboard" && pathname === "/dashboard" && !currentSector) || // Visão Geral
                (item.href === `/dashboard?sector=${currentSector}`) || // Setores
                (item.href === pathname && pathname === "/controle-relatorio") // Nova página separada

            return (
                <Link 
                    key={item.name} 
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors font-medium text-sm
                        ${isActive ? "bg-[#F3C843] text-black font-bold shadow-md" : "text-gray-300 hover:bg-gray-800"}`}
                >
                    <item.icon size={18} />
                    {item.name}
                </Link>
            )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:bg-gray-900 rounded-md transition-colors text-sm font-bold">
            <LogOut size={18} /> Sair
        </button>
      </div>
    </div>
  )
}