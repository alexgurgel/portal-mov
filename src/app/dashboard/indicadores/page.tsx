import { IndicadoresClient } from "@/components/IndicadoresClient"

// ISSO CORRIGE O ERRO DE PRERENDER
export const dynamic = 'force-dynamic'

export default function IndicadoresPage() {
  return <IndicadoresClient />
}