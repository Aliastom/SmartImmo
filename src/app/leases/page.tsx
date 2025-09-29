'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from "@/components/ui/use-toast"
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PlusCircle } from 'lucide-react'
import { LeaseList } from './components/LeaseList'
import { LeaseModal } from './components/lease-modal'

export default function LeasesPage() {
  const [leases, setLeases] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leaseToDelete, setLeaseToDelete] = useState<string | null>(null)
  const [leaseToEdit, setLeaseToEdit] = useState<any | null>(null)
  const supabase = createClientComponentClient<Database>()
  const { toast } = useToast()

  const fetchLeases = useCallback(async () => {
    setIsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast({ title: 'Non authentifié', description: 'Veuillez vous connecter.', variant: 'destructive' })
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('leases')
      .select(`
        id, lease_start, lease_end, rent, charges_provision, security_deposit, signature_place,
        property:properties!inner(name, address, property_type, furnishing, area),
        tenant:tenants!inner(first_name, last_name, email, birth_date, birth_place)
      `)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error fetching leases:', error)
      toast({ title: 'Erreur', description: 'Impossible de charger les baux.', variant: 'destructive' })
    } else {
      setLeases(data || [])
    }
    setIsLoading(false)
  }, [supabase, toast])

  useEffect(() => {
    fetchLeases()
  }, [fetchLeases])

  const handleLeaseAdded = () => {
    fetchLeases() // Rafraîchir la liste
    setIsModalOpen(false) // Fermer la modale
    setLeaseToEdit(null) // Réinitialiser le bail à modifier
  }

  const handleOpenEditModal = (lease: any) => {
    setLeaseToEdit(lease);
    setIsModalOpen(true);
  }

  const handleDeleteLease = async () => {
    if (!leaseToDelete) return;

    const { error } = await supabase.from('leases').delete().eq('id', leaseToDelete);

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le bail.', variant: 'destructive' });
    } else {
      toast({ title: 'Succès', description: 'Le bail a été supprimé.' });
      fetchLeases(); // Rafraîchir la liste
    }
    setLeaseToDelete(null); // Fermer la boîte de dialogue
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Gestion des Baux"
        buttonText="Ajouter un bail"
        onButtonClick={() => setIsModalOpen(true)}
      />

      <div className="mt-8">
        <LeaseList 
          leases={leases} 
          isLoading={isLoading} 
          onEdit={handleOpenEditModal}
          onDelete={(leaseId) => setLeaseToDelete(leaseId)}
        />
      </div>

      <LeaseModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setLeaseToEdit(null); }}
        onLeaseAdded={handleLeaseAdded}
        leaseToEdit={leaseToEdit}
      />

      <AlertDialog open={!!leaseToDelete} onOpenChange={() => setLeaseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bail sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLeaseToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLease}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
