'use client'

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'

interface DeleteModalProps {
  isOpen: boolean
  onClose: () => void
  tenantId: string | null
  onSuccess: () => void
}

export function DeleteModal({ isOpen, onClose, tenantId, onSuccess }: DeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast({
          title: "Session expirée",
          description: "Veuillez vous reconnecter",
          variant: "destructive"
        })
        return
      }

      // 1. D'abord, récupérer les baux associés au locataire
      const { data: leases, error: leasesError } = await supabase
        .from('leases')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('user_id', session.user.id)

      if (leasesError) throw leasesError

      // 2. Supprimer tous les baux associés au locataire
      if (leases && leases.length > 0) {
        // Mettre à jour le statut des propriétés associées à 'vacant'
        for (const lease of leases) {
          const { error: updatePropertyError } = await supabase
            .from('properties')
            .update({ status: 'vacant' })
            .eq('id', lease.property_id)
            .eq('user_id', session.user.id)

          if (updatePropertyError) throw updatePropertyError
        }

        // Supprimer les baux
        const { error: deleteLeaseError } = await supabase
          .from('leases')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('user_id', session.user.id)

        if (deleteLeaseError) throw deleteLeaseError
      }

      // 3. Enfin, supprimer le locataire
      const { error: deleteTenantError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId)
        .eq('user_id', session.user.id)

      if (deleteTenantError) throw deleteTenantError

      toast({
        title: "Succès",
        description: "Locataire supprimé avec succès"
      })

      onClose()
      onSuccess()
    } catch (error: any) {
      console.error('Error:', error)
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la suppression",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </div>
          <DialogDescription>
            Êtes-vous sûr de vouloir supprimer ce locataire ? Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
            <Button 
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
              variant="destructive" 
              onClick={handleDelete}
              disabled={isLoading}
              className="flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Suppression...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
