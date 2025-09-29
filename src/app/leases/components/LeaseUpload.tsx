'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/database'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Upload, FileText, X } from 'lucide-react'
import { leaseStorage } from '@/lib/storage'

interface LeaseUploadProps {
  leaseId: string
  propertyId: string
  tenantId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function LeaseUpload({ 
  leaseId, 
  propertyId, 
  tenantId, 
  onSuccess,
  onCancel 
}: LeaseUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setFileName(selectedFile.name)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile)
      setFileName(droppedFile.name)
    } else {
      toast({
        title: 'Format non supporté',
        description: 'Veuillez télécharger un fichier PDF',
        variant: 'destructive'
      })
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    setFileName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!file) {
      toast({
        title: 'Aucun fichier sélectionné',
        description: 'Veuillez sélectionner un fichier à téléverser',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)

    try {
      // 1. Upload du fichier dans le stockage
      const { path, url } = await leaseStorage.uploadFile(
        file,
        `${propertyId}/${tenantId}/${leaseId}_signed`,
        {
          leaseId,
          propertyId,
          tenantId,
          uploadedAt: new Date().toISOString(),
          type: 'signed_lease'
        }
      )

      // 2. Mise à jour du bail avec l'URL du document
      const { error: updateError } = await supabase
        .from('leases')
        .update({ 
          document_url: url,
          updated_at: new Date().toISOString()
        })
        .eq('id', leaseId)

      if (updateError) throw updateError

      // 3. Créer une entrée dans la table documents
      const { error: docError } = await supabase
        .from('documents')
        .insert([{
          user_id: (await supabase.auth.getSession()).data.session?.user.id!,
          property_id: propertyId,
          tenant_id: tenantId,
          name: `Bail signé - ${new Date().toLocaleDateString()}`,
          file_path: path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_at: new Date().toISOString(),
          metadata: {
            type: 'lease',
            lease_id: leaseId,
            signed: true
          }
        }])

      if (docError) throw docError

      toast({
        title: 'Succès',
        description: 'Le bail signé a été téléversé avec succès',
      })

      // Rafraîchir les données
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error) {
      console.error('Erreur lors du téléversement du bail:', error)
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du téléversement du fichier',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Téléverser le bail signé</h3>
        <p className="text-sm text-muted-foreground">
          Téléversez le bail signé par le locataire au format PDF
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="lease-document">Document du bail signé</Label>
          
          {!file ? (
            <div 
              className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 text-muted-foreground mb-3" />
              <div className="text-center">
                <p className="font-medium">
                  Glissez-déposez votre fichier ici ou cliquez pour sélectionner
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Format accepté : .pdf (taille max : 10MB)
                </p>
              </div>
              <Input
                id="lease-document"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => document.getElementById('lease-document')?.click()}
              >
                Sélectionner un fichier
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-md">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Supprimer le fichier</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isUploading}
            >
              Annuler
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={!file || isUploading}
          >
            {isUploading && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isUploading ? 'Téléversement...' : 'Téléverser le bail'}
          </Button>
        </div>
      </form>
    </div>
  )
}
