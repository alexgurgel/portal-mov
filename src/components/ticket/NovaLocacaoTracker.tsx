'use client'

import { CheckCircle2, MinusCircle } from "lucide-react"
import { NOVA_LOCACAO_STAGES, NOVA_LOCACAO_STAGE_MOBILIZACAO, isContratoManutencao } from "@/lib/ticketPhases"

const STAGE_GROUPS = [1, 2, 3, 4, 5, 6].map((stage) => {
  const fasesDoEstagio = NOVA_LOCACAO_STAGES.filter((s) => s.stage === stage)
  return {
    stage,
    stageLabel: fasesDoEstagio[0].stageLabel,
    fases: fasesDoEstagio,
  }
})

export default function NovaLocacaoTracker({ ticket }: { ticket: any }) {
  const faseAtual = ticket.custom_data?.fase_atual || 1
  const finalizado = ticket.status === 'resolvido'
  const devolvido = ticket.status === 'devolvida'
  const devolucaoEstagio = ticket.custom_data?.devolucao_estagio
  const manutencao = isContratoManutencao(ticket)

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4 md:p-6">
      {manutencao && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 font-semibold">
          Contrato de manutenção: sem mobilização de equipamento (Estágio 4 não se aplica).
        </div>
      )}

      {devolvido && devolucaoEstagio && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800 font-semibold">
          Ticket devolvido durante o estágio: {NOVA_LOCACAO_STAGES[devolucaoEstagio - 1]?.stageLabel}
          {NOVA_LOCACAO_STAGES[devolucaoEstagio - 1]?.subLabel && ` (${NOVA_LOCACAO_STAGES[devolucaoEstagio - 1]?.subLabel})`}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-0">
        {STAGE_GROUPS.map((grupo, idx) => {
          const minFase = grupo.fases[0].fase
          const maxFase = grupo.fases[grupo.fases.length - 1].fase
          const naoSeAplica = manutencao && grupo.stage === NOVA_LOCACAO_STAGE_MOBILIZACAO
          const concluido = !naoSeAplica && (finalizado || faseAtual > maxFase)
          const ativo = !naoSeAplica && !finalizado && faseAtual >= minFase && faseAtual <= maxFase

          return (
            <div key={grupo.stage} className="flex-1 flex md:flex-col items-center">
              <div className="flex items-center w-full">
                {idx > 0 && (
                  <div className={`hidden md:block flex-1 h-0.5 ${concluido || ativo ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
                <div className={`flex items-center justify-center w-9 h-9 rounded-full font-bold text-sm shrink-0 mx-1 border-2
                  ${naoSeAplica ? 'bg-gray-100 border-gray-200 text-gray-300'
                    : concluido ? 'bg-green-500 border-green-500 text-white'
                    : ativo ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-gray-300 text-gray-400'}`}>
                  {naoSeAplica ? <MinusCircle size={18} /> : concluido ? <CheckCircle2 size={18} /> : grupo.stage}
                </div>
                {idx < STAGE_GROUPS.length - 1 && (
                  <div className={`hidden md:block flex-1 h-0.5 ${concluido ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>

              <div className="ml-3 md:ml-0 md:mt-2 text-left md:text-center">
                <p className={`text-xs font-bold ${
                  naoSeAplica ? 'text-gray-300 line-through'
                  : ativo ? 'text-amber-700'
                  : concluido ? 'text-green-700'
                  : 'text-gray-400'
                }`}>
                  {grupo.stageLabel}
                </p>
                {naoSeAplica ? (
                  <p className="text-[10px] text-gray-400 mt-1 italic">Não se aplica</p>
                ) : grupo.fases.length > 1 && (
                  <div className="mt-1 space-y-0.5">
                    {grupo.fases.map((f) => (
                      <p key={f.fase} className={`text-[10px] ${
                        finalizado || faseAtual > f.fase ? 'text-green-600 font-semibold'
                        : faseAtual === f.fase ? 'text-amber-600 font-bold'
                        : 'text-gray-400'
                      }`}>
                        {f.subLabel}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
