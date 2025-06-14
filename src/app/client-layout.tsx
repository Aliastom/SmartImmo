'use client'

import { Toaster } from "@/components/ui/toaster"

import { FloatingMenu } from '@/components/FloatingMenu'
import { useState, useEffect } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AuthProvider } from '@/lib/context/auth-context';

const supabase = createClientComponentClient();

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  useEffect(() => {
    if (isMobile) {
      // Supprimer l'ancien header s'il existe
      const existingHeader = document.getElementById('mobile-logo-header')
      if (existingHeader) {
        document.body.removeChild(existingHeader)
      }
      
      // Ne pas ajouter de header, car nous allons placer le logo à côté du menu hamburger
    } else {
      // Supprimer le header sur desktop
      const existingHeader = document.getElementById('mobile-logo-header')
      if (existingHeader) {
        document.body.removeChild(existingHeader)
      }
    }
    
    return () => {
      // Nettoyer lors du démontage
      const existingHeader = document.getElementById('mobile-logo-header')
      if (existingHeader) {
        document.body.removeChild(existingHeader)
      }
    }
  }, [isMobile])

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <div className="flex flex-col md:flex-row h-screen">
          <FloatingMenu />
          <div className="flex-1 flex flex-col w-full">
            {/* SUPPRESSION DU NAVBAR GLOBAL */}
            {/* {!isMobile && <Navbar />} */}
            <main className={`flex-1 overflow-y-auto p-2 md:p-4 pt-14 md:pt-14 ${isMobile ? 'mt-12' : ''}`}>
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </AuthProvider>
    </SessionContextProvider>
  )
}
