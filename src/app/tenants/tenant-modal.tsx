'use client'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useEffect, useState } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

interface TenantModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string | null
}

type Property = Database['public']['Tables']['properties']['Row']
type Tenant = Database['public']['Tables']['tenants']['Row']
type Lease = Database['public']['Tables']['leases']['Row']

// Type étendu pour les baux avec les propriétés jointes
type LeaseWithProperty = Lease & {
  properties: Property
}

export function TenantModal({ isOpen, onClose, tenantId }: TenantModalProps) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birth_date: "",
    birth_place: "",
  })
  const [leases, setLeases] = useState<LeaseWithProperty[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // Si on est en mode édition, charger les données du locataire
        if (tenantId) {
          // Récupérer les données du locataire
          const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single()

          if (tenantError) throw tenantError

          // Récupérer les baux associés à ce locataire avec les informations des biens
          const { data: leasesWithProperties, error: leasesError } = await supabase
            .from('leases')
            .select(`
              *,
              properties:property_id (
                id, 
                name, 
                address, 
                status
              )
            `)
            .eq('tenant_id', tenantId)
            .eq('user_id', session.user.id)

          if (leasesError) throw leasesError
          
          setLeases(leasesWithProperties || [])

          // Mettre à jour les données du formulaire avec les informations du locataire
          setFormData({
            first_name: tenant.first_name || "",
            last_name: tenant.last_name || "",
            email: tenant.email || "",
            phone: tenant.phone || "",
            birth_date: tenant.birth_date || "",
            birth_place: tenant.birth_place || "",
          })
        } else {
          // En mode création, initialiser le formulaire avec des valeurs vides
          setFormData({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            birth_date: "",
            birth_place: "",
          })
        }
      } catch (error: any) {
        console.error('Error:', error)
        toast({
          title: "Erreur",
          description: error.message || "Impossible de charger les données",
          variant: "destructive"
        })
        onClose()
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [isOpen, tenantId, supabase, toast, onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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

      // Mise à jour des informations du locataire
      const tenantData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        birth_date: formData.birth_date || null,
        birth_place: formData.birth_place || null,
        user_id: session.user.id
      }

      if (tenantId) {
        // Mode édition - Mettre à jour uniquement les informations du locataire
        const { error: updateError } = await supabase
          .from('tenants')
          .update(tenantData)
          .eq('id', tenantId)
          .eq('user_id', session.user.id)

        if (updateError) throw updateError
      } else {
        // Mode création
        const { error: insertError } = await supabase
          .from('tenants')
          .insert([tenantData])

        if (insertError) throw insertError
      }

      toast({
        title: "Succès",
        description: tenantId ? "Locataire mis à jour avec succès" : "Locataire ajouté avec succès"
      })

      onClose()
      router.refresh()
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 016 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <DialogTitle>{tenantId ? 'Modifier le locataire' : 'Ajouter un locataire'}</DialogTitle>
          </div>
          <DialogDescription>
            {tenantId ? 'Modifiez les informations du locataire' : 'Ajoutez un nouveau locataire'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-md font-medium text-gray-700">Informations personnelles</h4>
            <div className="rounded-md overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-3 py-2 bg-gray-50 w-1/4">
                        <Label htmlFor="first_name" className="text-xs font-medium text-gray-500 uppercase tracking-wider">Prénom</Label>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          id="first_name"
                          value={formData.first_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                          required
                          className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-gray-50 w-1/4">
                        <Label htmlFor="last_name" className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</Label>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          id="last_name"
                          value={formData.last_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                          required
                          className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-gray-50 w-1/4">
                        <Label htmlFor="email" className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</Label>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="email"
                          id="email"
                          placeholder="Adresse email du locataire"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-gray-50 w-1/4">
                        <Label htmlFor="phone" className="text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</Label>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-gray-50 w-1/4">
                        <Label htmlFor="birth_date" className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date de naissance</Label>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          id="birth_date"
                          type="date"
                          value={formData.birth_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                          className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-gray-50 w-1/4">
                        <Label htmlFor="birth_place" className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lieu de naissance</Label>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          id="birth_place"
                          value={formData.birth_place}
                          onChange={(e) => setFormData(prev => ({ ...prev, birth_place: e.target.value }))}
                          className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {tenantId && (
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-700">Biens associés</h4>
              {leases.length > 0 ? (
                <div className="rounded-md overflow-hidden border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '50%' }}>
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span>Bien</span>
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '30%' }}>
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Période</span>
                            </div>
                          </th>
                          <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>
                            <div className="flex items-center space-x-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Loyer</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {leases.map(lease => (
                          <tr key={lease.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="text-sm font-medium text-gray-900">{lease.properties.name}</div>
                              <div className="text-xs text-gray-500">{lease.properties.address}</div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-xs text-gray-900">
                                Du {new Date(lease.lease_start).toLocaleDateString('fr-FR')}
                                {lease.lease_end ? 
                                  <div>au {new Date(lease.lease_end).toLocaleDateString('fr-FR')}</div> : 
                                  <div className="text-blue-600">(Sans fin)</div>}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-sm font-medium text-gray-900">
                                {lease.rent ? `${lease.rent.toLocaleString('fr-FR')} €` : '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-500 italic">Aucun bien associé à ce locataire</p>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1 italic">
                Pour associer un bien à ce locataire, veuillez utiliser la section "Biens".
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose} 
                disabled={isLoading}
                className="flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="flex items-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {tenantId ? "Modification..." : "Création..."}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {tenantId ? "Modifier" : "Créer"}
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
