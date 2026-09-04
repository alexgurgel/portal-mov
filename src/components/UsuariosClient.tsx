'use client'

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Input } from "@/components/ui/input"
import { Search, ShieldAlert } from "lucide-react"
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

    return matchBusca && matchSetor && matchPermissao
  })

  const temFiltroAtivo = searchTerm !== '' || departmentFilter !== 'todos' || roleFilter !== 'todas'

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
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 font-medium">
            {filtered.length} {filtered.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}
          </span>
          {temFiltroAtivo && (
            <button
              onClick={() => { setSearchTerm(''); setDepartmentFilter('todos'); setRoleFilter('todas') }}
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : filtered.map(profile => (
                <tr key={profile.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{profile.full_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{profile.email}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
