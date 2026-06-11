'use client'

import { CheckCircle2, Paperclip, User, Clock } from "lucide-react"

const formatKey = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

function renderValor(valor: any): string | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'object') return null
  return String(valor)
}

export default function HistoricoEstagiosTimeline({ historico }: { historico?: any[] }) {
  if (!historico || historico.length === 0) return null

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4 md:p-6">
      <h3 className="font-bold text-lg text-gray-900 mb-4">Histórico do Processo</h3>
      <div className="space-y-0">
        {historico.map((item, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </div>
              {idx < historico.length - 1 && <div className="w-0.5 flex-1 bg-green-200 my-1" />}
            </div>
            <div className="pb-6 flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900">{item.label}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
                {item.usuario && (
                  <span className="flex items-center gap-1"><User size={12} /> {item.usuario}</span>
                )}
                {item.data && (
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(item.data).toLocaleString('pt-BR')}</span>
                )}
              </div>

              {item.dados && typeof item.dados === 'object' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  {Object.entries(item.dados).map(([key, value]) => {
                    const display = renderValor(value)
                    if (display === null) return null
                    return (
                      <div key={key} className="bg-gray-50 px-3 py-2 rounded border text-xs">
                        <span className="block font-bold text-gray-400 uppercase text-[10px]">{formatKey(key)}</span>
                        <span className="text-gray-800 break-words">{display}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {item.anexos && item.anexos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.anexos.map((anexo: any, aIdx: number) => (
                    <a
                      key={aIdx}
                      href={anexo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold px-2 py-1 rounded hover:bg-blue-100"
                    >
                      <Paperclip size={12} /> {anexo.nome}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
