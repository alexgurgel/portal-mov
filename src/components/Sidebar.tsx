'use client'
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Users, 
  Package, 
  Truck,
  FileSignature,
  LogOut
} from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

export function Sidebar() {
  const searchParams = useSearchParams()
  const currentSector = searchParams.get('sector')
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Novos Menus solicitados
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

  return (
    <div className="h-screen w-64 bg-black text-white flex flex-col fixed left-0 top-0 shadow-xl z-50">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold text-[#F3C843]">Grupo MOV</h1>
        <p className="text-xs text-gray-400">Portal de Serviços</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menus.map((item) => {
            const isActive = item.href === `/dashboard?sector=${currentSector}` || (item.href === '/dashboard' && !currentSector)
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