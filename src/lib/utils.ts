import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Data e hora de abertura do chamado (ticket #2095).
export function formatHoraAbertura(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
