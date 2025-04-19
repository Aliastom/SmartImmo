'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: '📊' },
  { name: 'Biens', href: '/properties', icon: '🏠' },
  { name: 'Locataires', href: '/tenants', icon: '👥' },
  { name: 'Transactions', href: '/transactions', icon: '💰' },
  { name: 'Documents', href: '/documents', icon: '📁' },
  { name: 'Régimes Fiscaux', href: '/regimes', icon: '📋' },
  { name: 'Impôts', href: '/impots', icon: '📑' },
  { name: 'Profil', href: '/profile', icon: '👤' },
]

export function Sidebar() {
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Détecter la taille de l'écran côté client uniquement
  useEffect(() => {
    // Définir immédiatement comme mobile pour éviter le flash de contenu
    setIsMobile(true)
    
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }
    
    // Exécuter après le premier rendu pour obtenir la vraie taille
    checkIfMobile()
    window.addEventListener('resize', checkIfMobile)
    
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // Si mobile et menu fermé, afficher seulement le bouton hamburger
  if (isMobile && !isMobileMenuOpen) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] p-3 flex items-center bg-white shadow-sm h-12">
        <Button
          variant="outline"
          size="icon"
          className="bg-indigo-600 hover:bg-indigo-700 text-white border-none shadow-md h-7 w-7 flex items-center justify-center"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        <div className="ml-3">
          <Image 
            src="/images/logo_mobile.png" 
            alt="SmartImmo Logo" 
            width={35} 
            height={10} 
            priority
          />
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`${isMobile ? 'fixed inset-0 z-50' : 'relative'} flex h-screen flex-col bg-[#1a1f36] text-white ${isMobile ? 'w-full' : 'w-64 min-w-64'}`}
    >
      <div className="flex justify-between items-center p-4">
        <div className="flex-1 flex justify-center">
          <Image 
            src="/images/logo.png" 
            alt="SmartImmo Logo" 
            width={80} 
            height={24} 
            priority
          />
        </div>
        
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-10 w-10"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>
      
      <nav className="flex-1 space-y-1 px-2 overflow-y-auto">
        {navigation.map((item, index) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <div
              key={item.name}
              className="my-1"
            >
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-indigo-500/30 hover:text-white'
                )}
                onClick={() => isMobile && setIsMobileMenuOpen(false)}
              >
                <span className="mr-3">
                  {item.icon}
                </span>
                {item.name}
              </Link>
            </div>
          )
        })}
      </nav>
      <div className="p-4">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-white/10"
          onClick={handleSignOut}
        >
          <span className="mr-3">
            👋
          </span>
          Se déconnecter
        </Button>
      </div>
    </div>
  )
}
