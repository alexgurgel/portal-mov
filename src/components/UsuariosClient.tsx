'use client'

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Search, ShieldAlert, UserCheck, UserX } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Profile = {
  id: string
  full_name: string | null
  email: string | null
  role: string
  department_id: number | null
  ativo: boolean
}

type Department = {
  id: number
  name: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  agent: "Atendente",
  user: "Usuário",
}

export default function UsuariosClient() {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [departmentFilter, setDepartmentFilter] = useState("todos")
  const [roleFilter, setRoleFilter] = useState("todas")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [currentUserId, setCurrentUserId] = useState("")

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        setLoading(false)
        return
      }

      setAuthorized(true)
      setCurrentUserId(user.id)

      const [{ data: profilesData }, { data: departmentsData }] = await Promise.all([
        supabase.from('profiles').select('*').order('full_name'),
        supabase.from('departments').select('*').order('name'),
      ])

      setProfiles(profilesData || [])
      setDepartments(departmentsData || [])
      setLoading(false)
    }
    init()
  }, [])

  async function updateRole(id: string, role: string) {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, role } : p))
    await supabase.from('profiles').update({ role }).eq('id', id)
  }

  async function updateDepartment(id: string, value: string) {
    const department_id = value === "none" ? null : Number(value)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, department_id } : p))
    await supabase.from('profiles').update({ department_id }).eq('id', id)
  }

  // Inativar bloqueia o login do usuário (ex-funcionários) sem apagar o
  // histórico de chamados abertos por ele.
  async function updateAtivo(profile: Profile, ativo: boolean) {
    if (profile.id === currentUserId) {
      return alert("Você não pode inativar o seu próprio usuário.")
    }

    const nome = profile.full_name || profile.email || 'este usuário'
    if (!ativo && !confirm(`Inativar ${nome}? A pessoa perde o acesso ao portal no próximo login, mas os chamados dela continuam no sistema.`)) {
      return
    }

    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, ativo } : p))
    const { error } = await supabase.from('profiles').update({ ativo }).eq('id', profile.id)
    if (error) {
      setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, ativo: !ativo } : p))
      alert("Erro ao alterar o status: " + error.message)
    }
  }

  const nomeSetor = (departmentId: number | null) =>
    departments.find(d => d.id === departmentId)?.name || ''

  // Pesquisa por nome, e-mail, setor ou permissão do usuário.
  const filtered = profiles.filter(p => {
    const term = searchTerm.trim().toLowerCase()
    const campos = [
      p.full_name || '',
      p.email || '',
      nomeSetor(p.department_id),
      ROLE_LABELS[p.role] || p.role || '',
    ]
    const matchBusca = term === '' || campos.some(campo => campo.toLowerCase().includes(term))

    const matchSetor =
      departmentFilter === 'todos' ||
      (departmentFilter === 'sem_setor' ? p.department_id === null : String(p.department_id) === departmentFilter)

    const matchPermissao = roleFilter === 'todas' || p.role === roleFilter

    const matchStatus =
      statusFilter === 'todos' ||
      (statusFilter === 'ativos' ? p.ativo !== false : p.ativo === false)

    return matchBusca && matchSetor && matchPermissao && matchStatus
  })

  const inativosCount = profiles.filter(p => p.ativo === false).length

  const temFiltroAtivo =
    searchTerm !== '' || departmentFilter !== 'todos' || roleFilter !== 'todas' || statusFilter !== 'todos'

  if (loading) {
    return <div className="p-10 text-center text-gray-400 text-sm">Carregando...</div>
  }

  if (!authorized) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
        <ShieldAlert className="w-10 h-10 text-red-400" />
        <p className="font-bold text-gray-700">Acesso restrito a administradores.</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Usuários</h1>
        <p className="text-gray-500 text-sm mt-1">
          Consulte o e-mail cadastrado de cada usuário e defina seu setor e nível de acesso
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Pesquisar</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Nome, e-mail, setor ou permissão..."
                className="pl-8 bg-gray-50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="w-full md:w-56">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Setor</label>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                <SelectItem value="sem_setor">— Sem setor —</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-48">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Permissão</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-44">
            <label className="text-xs font-bold text-gray-500 mb-1 block">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-gray-50"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Somente ativos</SelectItem>
                <SelectItem value="inativos">Somente inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {filtered.length} {filtered.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
            {inativosCount > 0 && (
              <span className="text-gray-400"> · {inativosCount} inativo{inativosCount > 1 ? 's' : ''} no total</span>
            )}
          </span>
          {temFiltroAtivo && (
            <button
              onClick={() => { setSearchTerm(''); setDepartmentFilter('todos'); setRoleFilter('todas'); setStatusFilter('todos') }}
              className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3 w-[200px]">Setor</th>
                <th className="px-4 py-3 w-[180px]">Permissão</th>
                <th className="px-4 py-3 w-[170px]">Acesso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : filtered.map(profile => (
                <tr key={profile.id} className={`border-b hover:bg-gray-50 ${profile.ativo === false ? 'bg-gray-50/70 text-gray-400' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className={profile.ativo === false ? 'text-gray-400 line-through' : ''}>
                      {profile.full_name || '—'}
                    </span>
                  </td>
                  <td className={`px-4 py-3 ${profile.ativo === false ? 'text-gray-400' : 'text-gray-600'}`}>{profile.email}</td>
                  <td className="px-4 py-3">
                    <Select
                      value={profile.department_id ? String(profile.department_id) : "none"}
                      onValueChange={val => updateDepartment(profile.id, val)}
                    >
                      <SelectTrigger className="bg-gray-50 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sem setor —</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Select value={profile.role} onValueChange={val => updateRole(profile.id, val)}>
                      <SelectTrigger className="bg-gray-50 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {profile.id === currentUserId ? (
                      <span className="text-[11px] text-gray-400 italic">Você</span>
                    ) : profile.ativo === false ? (
                      <button
                        onClick={() => updateAtivo(profile, true)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-gray-300 bg-white text-gray-600 text-xs font-bold hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-colors w-full justify-center"
                        title="Reativar o acesso deste usuário"
                      >
                        <UserX size={14} /> Inativo — Reativar
                      </button>
                    ) : (
                      <button
                        onClick={() => updateAtivo(profile, false)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-green-200 bg-green-50 text-green-700 text-xs font-bold hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors w-full justify-center"
                        title="Inativar (bloqueia o acesso ao portal)"
                      >
                        <UserCheck size={14} /> Ativo — Inativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
