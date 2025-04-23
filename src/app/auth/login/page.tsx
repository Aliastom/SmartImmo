'use client'

import { useAuth } from '@/lib/context/auth-context'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion';

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(email, password)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-white to-pink-100">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="backdrop-blur-xl bg-white/80 shadow-xl rounded-3xl p-8 w-full max-w-md border border-gray-100"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0.7, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="bg-blue-100 rounded-full p-3 mb-4 shadow-md"
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="3"/><path d="M16 3v4"/><path d="M8 3v4"/></svg>
          </motion.div>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">Bienvenue sur <span className="text-blue-700">SmartImmo</span></h2>
          <p className="mt-2 text-center text-base text-gray-600">Connecte-toi à ton espace pour accéder à ton tableau de bord.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-100 text-red-700 px-4 py-2 rounded text-sm mb-2 text-center"
              >
                {error}
              </motion.div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="mb-1 block">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-xl px-4 py-3 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="mb-1 block">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-xl px-4 py-3 border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
          </div>
          <div className="flex flex-col gap-4 mt-8">
            <Button type="submit" className="w-full rounded-xl py-4 text-base font-semibold shadow-md hover:bg-blue-600 hover:text-white transition" disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
            <div className="text-center text-sm">
              <span className="text-gray-600">Pas encore de compte ?</span>{' '}
              <Link href="/auth/register" className="text-indigo-600 hover:text-indigo-500 font-medium transition">
                S'inscrire
              </Link>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
