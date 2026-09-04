'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link' // <--- Importante para o link funcionar

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  // Usuários inativados pelo admin (ex-funcionários) não entram no portal.
  const usuarioEstaAtivo = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('ativo')
      .eq('id', userId)
      .single()

    return profile?.ativo !== false
  }

  // Verifica se já está logado ao abrir a página
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (await usuarioEstaAtivo(session.user.id)) {
          router.push('/dashboard')
        } else {
          await supabase.auth.signOut()
          setErrorMsg('Seu acesso ao portal foi desativado. Procure o administrador.')
        }
      }
    }
    checkUser()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setErrorMsg('Erro ao entrar: Verifique e-mail e senha.')
      setLoading(false)
      return
    }

    if (data.user && !(await usuarioEstaAtivo(data.user.id))) {
      await supabase.auth.signOut()
      setErrorMsg('Seu acesso ao portal foi desativado. Procure o administrador.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        
        {/* Cabeçalho do Card */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Grupo MOV</h1>
          <p className="text-gray-500 mt-2">Portal de Serviços</p>
        </div>

        {/* Mensagem de Erro (se houver) */}
        {errorMsg && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="******"
            />
            <div className="text-right mt-1">
              <Link href="/forgot-password" className="text-xs font-medium text-yellow-600 hover:text-yellow-500 hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Entrando...' : 'Acessar Portal'}
          </button>
        </form>

        {/* --- AQUI ESTÁ A PARTE NOVA: O LINK PARA CADASTRO --- */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Ainda não tem acesso?{' '}
            <Link href="/register" className="font-medium text-yellow-600 hover:text-yellow-500 hover:underline">
              Crie sua conta aqui
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}