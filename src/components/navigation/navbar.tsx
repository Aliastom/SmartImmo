'use client'

import { useAuth } from '@/lib/context/auth-context'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import Image from 'next/image'

export function Navbar() {
  const { signOut } = useAuth()
  const [isMobile, setIsMobile] = useState(false)

  // Détecter la taille de l'écran
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

  return (
    <nav className="bg-white shadow-sm z-10">
      <div className="mx-auto px-4">
        <div className="flex h-16 items-center">
          {isMobile && (
            <>
              <div className="w-10 absolute left-4 top-4 z-20">
                {/* Espace réservé pour le bouton hamburger - maintenant vide */}
              </div>
              <div className="flex-1 flex justify-center items-center">
                <Image 
                  src="/images/logo.png" 
                  alt="SmartImmo Logo" 
                  width={100} 
                  height={30} 
                  priority
                />
              </div>
              <div className="w-10">
                {/* Espace équilibré à droite */}
              </div>
            </>
          )}
          {!isMobile && (
            <div className="ml-auto flex items-center space-x-2">
              <Button
                variant="ghost"
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="hidden md:inline">Se déconnecter</span>
                <span className="md:hidden">👋</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
