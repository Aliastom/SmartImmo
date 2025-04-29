'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { useState, useEffect, useRef } from 'react'

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: '📊' },
  { name: 'Biens', href: '/properties', icon: '🏠' },
  { name: 'Locataires', href: '/tenants', icon: '👥' },
  { name: 'Transactions', href: '/transactions', icon: '💰' },
  { name: 'Documents', href: '/documents', icon: '📁' },
  { name: 'Régimes Fiscaux', href: '/regimes', icon: '📋' },
  { name: 'Impôts', href: '/impots-premium', icon: '📑' },
  { name: 'Profil', href: '/profile', icon: '👤' },
]

export function Sidebar() {
  const pathname = usePathname()
  const supabase = createClientComponentClient()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [user, setUser] = useState<{ email: string; fullName?: string; avatarUrl?: string } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuDirection, setMenuDirection] = useState<'up'|'down'>('down')
  const [isAdmin, setIsAdmin] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || undefined,
          avatarUrl: session.user.user_metadata?.avatar_url || undefined,
        })
      } else {
        setUser(null)
      }
    }
    fetchUser()
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || undefined,
          avatarUrl: session.user.user_metadata?.avatar_url || undefined,
        })
      } else {
        setUser(null)
      }
    })
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data: users } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(users && users.role === 'admin');
    }
    checkAdmin();
    // Écoute les changements d'authentification
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAdmin();
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (menuOpen && profileRef.current) {
      const rect = profileRef.current.getBoundingClientRect()
      // Si le menu risque de dépasser le bas de l'écran, on l'ouvre vers le haut
      if (window.innerHeight - rect.bottom < 120) {
        setMenuDirection('up')
      } else {
        setMenuDirection('down')
      }
    }
  }, [menuOpen])

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
            style={{ height: 'auto' }} 
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
            style={{ width: 'auto', height: 'auto' }} 
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
        {isAdmin && (
          <div
            className="my-1"
          >
            <Link
              href="/admin"
              className={cn(
                'group flex items-center px-4 py-3 text-sm font-medium rounded-md transition-all',
                pathname.startsWith('/admin')
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-indigo-500/30 hover:text-white'
              )}
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
            >
              <span className="mr-3">
                🛠️
              </span>
              Admin
            </Link>
          </div>
        )}
      </nav>
      {user && (
        <div className="px-4 pb-4 border-t border-gray-800 mb-2 mt-2 flex flex-col items-start relative" ref={profileRef}>
          <button
            className="flex items-center gap-3 w-full focus:outline-none hover:bg-white/10 rounded-lg p-1.5 transition"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            tabIndex={0}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="rounded-full w-10 h-10 object-cover border-2 border-gray-700" />
            ) : (
              <div className="rounded-full bg-gradient-to-br from-indigo-600 to-blue-400 flex items-center justify-center w-10 h-10 text-lg text-white font-bold uppercase">
                {user.fullName ? user.fullName.split(' ').map(w=>w[0]).join('').slice(0,2) : user.email[0]}
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-white text-sm font-semibold leading-tight">{user.fullName || user.email}</span>
              <span className="text-gray-400 text-xs leading-tight">{user.email}</span>
            </div>
            <svg className={`ml-auto w-4 h-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </button>
          {menuOpen && (
            <>
              {/* Backdrop pour fermer le menu au clic extérieur */}
              <div
                className="fixed inset-0 z-[9998] cursor-default"
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className={`absolute left-0 right-0 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-[9999] animate-fade-in flex flex-col ${menuDirection==='up' ? 'bottom-14 mb-2' : 'mt-2 top-full'}`}
                style={{ minWidth: 180 }}
                tabIndex={-1}
                role="menu"
              >
                <Link href="/profile" className="px-4 py-2 text-sm text-gray-100 hover:bg-white/10 rounded-t-lg transition" tabIndex={0} onClick={()=>setMenuOpen(false)}>
                  Mon profil
                </Link>
                <button
                  className="px-4 py-2 text-sm text-red-400 hover:bg-red-600 hover:text-white rounded-b-lg text-left transition"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                  tabIndex={0}
                >
                  Se déconnecter
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
