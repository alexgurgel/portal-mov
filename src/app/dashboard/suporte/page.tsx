import { Suspense } from "react"
import SuporteClient from "@/components/SuporteClient"

export default function SuportePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Carregando...</div>}>
      <SuporteClient />
    </Suspense>
  )
}
