import DashboardClient from "@/components/DashboardClient"

// AGORA VAI FUNCIONAR: Isso avisa o Vercel para NÃO tentar pré-renderizar essa página
export const dynamic = 'force-dynamic'

export default function DashboardPage() {
  return <DashboardClient />
}