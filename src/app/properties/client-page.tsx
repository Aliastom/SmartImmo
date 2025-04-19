'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { PropertyModal } from './components/property-modal'
import { useToast } from '@/components/ui/use-toast'
import { Database } from '@/types/database'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { PageTransition, LoadingSpinner, AnimatedCard } from '@/components/ui/animated'
import { PropertyRegimeCardMini } from '@/components/property/property-regime-card-mini';

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [properties, setProperties] = useState<PropertyWithTenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()
  const router = useRouter()

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
        .select('*')
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

  if (isLoading) {
    return (
      <PageTransition className="container py-6 md:py-10">
        <LoadingSpinner className="h-64" size={60} />
      </PageTransition>
    )
  }

  return (
    <PageTransition className="container py-4 md:py-10 px-4 md:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-10 gap-4">
        <motion.h1 
          className="text-2xl md:text-3xl font-bold"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Mes biens immobiliers
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <Button onClick={() => setIsModalOpen(true)} className="bg-black hover:bg-black/80 text-white w-full md:w-auto">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter un bien
          </Button>
        </motion.div>
      </div>

      {properties.length === 0 ? (
        <motion.div 
          className="text-center text-gray-500 py-6 md:py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <p className="text-lg mb-4">Vous n&apos;avez pas encore de biens.</p>
          <Button onClick={() => setIsModalOpen(true)} className="bg-black hover:bg-black/80 text-white">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-4 w-4 mr-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter un bien
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {properties.map((property, index) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (index * 0.05), duration: 0.3 }}
              whileHover={{ 
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="cursor-pointer"
              onClick={() => router.push(`/properties/${property.id}`)}
            >
              <AnimatedCard className="overflow-hidden h-full">
                <div className="relative w-full h-36 md:h-48">
                  <img
                    src={property.image_url || '/images/placeholder-property.jpg'}
                    alt={property.name}
                    className="object-cover h-full w-full"
                  />
                </div>
                <div className="p-4 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold mb-2 md:mb-3">{property.name}</h3>
                  <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">{property.address}</p>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 md:mb-4 gap-2 md:gap-0">
                    <div className="text-xs md:text-sm text-gray-500">
                      {property.area} m² • {property.bedrooms} ch • {property.bathrooms} sdb
                    </div>
                    <div className="font-semibold text-green-600 text-sm md:text-base">
                      {property.rent}€/mois
                    </div>
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-500 text-xs mr-2">Régime fiscal :</span>
                    <PropertyRegimeCardMini propertyRegimeId={property.property_regime_id || null} />
                  </div>
                  <div className="flex justify-between items-center">
                    <motion.span 
                      className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full text-xs md:text-sm ${
                        property.status === 'vacant' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}
                      whileHover={{ scale: 1.05 }}
                    >
                      {property.status === 'vacant' ? 'Disponible' : 'Loué'}
                    </motion.span>
                    <span className="text-gray-500 text-xs md:text-sm">
                      Valeur : {property.value}€
                    </span>
                  </div>
                  {property.status === 'rented' && property.tenant && (
                    <div className="mt-3 md:mt-4 text-xs md:text-sm">
                      <span className="text-gray-500">Loué par : </span>
                      <span className="font-medium">{property.tenant.first_name} {property.tenant.last_name}</span>
                    </div>
                  )}
                </div>
              </AnimatedCard>
            </motion.div>
          ))}
        </div>
      )}

      <PropertyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPropertyUpdated={fetchProperties}
      />
    </PageTransition>
  )
}
