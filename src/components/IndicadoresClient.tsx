'use client'

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabaseClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Filter, CalendarDays, CheckCircle2, AlertCircle, Clock, RotateCcw, Activity } from "lucide-react"

export function IndicadoresClient() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Data padrão: Últimos 30 dias
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    // Define datas apenas no cliente para evitar erro de hidratação
    const hoje = new Date()
    const mesAtras = new Date()
    mesAtras.setDate(hoje.getDate() - 30)
    
    setEndDate(hoje.toISOString().split('T')[0])
    setStartDate(mesAtras.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (startDate && endDate) fetchData()
  }, [startDate, endDate])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .neq('category', 'Controle de Relatorio') 

    if (data) setTickets(data)
    setLoading(false)
  }

  function countBusinessDays(start: string, end: string) {
    if (!start || !end) return 0

    // Extrai só a parte da data (YYYY-MM-DD) para evitar erro de fuso horário
    const [sy, sm, sd] = start.split('T')[0].split('-').map(Number)
    const [ey, em, ed] = end.split('T')[0].split('-').map(Number)

    const startUTC = new Date(Date.UTC(sy, sm - 1, sd))
    const endUTC = new Date(Date.UTC(ey, em - 1, ed))

    let count = 0
    let cur = new Date(startUTC)

    while (cur <= endUTC) {
      const day = cur.getUTCDay()
      if (day !== 0 && day !== 6) count++
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return Math.max(0, count - 1)
  }

  function getResolvedAt(ticket: any): string | null {
    // 1. Resolução global explícita (mais confiável)
    const dataGlobal = ticket.custom_data?.resolucao_global?.data_resolucao
    if (dataGlobal) return dataGlobal

    // 2. Baixa por itens: pega a data mais recente entre os itens concluídos/devolvidos
    const itens = ticket.custom_data?.itens_tabela
    if (Array.isArray(itens) && itens.length > 0) {
      const datas = itens
        .filter((i: any) => i.resolucao?.data_baixa)
        .map((i: any) => i.resolucao.data_baixa as string)
      if (datas.length > 0) return datas.sort().at(-1)!
    }

    return null
  }

  const processMetrics = () => {
    const categories: any = {}
    tickets.forEach(ticket => {
        const cat = ticket.category || 'Outros'
        if (!categories[cat]) {
            categories[cat] = { total: 0, aberto: 0, em_andamento: 0, resolvido: 0, devolvida: 0, somaDiasUteis: 0, qtdResolvidosComData: 0 }
        }
        categories[cat].total++
        if (ticket.status === 'aberto') categories[cat].aberto++
        if (ticket.status === 'em_andamento') categories[cat].em_andamento++
        if (ticket.status === 'devolvida') categories[cat].devolvida++
        if (ticket.status === 'resolvido' || ticket.status === 'concluido') {
            categories[cat].resolvido++
            const dataFim = getResolvedAt(ticket)
            if (dataFim) {
              const dias = countBusinessDays(ticket.created_at, dataFim)
              categories[cat].somaDiasUteis += dias
              categories[cat].qtdResolvidosComData++
            }
        }
    })
    return categories
  }

  const metrics = processMetrics()
  const categoryKeys = Object.keys(metrics).sort()

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <Link href="/dashboard">
                <Button variant="ghost" className="pl-0 text-gray-500 hover:text-gray-900 gap-2 mb-2">
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
            </Link>
            <h1 className="text-3xl font-bold text-blue-900">Indicadores de SLA</h1>
            <p className="text-gray-500 text-sm">Acompanhe o volume e o tempo médio de atendimento.</p>
        </div>
        <div className="flex items-end gap-2 bg-gray-50 p-3 rounded-lg border shadow-sm">
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Início</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs bg-white"/>
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Fim</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs bg-white"/>
            </div>
            <Button size="sm" variant="secondary" onClick={fetchData}>
                <Filter className="w-4 h-4"/>
            </Button>
        </div>
      </div>

      {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Activity className="animate-pulse w-8 h-8"/>
              <span>Calculando métricas...</span>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoryKeys.length === 0 && <p className="text-gray-500 col-span-3 text-center">Nenhum dado encontrado.</p>}
            {categoryKeys.map((cat) => {
                const data = metrics[cat]
                let mediaDisplay = "0.0"
                let isHigh = false
                
                if (data.qtdResolvidosComData > 0) {
                    const media = data.somaDiasUteis / data.qtdResolvidosComData
                    if (media < 1) {
                        mediaDisplay = "< 1" 
                    } else {
                        mediaDisplay = media.toFixed(1)
                        if (media > 5) isHigh = true
                    }
                }

                return (
                    <Card key={cat} className="border-t-4 border-t-[#F3C843] shadow-md hover:shadow-lg transition-shadow bg-gray-50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold text-gray-800 flex justify-between items-center">
                                {cat}
                                <span className="text-sm font-bold text-gray-600 bg-white px-3 py-1 rounded border border-gray-200">
                                    Total: {data.total}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="bg-yellow-100/50 p-2 rounded border border-yellow-200 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-yellow-700">{data.aberto}</span>
                                    <span className="text-[10px] uppercase font-bold text-yellow-800 flex items-center gap-1"><AlertCircle size={10}/> Abertos</span>
                                </div>
                                <div className="bg-blue-100/50 p-2 rounded border border-blue-200 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-blue-700">{data.em_andamento}</span>
                                    <span className="text-[10px] uppercase font-bold text-blue-800 flex items-center gap-1"><Clock size={10}/> Andamento</span>
                                </div>
                                <div className="bg-orange-100/50 p-2 rounded border border-orange-200 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-orange-700">{data.devolvida}</span>
                                    <span className="text-[10px] uppercase font-bold text-orange-800 flex items-center gap-1"><RotateCcw size={10}/> Devolvido</span>
                                </div>
                                <div className="bg-green-100/50 p-2 rounded border border-green-200 flex flex-col items-center">
                                    <span className="text-2xl font-bold text-green-700">{data.resolvido}</span>
                                    <span className="text-[10px] uppercase font-bold text-green-800 flex items-center gap-1"><CheckCircle2 size={10}/> Concluído</span>
                                </div>
                            </div>
                            <div className="border-t border-gray-200 pt-3 mt-2">
                                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Prazo Médio (Dias Úteis)</p>
                                <div className="flex items-baseline gap-2">
                                    <CalendarDays className={`w-5 h-5 ${isHigh ? 'text-red-500' : 'text-gray-400'}`} />
                                    <span className={`text-3xl font-black ${isHigh ? 'text-red-600' : 'text-gray-800'}`}>
                                        {mediaDisplay}
                                    </span>
                                    <span className="text-xs text-gray-400">dias / solicitação</span>
                                </div>
                                {isHigh && <p className="text-[10px] text-red-500 mt-1 font-bold">⚠️ Atenção: Prazo acima da média esperada.</p>}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
          </div>
      )}
    </div>
  )
}