'use client'
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Users,
  Package,
  Truck,
  FileSignature,
  LogOut,
  ClipboardList,
  Banknote,
  Receipt,
  AlertTriangle,
  BarChart3,
  Bug,
  RotateCcw, // Ícone novo adicionado para a Devolução
  UserCog,
  ListChecks,
  FileCheck2,
  PackageMinus
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useState, useEffect } from "react"

export function Sidebar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const currentSector = searchParams.get('sector')
  const router = useRouter()
  const [userEmail, setUserEmail] = useState("")
  const [userRole, setUserRole] = useState("")
  const [userDepartmentId, setUserDepartmentId] = useState<number | null>(null)

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, department_id')
          .eq('id', user.id)
          .single()
        if (profile?.role) {
          setUserRole(profile.role)
        }
        if (profile?.department_id) {
          setUserDepartmentId(profile.department_id)
        }
      }
    }
    getUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Apenas admins podem ver o menu de relatórios, mas TODOS podem ver os indicadores?
  // Se quiser restringir indicadores, coloque dentro do if(temAcessoEspecial)
  const usuariosPermitidos = [
    "alex.batista@grupomov.com.br", 
    "manuela.malagoli@grupomov.com.br",
    "paulo.diniz@grupomov.com.br"
  ]
  const temAcessoEspecial = usuariosPermitidos.includes(userEmail)

  const menus = [
    { name: "Visão Geral", icon: LayoutDashboard, href: "/dashboard" },
    { name: "Indicadores / SLA", icon: BarChart3, href: "/dashboard/indicadores" },

    { name: "Nova Locação", icon: Truck, href: "/dashboard?sector=Nova Locação" },
    // --- NOVO MENU ADICIONADO AQUI ---
    { name: "Devolução Locação", icon: RotateCcw, href: "/dashboard?sector=Devolução Locação" },
    { name: "Compra", icon: ShoppingCart, href: "/dashboard?sector=Compra" },
    { name: "Cotação", icon: FileText, href: "/dashboard?sector=Cotação" },
    { name: "Solicitação Pagamento", icon: Banknote, href: "/dashboard?sector=Solicitação de Pagamento" },
    { name: "Entrada de NF", icon: FileCheck2, href: "/dashboard?sector=Entrada de NF" },
    { name: "Solicitação Reembolso", icon: Receipt, href: "/dashboard?sector=Solicitação de Reembolso" },
    { name: "Divergência / Devolução", icon: AlertTriangle, href: "/dashboard?sector=Divergência" },
    { name: "Cadastro Mercadoria", icon: Package, href: "/dashboard?sector=Cadastro Mercadoria" },
    { name: "Baixa Revenda", icon: PackageMinus, href: "/dashboard?sector=Baixa Revenda" },
    { name: "Cadastro Cliente", icon: Users, href: "/dashboard?sector=Cadastro Cliente" },
    { name: "Cadastro Fornecedor", icon: Users, href: "/dashboard?sector=Cadastro Fornecedor" },
    { name: "Emissão de Documento", icon: FileSignature, href: "/dashboard?sector=Emissão de Documento" },
    { name: "Suporte / Melhorias", icon: Bug, href: "/dashboard/suporte" },
  ]

  if (temAcessoEspecial) {
    menus.push({
        name: "Controle de Relatório",
        icon: ClipboardList,
        href: "/controle-relatorio"
    })
  }

  if (userRole === 'admin') {
    menus.push({
        name: "Usuários",
        icon: UserCog,
        href: "/dashboard/usuarios"
    })
  }

  if (userDepartmentId) {
    menus.splice(1, 0, {
        name: "Pendentes para Mim",
        icon: ListChecks,
        href: "/dashboard/pendentes"
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
            const isActive = 
                (item.href === "/dashboard" && pathname === "/dashboard" && !currentSector) || 
                (item.href === `/dashboard?sector=${currentSector}`) || 
                (item.href === pathname && pathname === "/controle-relatorio") ||
                (item.href === pathname && pathname === "/dashboard/indicadores") ||
                (item.href === pathname && pathname === "/dashboard/suporte") ||
                (item.href === pathname && pathname === "/dashboard/usuarios") ||
                (item.href === pathname && pathname === "/dashboard/pendentes")

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