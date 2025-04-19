'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { motion } from 'framer-motion'
import { PageTransition, AnimatedCard, LoadingSpinner } from '@/components/ui/animated'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { CalendarIcon } from "lucide-react"

type Property = Database['public']['Tables']['properties']['Row'] & {
  type?: string;
}
type Tenant = Database['public']['Tables']['tenants']['Row']
type Lease = Database['public']['Tables']['leases']['Row']

export default function ChangeTenantPage() {
  const router = useRouter()
  const params = useParams()
  const propertyId = params.id as string
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()
  
  const [property, setProperty] = useState<Property | null>(null)
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [currentLease, setCurrentLease] = useState<Lease | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [leaseStart, setLeaseStart] = useState<Date>(new Date())
  const [leaseEnd, setLeaseEnd] = useState<Date | undefined>(undefined)
  const [rent, setRent] = useState<number>(0)
  const [deposit, setDeposit] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/auth/login')
          return
        }

        // Récupérer les détails de la propriété
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .eq('user_id', session.user.id)
          .single()

        if (propertyError) throw propertyError
        setProperty(propertyData)
        setRent(propertyData.rent || 0)
        setDeposit(propertyData.deposit || 0)

        // Récupérer le bail actuel et le locataire
        if (propertyData.status === 'rented') {
          const { data: leaseData, error: leaseError } = await supabase
            .from('leases')
            .select(`
              *,
              tenants:tenant_id (*)
            `)
            .eq('property_id', propertyId)
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (leaseError && leaseError.code !== 'PGRST116') {
            throw leaseError
          }

          if (leaseData) {
            setCurrentLease(leaseData)
            setCurrentTenant(leaseData.tenants as Tenant)
          }
        }

        // Récupérer tous les locataires disponibles
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .eq('user_id', session.user.id)
          .order('last_name', { ascending: true })

        if (tenantsError) throw tenantsError
        setTenants(tenantsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Erreur",
          description: "Impossible de charger les données",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [propertyId, router, supabase, toast])

  const handleChangeTenant = async () => {
    if (!selectedTenantId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un locataire",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/auth/login')
        return
      }

      // Si un bail existe déjà, le terminer
      if (currentLease) {
        const { error: updateLeaseError } = await supabase
          .from('leases')
          .update({
            lease_end: new Date().toISOString(),
            status: 'terminated'
          })
          .eq('id', currentLease.id)

        if (updateLeaseError) throw updateLeaseError
      }

      // Créer un nouveau bail
      const { data: newLease, error: leaseError } = await supabase
        .from('leases')
        .insert([
          {
            user_id: session.user.id,
            property_id: propertyId,
            tenant_id: selectedTenantId,
            lease_start: leaseStart.toISOString(),
            lease_end: leaseEnd ? leaseEnd.toISOString() : null,
            rent: rent,
            deposit: deposit,
            status: 'active'
          }
        ])
        .select()

      if (leaseError) throw leaseError

      // Mettre à jour le statut de la propriété
      const { error: propertyError } = await supabase
        .from('properties')
        .update({
          status: 'rented',
          rent: rent,
          deposit: deposit
        })
        .eq('id', propertyId)

      if (propertyError) throw propertyError

      toast({
        title: "Succès",
        description: "Le locataire a été changé avec succès"
      })

      // Rediriger vers la page de détail de la propriété
      router.push(`/properties/${propertyId}`)
    } catch (error) {
      console.error('Error changing tenant:', error)
      toast({
        title: "Erreur",
        description: "Impossible de changer le locataire",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtrer les locataires en fonction de la recherche
  const filteredTenants = tenants.filter(tenant => {
    const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  return (
    <PageTransition>
      <div className="container py-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <h1 className="text-3xl font-bold tracking-tight">Changement de locataire</h1>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              variant="outline" 
              onClick={() => router.push(`/properties/${propertyId}`)}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour au bien
            </Button>
          </motion.div>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size={60} />
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* Informations sur le bien */}
            <motion.div variants={itemVariants}>
              <AnimatedCard>
                <CardHeader>
                  <CardTitle>Informations sur le bien</CardTitle>
                  <CardDescription>
                    Détails de la propriété concernée par le changement de locataire
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nom</span>
                    <span className="font-medium">{property?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Adresse</span>
                    <span className="font-medium">{property?.address}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium">{property?.type || 'Non spécifié'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Statut</span>
                    <span className="font-medium">
                      {property?.status === 'rented' ? 'Loué' : 'Vacant'}
                    </span>
                  </div>
                  {property?.status === 'rented' && (
                    <>
                      <Separator className="my-2" />
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium">Locataire actuel</h3>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Nom</span>
                          <span className="font-medium">
                            {currentTenant?.first_name} {currentTenant?.last_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Début du bail</span>
                          <span className="font-medium">
                            {currentLease?.lease_start ? format(new Date(currentLease.lease_start), 'dd/MM/yyyy') : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Loyer actuel</span>
                          <span className="font-medium">
                            {currentLease?.rent ? `${currentLease.rent} €` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </AnimatedCard>
            </motion.div>

            {/* Nouveau locataire */}
            <motion.div variants={itemVariants}>
              <AnimatedCard>
                <CardHeader>
                  <CardTitle>Nouveau locataire</CardTitle>
                  <CardDescription>
                    Sélectionnez le nouveau locataire et les détails du bail
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="searchTenant">Rechercher un locataire</Label>
                    <Input
                      id="searchTenant"
                      placeholder="Rechercher par nom..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mb-2"
                    />
                    
                    <Label htmlFor="tenant">Sélectionner un locataire</Label>
                    <Select
                      value={selectedTenantId}
                      onValueChange={setSelectedTenantId}
                    >
                      <SelectTrigger id="tenant">
                        <SelectValue placeholder="Sélectionner un locataire" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredTenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            {tenant.first_name} {tenant.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-right mt-1">
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-sm"
                        onClick={() => router.push('/tenants/new?returnTo=' + encodeURIComponent(`/properties/${propertyId}/change-tenant`))}
                      >
                        Créer un nouveau locataire
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Détails du bail</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="leaseStart">Date de début</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="leaseStart"
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !leaseStart && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {leaseStart ? format(leaseStart, 'P', { locale: fr }) : <span>Choisir une date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={leaseStart}
                              onSelect={(date: Date | undefined) => date && setLeaseStart(date)}
                              initialFocus
                              locale={fr}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="leaseEnd">Date de fin (optionnel)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="leaseEnd"
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !leaseEnd && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {leaseEnd ? format(leaseEnd, 'P', { locale: fr }) : <span>Choisir une date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={leaseEnd}
                              onSelect={setLeaseEnd}
                              initialFocus
                              locale={fr}
                              fromDate={leaseStart}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rent">Loyer mensuel (€)</Label>
                        <Input
                          id="rent"
                          type="number"
                          value={rent}
                          onChange={(e) => setRent(Number(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="deposit">Dépôt de garantie (€)</Label>
                        <Input
                          id="deposit"
                          type="number"
                          value={deposit}
                          onChange={(e) => setDeposit(Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>
            </motion.div>

            {/* Boutons d'action */}
            <motion.div 
              className="md:col-span-2 flex justify-end space-x-4"
              variants={itemVariants}
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  variant="outline" 
                  onClick={() => router.push(`/properties/${propertyId}`)}
                >
                  Annuler
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  onClick={handleChangeTenant}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size={16} className="mr-2" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 w-4 mr-2" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Changer le locataire
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
