import { Sidebar } from "@/components/Sidebar"

export default function DashboardLayout({
  children, // Aqui entra o conteúdo das páginas (dashboard, ticket details, etc)
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar Fixa na Esquerda */}
      <Sidebar />
      
      {/* Conteúdo Principal (empurrado para a direita) */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}