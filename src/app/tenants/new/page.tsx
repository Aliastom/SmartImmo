'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import LeaseDurationField from './LeaseDurationField'

type Property = Database['public']['Tables']['properties']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']
type Lease = Database['public']['Tables']['leases']['Row']

export default function NewTenantPage() {
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [isSelectHovered, setIsSelectHovered] = useState<string | null>(null);
  const [isCancelHovered, setIsCancelHovered] = useState(false);
  const router = useRouter()
  const searchParams = useSearchParams()
  const propertyId = searchParams.get('propertyId')
  const changeMode = searchParams.get('change') === 'true'
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const [property, setProperty] = useState<Property | null>(null)
  const [currentLease, setCurrentLease] = useState<Lease | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [existingTenants, setExistingTenants] = useState<Tenant[]>([])
  const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lease_start: new Date().toISOString().split('T')[0],
    lease_end: ''
  })

  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        router.push('/properties')
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Charger le bien
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', propertyId)
          .eq('user_id', session.user.id)
          .single()

        if (error) throw error
        setProperty(data)

        // Vérifier si le bien est déjà loué
        if (data.status === 'rented') {
          // Vérifier s'il y a déjà un bail pour ce bien
          const { data: leaseData, error: leaseError } = await supabase
            .from('leases')
            .select('*')
            .eq('property_id', propertyId)
            .eq('user_id', session.user.id)
            .single()

          if (!leaseError) {
            setCurrentLease(leaseData)
            
            // Si on n'est pas en mode changement, rediriger vers la page du bien
            if (!changeMode) {
              toast({
                title: "Information",
                description: "Ce bien est déjà loué. Vous pouvez modifier ou supprimer le bail existant.",
              })
              router.push('/properties/' + propertyId)
              return
            }
          }
        }

        // Charger les locataires existants
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .eq('user_id', session.user.id)
          .order('last_name', { ascending: true })

        if (tenantsError) throw tenantsError
        setExistingTenants(tenantsData || [])
      } catch (error: any) {
        console.error('Error:', error)
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les données",
          variant: "destructive"
        })
        router.push('/properties')
      }
    }

    fetchProperty()
  }, [propertyId, changeMode, router, supabase, toast])

  useEffect(() => {
    if (property && (property.rent === null || property.rent === undefined || Number(property.rent) <= 0)) {
      toast({
        title: "Erreur",
        description: "Ce bien n'a pas de loyer défini. Merci de renseigner un loyer dans la fiche du bien avant d'ajouter un locataire.",
        variant: "destructive"
      })
    }
  }, [property, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Blocage côté JS si le loyer du bien est invalide
    if (property && (property.rent === null || property.rent === undefined || Number(property.rent) <= 0)) {
      toast({
        title: "Erreur",
        description: "Ce bien n'a pas de loyer défini. Merci de renseigner un loyer dans la fiche du bien avant d'ajouter un locataire.",
        variant: "destructive"
      })
      return
    }
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        })
        return
      }

      // Créer le locataire
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert([{
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          user_id: session.user.id
        }])
        .select()

      if (tenantError) throw tenantError

      const newTenantId = tenantData[0].id

      // Si on est en mode changement et qu'il y a un bail existant, le supprimer d'abord
      if (changeMode && currentLease) {
        const { error: deleteLeaseError } = await supabase
          .from('leases')
          .delete()
          .eq('id', currentLease.id)
          .eq('user_id', session.user.id)

        if (deleteLeaseError) throw deleteLeaseError
      }

      // Créer le bail
      const { error: leaseError } = await supabase
        .from('leases')
        .insert([{
          tenant_id: newTenantId,
          property_id: propertyId!,
          lease_start: formData.lease_start,
          lease_end: formData.lease_end || null,
          rent: property!.rent,
          user_id: session.user.id
        }])

      if (leaseError) throw leaseError

      // Mettre à jour le statut du bien
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ status: 'rented' })
        .eq('id', propertyId!)
        .eq('user_id', session.user.id)

      if (propertyError) throw propertyError

      toast({
        title: "Succès",
        description: changeMode ? "Le locataire a été changé avec succès" : "Le locataire a été ajouté avec succès"
      })

      // Utiliser window.location.href au lieu de router.push pour forcer une navigation complète
      window.location.href = '/properties/' + propertyId
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectTenant = async (tenant: Tenant) => {
    setIsLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        })
        return
      }

      // Vérifier si le locataire a déjà un bail pour ce bien
      const { data: existingLease, error: existingLeaseError } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('property_id', propertyId!)
        .eq('user_id', session.user.id)
        .single()

      if (!existingLeaseError) {
        toast({
          title: "Information",
          description: "Ce locataire a déjà un bail pour ce bien.",
          variant: "destructive"
        })
        return
      }

      // Si on est en mode changement et qu'il y a un bail existant, le supprimer d'abord
      if (changeMode && currentLease) {
        const { error: deleteLeaseError } = await supabase
          .from('leases')
          .delete()
          .eq('id', currentLease.id)
          .eq('user_id', session.user.id)

        if (deleteLeaseError) throw deleteLeaseError
      }

      // Créer le bail
      const { error: leaseError } = await supabase
        .from('leases')
        .insert([{
          tenant_id: tenant.id,
          property_id: propertyId!,
          lease_start: formData.lease_start,
          lease_end: formData.lease_end || null,
          rent: property!.rent,
          user_id: session.user.id
        }])

      if (leaseError) throw leaseError

      // Mettre à jour le statut du bien
      const { error: propertyError } = await supabase
        .from('properties')
        .update({ status: 'rented' })
        .eq('id', propertyId!)
        .eq('user_id', session.user.id)

      if (propertyError) throw propertyError

      toast({
        title: "Succès",
        description: changeMode ? "Le locataire a été changé avec succès" : "Le locataire a été assigné avec succès"
      })

      // Utiliser window.location.href au lieu de router.push pour forcer une navigation complète
      window.location.href = '/properties/' + propertyId
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!property) {
    return <div className="container py-8 text-center">Chargement...</div>
  }

  const isRentInvalid = !property || property.rent === null || property.rent === undefined || Number(property.rent) <= 0;

  return (
    <div className="container py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{changeMode ? 'Changer de locataire' : 'Ajouter un locataire'}</h1>
          <p className="text-gray-500">Bien: {property.name}</p>
        </div>
        <div className="space-x-2">
          
         
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau locataire</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Adresse email du locataire"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lease_start">Début du bail</Label>
                  <Input
                    id="lease_start"
                    type="date"
                    value={formData.lease_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, lease_start: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lease_end">Fin du bail (optionnel)</Label>
                  <Input
                    id="lease_end"
                    type="date"
                    value={formData.lease_end}
                    onChange={(e) => setFormData(prev => ({ ...prev, lease_end: e.target.value }))}
                  />
                </div>
                <LeaseDurationField
                  leaseStart={formData.lease_start}
                  leaseEnd={formData.lease_end}
                  onLeaseEndChange={(date) => setFormData(prev => ({ ...prev, lease_end: date }))}
                  onLeaseDurationChange={() => {}}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
<div className="flex flex-row gap-3 w-full justify-end pt-4">
  {/* Annuler Button */}
  <Button
    type="button"
    variant="outline"
    className="relative flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-gray-300 bg-white text-gray-700 font-semibold shadow group overflow-hidden hover:bg-gray-50 transition"
    style={{ minWidth: 'fit-content' }}
    onClick={() => {
      // If in a modal/dialog context, close dialog. Otherwise, go back in history.
      if (window.history.length > 1) {
        router.back();
      } else {
        window.location.href = '/properties';
      }
    }}
    onMouseEnter={() => setIsCancelHovered(true)}
    onMouseLeave={() => setIsCancelHovered(false)}
  >
    <motion.span
      className="inline-flex items-center"
      animate={isCancelHovered ? 'dance' : 'idle'}
      variants={{
        dance: {
          x: [0, -6, 3, -4, 0],
          rotate: [0, -18, 12, -10, 0],
          transition: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 1.1,
            ease: 'easeInOut',
          },
        },
        idle: {},
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
    </motion.span>
    Annuler
  </Button>

  {/* Sélectionner un locataire existant Button */}
  <Button
    type="button"
    className="btn-glass btn-animated-yellow flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base font-semibold"
    style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
    onClick={() => setIsTenantDialogOpen(true)}
    onMouseEnter={() => setIsSelectHovered('main')}
    onMouseLeave={() => setIsSelectHovered(null)}
  >
    <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
    <span className="relative flex items-center z-10 font-semibold">
      <motion.span
        className="inline-flex items-center"
        animate={isSelectHovered === 'main' ? 'dance' : 'idle'}
        variants={{
          dance: {
            rotate: [0, -20, 20, -20, 20, 0],
            scale: [1, 1.2, 1.1, 1.2, 1],
            transition: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 1.2,
              ease: 'easeInOut',
            },
          },
          idle: {},
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </motion.span>
      Sélectionner un locataire existant
    </span>
  </Button>

  {/* Ajouter/Changer Button (submit) */}
  <Button
    type="submit"
    disabled={isLoading || isRentInvalid}
    className="btn-glass btn-animated-yellow flex items-center gap-2 px-4 py-2 rounded-lg shadow transition relative group text-base"
    style={{ minWidth: 'fit-content', maxWidth: '320px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
    onMouseEnter={() => setIsButtonHovered(true)}
    onMouseLeave={() => setIsButtonHovered(false)}
  >
    <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
    <span className="relative flex items-center z-10 font-semibold">
      <motion.span
        className="inline-flex items-center"
        animate={isButtonHovered ? 'dance' : 'idle'}
        variants={{
          dance: {
            rotate: [0, -20, 20, -20, 20, 0],
            scale: [1, 1.2, 1.1, 1.2, 1],
            transition: {
              repeat: Infinity,
              repeatType: 'loop',
              duration: 1.2,
              ease: 'easeInOut',
            },
          },
          idle: {},
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </motion.span>
      {isLoading ? 'Traitement en cours...' : (changeMode ? 'Changer le locataire' : 'Ajouter le locataire')}
    </span>
  </Button>
</div>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isTenantDialogOpen} onOpenChange={setIsTenantDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sélectionner un locataire existant</DialogTitle>
            <DialogDescription>
              Choisissez un locataire dans la liste ci-dessous ou ajoutez-en un nouveau.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-hidden">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal_lease_start" className="text-xs uppercase text-gray-500 font-medium">Début du bail</Label>
                <Input
                  id="modal_lease_start"
                  type="date"
                  value={formData.lease_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, lease_start: e.target.value }))}
                  required
                  className="border-0 focus-visible:ring-0 p-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal_lease_end" className="text-xs uppercase text-gray-500 font-medium">Fin du bail (optionnel)</Label>
                <Input
                  id="modal_lease_end"
                  type="date"
                  value={formData.lease_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, lease_end: e.target.value }))}
                  className="border-0 focus-visible:ring-0 p-0"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {existingTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.first_name} {tenant.last_name}</TableCell>
                      <TableCell className="text-right">
                        <Button
  size="sm"
  onClick={() => handleSelectTenant(tenant)}
  disabled={isLoading}
  className="btn-glass btn-animated-yellow flex items-center gap-2 px-3 py-1.5 rounded-lg shadow transition relative group text-sm"
  style={{ minWidth: 'fit-content', maxWidth: '220px', overflow: 'hidden', position: 'relative', whiteSpace: 'nowrap' }}
  onMouseEnter={() => setIsSelectHovered && setIsSelectHovered(tenant.id)}
  onMouseLeave={() => setIsSelectHovered && setIsSelectHovered(null)}
>
  <span className="btn-animated-yellow-bg absolute inset-0 rounded-lg pointer-events-none transition-transform duration-300 group-hover:scale-100 scale-0 z-0" aria-hidden="true"></span>
  <span className="relative flex items-center z-10 font-semibold">
    <motion.span
      className="inline-flex items-center"
      animate={isSelectHovered === tenant.id ? "dance" : "idle"}
      variants={{
        dance: {
          rotate: [0, -20, 20, -20, 20, 0],
          scale: [1, 1.2, 1.1, 1.2, 1],
          transition: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: 1.2,
            ease: 'easeInOut',
          },
        },
        idle: {},
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    </motion.span>
    Sélectionner
  </span>
</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {existingTenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center">
                        Aucun locataire existant
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
