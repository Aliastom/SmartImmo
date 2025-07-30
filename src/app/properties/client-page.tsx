'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { PropertyModal } from './components/property-modal'
import { useToast } from '@/components/ui/use-toast'
import { Database } from '@/types/database'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/animated'
import { PropertyRegimeCardMini } from './[id]/components/property-regime-card-mini';
import TransactionFab from './components/transaction-fab';
import TransactionModal from '../transactions/transaction-modal';
import { Button } from '@/components/ui/button'
import { SearchInput } from './SearchInput';
import { Eraser, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import '../transactions/transactions-theme.css';

type Property = Database['public']['Tables']['properties']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']

// Type étendu pour les propriétés avec locataire
interface PropertyWithTenant extends Property {
  tenant?: {
    id: string;
    first_name: string;
    last_name: string;
  }
}

export function ClientPage() {
  // ...
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionPropertyId, setTransactionPropertyId] = useState<string|null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [properties, setProperties] = useState<PropertyWithTenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('propertyViewMode') as 'detailed' | 'compact') || 'detailed';
    }
    return 'detailed';
  });

  // Sauvegarde la vue sélectionnée à chaque changement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('propertyViewMode', viewMode);
    }
  }, [viewMode]);
  // Pour reset animé
  const hasActiveFilters = searchQuery.trim() !== '' || filterStatus !== 'all';

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

  const fetchProperties = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Récupérer les biens
      const { data: properties, error } = await supabase
        .from('properties')
        .select('id, name, status, address, created_at, category')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Récupérer les locataires pour les biens loués
      const rentedProperties = properties.filter(p => p.status === 'rented')
      
      if (rentedProperties.length > 0) {
        const { data: leases, error: leasesError } = await supabase
          .from('leases')
          .select(`
            *,
            tenants:tenant_id (
              id,
              first_name,
              last_name
            )
          `)
          .in('property_id', rentedProperties.map(p => p.id))
          .eq('user_id', session.user.id)

        if (leasesError) throw leasesError

        // Ajouter les informations des locataires aux biens loués
        const propertiesWithTenants = properties.map(property => {
          if (property.status === 'rented') {
            const propertyLease = leases.find(lease => lease.property_id === property.id)
            if (propertyLease) {
              return {
                ...property,
                tenant: propertyLease.tenants
              }
            }
          }
          return property
        })

        setProperties(propertiesWithTenants)
      } else {
        setProperties(properties)
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les biens",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [supabase, toast, router])

  useEffect(() => {
    fetchProperties()
  }, [fetchProperties])

  return (
    <>
      <PageTransition className="min-h-screen flex flex-col gap-10 px-0 md:px-0">
      <PageHeader
        title="Mes biens immobiliers"
        buttonText="Ajouter un bien"
        buttonIcon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2 btn-add-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
        onButtonClick={() => setIsModalOpen(true)}
        className="mb-6 mt-2 px-0"
      />
      {/* BARRE DE FILTRES harmonisée Transactions */}
      <div className="filter-bar-glass flex flex-wrap gap-3 md:gap-5 items-center mb-6">
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-2 py-1 rounded-md border ${viewMode === 'detailed' ? 'bg-blue-100 border-blue-400 text-blue-700 font-bold' : 'bg-white border-gray-300 text-gray-500'} transition`}
            title="Vue détaillée"
            aria-label="Vue détaillée"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`px-2 py-1 rounded-md border ${viewMode === 'compact' ? 'bg-blue-100 border-blue-400 text-blue-700 font-bold' : 'bg-white border-gray-300 text-gray-500'} transition`}
            title="Vue compacte"
            aria-label="Vue compacte"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="3" rx="1.5"/><rect x="3" y="10.5" width="18" height="3" rx="1.5"/><rect x="3" y="17" width="18" height="3" rx="1.5"/></svg>
          </button>
        </div>
        <div className="relative flex items-center" style={{ minWidth: '240px', maxWidth: '340px', flex: '1 1 240px' }}>
          <span className="input-search-icon text-blue-400">
            <svg width="20" height="20" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          </span>
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="input-glass input-search pr-4 py-2 w-full"
          />
        </div>
        <span className="text-gray-500 flex items-center gap-1 min-w-max">
          <Filter className="text-blue-400" size={20} strokeWidth={2} /> Filtrer :
        </span>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input-glass px-4 py-2 text-sm min-w-[140px]"
        >
          <option value="all">Tous les statuts</option>
          <option value="vacant">Disponible</option>
          <option value="rented">Loué</option>
        </select>
        {/* Bouton reset harmonisé Transactions, collé au dernier filtre */}
        {hasActiveFilters && (
          <button
            className={`reset-filters-btn ml-2 p-1 rounded-full transition-opacity duration-200 reset-pulse-anim opacity-90 cursor-pointer`}
            style={{ background: 'none', border: '1.2px solid #3b82f6' }}
            onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
            title="Réinitialiser les filtres"
            aria-label="Réinitialiser les filtres"
            tabIndex={0}
            type="button"
          >
            <Eraser
              size={20}
              className={'text-blue-500 drop-shadow-[0_0_6px_#3b82f6cc]'}
              style={{ background: 'none', fill: 'none' }}
            />
          </button>
        )}
      </div>

      {/* CONTENU PRINCIPAL : grilles, loading, etc. */}
      {isLoading ? (
        <div className="flex justify-center items-center min-h-[200px] text-gray-400 text-lg">Chargement...</div>
      ) : properties.filter((property) => {
        // Filtrage conditionnel
        const matchSearch = property.name?.toLowerCase().includes(searchQuery.toLowerCase()) || property.address?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = filterStatus === 'all' || property.status === filterStatus;
        // Ajoute d'autres conditions de filtre ici si besoin
        return matchSearch && matchStatus;
      }).length === 0 ? (
        <div className="flex flex-col items-center py-8">
          <p className="text-lg mb-4">Aucun bien ne correspond à la recherche ou au filtre.</p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="btn-glass w-fit btn-animated-yellow"
            style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', marginBottom: '0.08em' }}
          >
            <span className="btn-animated-yellow-bg" aria-hidden="true"></span>
            <span className="relative flex items-center z-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2 btn-add-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un bien
            </span>
          </Button>
        </div>
      ) : (
        viewMode === 'detailed' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {properties.filter((property) => {
              const matchSearch = property.name?.toLowerCase().includes(searchQuery.toLowerCase()) || property.address?.toLowerCase().includes(searchQuery.toLowerCase());
              const matchStatus = filterStatus === 'all' || property.status === filterStatus;
              return matchSearch && matchStatus;
            }).map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (index * 0.05), duration: 0.3 }}
                whileHover={{
                  y: [0, -8, 0, 8, 0],
                  rotate: [0, 3, -3, 3, 0],
                  transition: { repeat: Infinity, duration: 0.7, ease: "easeInOut" }
                }}
                className="cursor-pointer"
                onClick={() => router.push(`/properties/${property.id}`)}
              >
                <div className="glass-card border border-gray-200 bg-white/60 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden h-full"
  style={{ boxShadow: '0 8px 32px 0 #181a3b12', border: '1.5px solid #e5e7eb' }}
>
  <div className="relative w-full h-36 md:h-48">
    <span className="flex items-center justify-center w-full h-full text-5xl">
      {(() => {
        switch (property.category) {
          case 'Résidence principale': return '🏠';
          case 'Résidence secondaire': return '🏡';
          case 'Bien locatif': return '🏢';
          case 'Saisonnière/Airbnb': return '🌴';
          case 'En vente': return '🏷️';
          case 'Autre': return '❓';
          default: return '❓';
        }
      })()}
    </span>
  </div>
  <div className="p-4 md:p-6">
    <div className="flex justify-between items-center mb-2">
      <h3 className="text-base md:text-lg font-semibold text-[#181a3b]">{property.name}</h3>
      <TransactionFab onClick={(e) => { setTransactionModalOpen(true); setTransactionPropertyId(property.id); }} />
    </div>
    <p className="text-gray-700 mb-3 md:mb-4 text-sm md:text-base">{property.address}</p>
    <div className="flex flex-wrap gap-2 items-center mb-2">
      <span className="text-xs text-gray-500">Régime fiscal :</span>
      <PropertyRegimeCardMini propertyRegimeId={property.property_regime_id || null} />
    </div>
    <div className="flex justify-between items-center">
      <span className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm ${property.status === 'vacant' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
        {property.status === 'vacant' ? 'Disponible' : 'Loué'}
      </span>
      <span className="text-gray-500 text-xs md:text-sm">
        {/* Autres infos/actions ici si besoin */}
      </span>
    </div>
    {property.status === 'rented' && property.tenant && (
      <div className="mt-3 md:mt-4 text-xs md:text-sm">
        <span className="text-gray-500">Loué par : </span>
        <span className="font-medium">{property.tenant.first_name} {property.tenant.last_name}</span>
      </div>
    )}
  </div>
</div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {properties.filter((property) => {
              const matchSearch = property.name?.toLowerCase().includes(searchQuery.toLowerCase()) || property.address?.toLowerCase().includes(searchQuery.toLowerCase());
              const matchStatus = filterStatus === 'all' || property.status === filterStatus;
              return matchSearch && matchStatus;
            }).map((property, index) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + (index * 0.03), duration: 0.18 }}
                whileHover={{ scale: 1.03 }}
                className="cursor-pointer"
                onClick={() => router.push(`/properties/${property.id}`)}
              >
                <div className="flex items-center gap-3 bg-white/80 border border-gray-200 rounded-xl shadow-sm px-3 py-2 min-h-[56px] hover:bg-blue-50 transition">
                  <div className="flex flex-col items-center justify-center w-14">
                    <span className="flex items-center justify-center w-12 h-12 text-3xl">
                      {(() => {
                        switch (property.category) {
                          case 'Résidence principale': return '🏠';
                          case 'Résidence secondaire': return '🏡';
                          case 'Bien locatif': return '🏢';
                          case 'Saisonnière/Airbnb': return '🌴';
                          case 'En vente': return '🏷️';
                          case 'Autre': return '❓';
                          default: return '❓';
                        }
                      })()}
                    </span>
                    {property.status === 'rented' && property.tenant && (
                      <div className="text-[11px] text-gray-700 font-medium mt-1 text-center w-full truncate">
                        {property.tenant.first_name} {property.tenant.last_name}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-base text-blue-900">{property.name}</div>
                    <div className="text-xs text-gray-500 truncate">{property.address}</div>
                  </div>
                  <div className="flex flex-col items-end ml-2">
                    <span className="font-bold text-blue-800 text-sm">{property.rent}€</span>
                    <TransactionFab onClick={(e) => { setTransactionModalOpen(true); setTransactionPropertyId(property.id); }} />
                    <span className={`text-xs mt-1 px-2 py-0.5 rounded-full ${property.status === 'vacant' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{property.status === 'vacant' ? 'Disponible' : 'Loué'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}
    </PageTransition>
    <PropertyModal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      onPropertyUpdated={fetchProperties}
    />
    <TransactionModal
      isOpen={transactionModalOpen}
      onClose={() => { setTransactionModalOpen(false); setTransactionPropertyId(null); }}
      propertyId={transactionPropertyId || undefined}
    />
    </>
  );
}
