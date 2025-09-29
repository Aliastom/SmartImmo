'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
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
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  MoreVertical, 
  FileText, 
  RefreshCw, 
  Trash2, 
  Download, 
  Mail, 
  FileSignature,
  Loader2
} from 'lucide-react'
import { LeaseUpload } from './LeaseUpload'
import { LeaseRenewal } from './LeaseRenewal'
import { leaseStorage } from '@/lib/storage'

export function LeaseActions({ 
  lease,
  onUpdate,
  className = ''
}: { 
  lease: {
    id: string
    property_id: string
    property_name: string
    tenant_id: string
    tenant_name: string
    lease_start: string
    lease_end: string
    rent: number
    charges_provision: number
    security_deposit: number
    signature_place: string
    document_url: string | null
  },
  onUpdate?: () => void
  className?: string
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [showRenewDialog, setShowRenewDialog] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const handleDownload = async () => {
    if (!lease.document_url) {
      toast({
        title: 'Document non disponible',
        description: 'Aucun document n\'est associé à ce bail',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsLoading(true)
      
      // Télécharger le fichier depuis l'URL
      const response = await fetch(lease.document_url)
      if (!response.ok) throw new Error('Impossible de télécharger le document')
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bail-${lease.id}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: 'Téléchargement réussi',
        description: 'Le document a été téléchargé avec succès',
      })
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du téléchargement du document',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsLoading(true)
      
      // Supprimer le document du stockage s'il existe
      if (lease.document_url) {
        const path = lease.document_url.split('/').pop()
        if (path) {
          await leaseStorage.deleteFile(path)
        }
      }
      
      // Supprimer le bail de la base de données
      const { error } = await supabase
        .from('leases')
        .delete()
        .eq('id', lease.id)

      if (error) throw error

      toast({
        title: 'Succès',
        description: 'Le bail a été supprimé avec succès',
      })

      // Rafraîchir les données
      if (onUpdate) onUpdate()
      router.refresh()
    } catch (error) {
      console.error('Erreur lors de la suppression du bail:', error)
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression du bail',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleUploadSuccess = () => {
    setShowUploadDialog(false)
    if (onUpdate) onUpdate()
    router.refresh()
  }

  const handleRenewSuccess = () => {
    setShowRenewDialog(false)
    if (onUpdate) onUpdate()
    router.refresh()
  }

  const isExpired = lease.lease_end && new Date(lease.lease_end) < new Date()
  const isActive = !isExpired && (!lease.lease_end || new Date(lease.lease_end) > new Date())

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={className}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
            <span className="sr-only">Actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            <span>Télécharger</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowUploadDialog(true)}>
            <FileSignature className="mr-2 h-4 w-4" />
            <span>Ajouter le document signé</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setShowRenewDialog(true)}
            disabled={isExpired}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            <span>Renouveler le bail</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Supprimer</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialogue de suppression */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce bail ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données associées à ce bail seront définitivement supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogue d'upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter le bail signé</DialogTitle>
          </DialogHeader>
          <LeaseUpload 
            leaseId={lease.id}
            propertyId={lease.property_id}
            tenantId={lease.tenant_id}
            onSuccess={handleUploadSuccess}
            onCancel={() => setShowUploadDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Dialogue de renouvellement */}
      <Dialog open={showRenewDialog} onOpenChange={setShowRenewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <LeaseRenewal 
            lease={{
              ...lease,
              property_name: lease.property_name || 'Propriété sans nom',
              tenant_name: lease.tenant_name || 'Locataire inconnu'
            }}
            onSuccess={handleRenewSuccess}
            onCancel={() => setShowRenewDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
