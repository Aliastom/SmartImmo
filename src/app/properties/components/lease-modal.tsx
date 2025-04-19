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
import { AnimatedCard, LoadingSpinner } from '@/components/ui/animated'

interface LeaseModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  tenantId: string
  lease: any
  onLeaseUpdated?: () => void
}

type Lease = Database['public']['Tables']['leases']['Row']

export function LeaseModal({ isOpen, onClose, propertyId, tenantId, lease, onLeaseUpdated }: LeaseModalProps) {
  const [formData, setFormData] = useState({
    lease_start: new Date().toISOString().split('T')[0],
    lease_end: "",
    rent: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    if (lease) {
      setFormData({
        lease_start: lease.lease_start,
        lease_end: lease.lease_end || "",
        rent: lease.rent
      })
    }
  }, [lease])

  // Préremplir le loyer du bien lors de l'ouverture du modal (création)
  useEffect(() => {
    if (isOpen && propertyId && !lease) {
      (async () => {
        const { data: property, error } = await supabase
          .from('properties')
          .select('rent')
          .eq('id', propertyId)
          .single();
        if (!error && property && property.rent && Number(property.rent) > 0) {
          setFormData(prev => ({ ...prev, rent: property.rent }));
        } else if (!error && property && (!property.rent || Number(property.rent) <= 0)) {
          toast({
            title: "Erreur",
            description: "Ce bien n'a pas de loyer défini. Merci de renseigner un loyer dans la fiche du bien avant d'ajouter un locataire.",
            variant: "destructive"
          });
          setFormData(prev => ({ ...prev, rent: 0 }));
        }
      })();
    }
  }, [isOpen, propertyId, lease]);

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

      // Ajout : validation du loyer
      if (!formData.rent || isNaN(Number(formData.rent)) || Number(formData.rent) <= 0) {
        toast({
          title: "Erreur",
          description: "Le montant du loyer doit être renseigné et strictement supérieur à 0.",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      if (lease) {
        // Mode édition
        const { error: updateError } = await supabase
          .from('leases')
          .update({
            lease_start: formData.lease_start,
            lease_end: formData.lease_end || null,
            rent: formData.rent
          })
          .eq('id', lease.id)
          .eq('user_id', session.user.id)

        if (updateError) throw updateError
      } else {
        // Mode création - ne devrait pas arriver ici normalement
        toast({
          title: "Erreur",
          description: "Aucun bail trouvé pour ce bien",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      toast({
        title: "Succès",
        description: "Bail mis à jour avec succès"
      })

      onClose()
      
      if (onLeaseUpdated) {
        onLeaseUpdated()
      }
      
      // Rafraîchir la page pour voir les modifications
      window.location.reload()
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <DialogTitle>Modifier le bail</DialogTitle>
          </div>
          <DialogDescription>
            Modifiez les informations du bail pour le locataire {tenantId}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase w-1/3">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Loyer (€/mois)</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      id="rent"
                      type="number"
                      value={formData.rent}
                      onChange={(e) => setFormData(prev => ({ ...prev, rent: parseFloat(e.target.value) }))}
                      required
                      className="border-0 shadow-none focus-visible:ring-0 h-10"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Début du bail</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      id="lease_start"
                      type="date"
                      value={formData.lease_start}
                      onChange={(e) => setFormData(prev => ({ ...prev, lease_start: e.target.value }))}
                      required
                      className="border-0 shadow-none focus-visible:ring-0 h-10"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="bg-gray-50 p-3 text-sm font-medium text-gray-500 uppercase">
                    <div className="flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Fin du bail (optionnel)</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Input
                      id="lease_end"
                      type="date"
                      value={formData.lease_end}
                      onChange={(e) => setFormData(prev => ({ ...prev, lease_end: e.target.value }))}
                      className="border-0 shadow-none focus-visible:ring-0 h-10"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end space-x-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Annuler
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                type="submit"
                disabled={isLoading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size={16} className="mr-2" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enregistrer
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
