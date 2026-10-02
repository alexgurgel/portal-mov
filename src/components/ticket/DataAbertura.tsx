import { formatHoraAbertura } from "@/lib/utils"

// Data + hora de abertura nas listas de chamados.
export default function DataAbertura({ createdAt }: { createdAt: string }) {
  return (
    <>
      {new Date(createdAt).toLocaleDateString('pt-BR')}
      <span className="block text-xs text-gray-400">{formatHoraAbertura(createdAt)}</span>
    </>
  )
}
