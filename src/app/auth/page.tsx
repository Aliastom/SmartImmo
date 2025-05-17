'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { SmartImmoLogo } from '@/components/ui/logo';
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion';

import { Suspense } from "react";

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push(redirectTo || '/dashboard')
      } else {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [redirectTo])

  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            redirect_to: redirectTo || '/dashboard',
          },
        },
      })

      if (error) throw error
    } catch (error) {
      console.error('Error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-pink-100">
        <div className="text-center text-lg font-medium text-gray-700 animate-pulse">Chargement...</div>
      </div>
    )
  }

  return (
  <Suspense fallback={<div>Chargement...</div>}>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-pink-100">
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
            className="mb-4"
          >
            <SmartImmoLogo size="lg" />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-gray-900 text-center">Bienvenue sur <span className="text-blue-700">GestionImmo</span></h2>
          <p className="mt-2 text-center text-base text-gray-600">Connecte-toi pour gérer tes biens en toute simplicité.</p>
        </div>
        <Button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 py-5 text-base font-semibold bg-white border border-gray-300 hover:bg-blue-50 hover:border-blue-400 transition rounded-xl shadow-sm"
        >
          <svg width="24" height="24" viewBox="0 0 48 48" className="mr-2"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.1 1.53 7.5 2.82l5.54-5.39C33.66 4.43 29.34 2.5 24 2.5 14.82 2.5 6.98 8.67 3.68 16.44l6.44 5.01C12.02 15.14 17.52 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.21-.43-4.73H24v9.23h12.41c-.54 2.93-2.2 5.42-4.7 7.11l7.27 5.65C43.98 37.19 46.1 31.39 46.1 24.5z"/><path fill="#FBBC05" d="M10.12 28.09a14.51 14.51 0 0 1 0-8.18l-6.44-5.01a23.98 23.98 0 0 0 0 18.2l6.44-5.01z"/><path fill="#EA4335" d="M24 44.5c6.48 0 11.92-2.14 15.9-5.85l-7.27-5.65c-2.01 1.37-4.62 2.2-8.63 2.2-6.48 0-11.98-5.64-13.88-13.31l-6.44 5.01C6.98 40.33 14.82 46.5 24 46.5z"/></g></svg>
          Se connecter avec Google
        </Button>
        <div className="mt-8 text-center text-xs text-gray-400">Connexion sécurisée via Google OAuth</div>
      </motion.div>
    </div>
  </Suspense>
)
}
