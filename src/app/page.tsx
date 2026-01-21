'use client'
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Erro ao entrar: " + error.message)
      setLoading(false)
    } else {
      // Manda para a pasta dashboard, onde a Sidebar mora
      router.push("/dashboard")
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Grupo MOV</CardTitle>
          <CardDescription className="text-center">
            Helpdesk e Solicitações Internas
          </CardDescription>
        </CardHeader>
        
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
        </CardContent>
        
        <CardFooter>
          <Button className="w-full bg-[#F3C843] text-black hover:bg-[#d4ac33] font-bold" onClick={handleLogin} disabled={loading}>
            {loading ? "Entrando..." : "Acessar Portal"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}